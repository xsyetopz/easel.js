import {
  AnimationBlend,
  type AnimationBlendMode,
  type AnimationClip,
} from "./AnimationClip.ts";

/** Loop policies applied when an action reaches a clip boundary. */
export const Loop = {
  Once: 2200,
  Repeat: 2201,
  PingPong: 2202,
} as const;

/** Union of the supported action loop policy identifiers. */
export type LoopMode = (typeof Loop)[keyof typeof Loop];

interface Transition {
  from: number;
  to: number;
  duration: number;
  elapsed: number;
}

interface AnimationActionLifecycle {
  activate(action: AnimationAction): void;
  deactivate(action: AnimationAction): void;
}

/** Playback state for one animation clip bound to an object root. */
export class AnimationAction {
  readonly #clip: AnimationClip;
  readonly #localRoot: object | undefined;
  #enabled: boolean = true;
  #weight: number = 1;
  #timeScale: number = 1;
  #repetitionCount = 0;
  #startTime: number | undefined;
  #fade: Transition | undefined;
  #warp: Transition | undefined;
  readonly #lifecycle: AnimationActionLifecycle | undefined;
  #active = false;
  #blendMode: AnimationBlendMode;

  /** Current clip position in seconds; callers may seek by assigning this value. */
  time = 0;
  /** Loop policy applied after each playback advance. */
  loop: LoopMode = Loop.Repeat;
  /** Maximum number of completed loop crossings; `Infinity` repeats indefinitely. */
  repetitions = Number.POSITIVE_INFINITY;
  /** Keeps the terminal keyframe when a finite loop completes instead of deactivating. */
  clampWhenFinished: boolean = false;
  /** Pauses advancement while preserving the current time and enabled state. */
  paused: boolean = false;

  /** Creates playback state for a clip and an optional local binding root. */
  constructor(
    clip: AnimationClip,
    localRoot: object | undefined = void 0,
    lifecycle: AnimationActionLifecycle | undefined = void 0,
  ) {
    this.#clip = clip;
    this.#localRoot = localRoot;
    this.#lifecycle = lifecycle;
    this.#blendMode = clip.blendMode;
  }

  /** Clip sampled by this action. */
  get clip(): AnimationClip {
    return this.#clip;
  }

  /** Optional object used as the binding root instead of the animator root. */
  get localRoot(): object | undefined {
    return this.#localRoot;
  }

  /** Blend operation used when this action contributes track values. */
  get blendMode(): AnimationBlendMode {
    return this.#blendMode;
  }

  /** Stores the normal or additive blend mode used by this action. */
  set blendMode(value: AnimationBlendMode) {
    if (value !== AnimationBlend.Normal && value !== AnimationBlend.Additive) {
      throw new RangeError("invalid animation blend mode");
    }
    this.#blendMode = value;
  }

  /** Whether this action has been explicitly activated for playback. */
  get active(): boolean {
    return this.#active;
  }

  /** Whether the action may advance and contribute values. */
  get enabled(): boolean {
    return this.#enabled;
  }

  /** Enables or disables contribution; disabling also removes the action from active playback. */
  set enabled(value: boolean) {
    this.#enabled = value;
    if (!value) this.#deactivate();
  }

  /** Base contribution weight; values must be finite and non-negative. */
  get weight(): number {
    return this.#weight;
  }

  /** Stores a finite, non-negative base contribution weight. */
  set weight(value: number) {
    this.#weight = this.#nonNegative(value, "weight");
  }

  /** Contribution weight after the enabled flag is applied. */
  get effectiveWeight(): number {
    return this.#enabled ? this.#weight : 0;
  }

  /** Playback speed multiplier; negative values play the clip backwards. */
  get timeScale(): number {
    return this.#timeScale;
  }

  /** Stores a finite playback speed multiplier. */
  set timeScale(value: number) {
    if (!Number.isFinite(value))
      throw new RangeError("timeScale must be finite");
    this.#timeScale = value;
  }

  /** Playback speed after pausing is applied; paused actions report zero. */
  get effectiveTimeScale(): number {
    return this.paused ? 0 : this.#timeScale;
  }

  /** Effective playback duration in seconds, derived from clip duration and time scale. */
  get duration(): number {
    return this.#timeScale === 0
      ? Number.POSITIVE_INFINITY
      : Math.abs(this.#clip.duration / this.#timeScale);
  }

  /** Changes playback speed so the clip spans the requested positive duration in seconds. */
  set duration(value: number) {
    const duration = this.#positive(value, "duration");
    this.timeScale = this.#clip.duration / duration;
    this.cancelWarp();
  }

  /** Whether this action is active, enabled, unpaused, and not waiting for a schedule. */
  get running(): boolean {
    return (
      this.#active &&
      this.#enabled &&
      !this.paused &&
      this.#timeScale !== 0 &&
      !this.scheduled
    );
  }

  /** Whether playback is waiting for its scheduled start time. */
  get scheduled(): boolean {
    return this.#startTime !== undefined;
  }

  /** Enables and activates this action, then returns it for chaining. */
  play(): this {
    this.#enabled = true;
    if (!this.#active) {
      this.#active = true;
      this.#lifecycle?.activate(this);
    }
    return this;
  }

  /** Disables, deactivates, and resets this action, then returns it for chaining. */
  stop(): this {
    this.#enabled = false;
    this.#deactivate();
    return this.reset(false);
  }

  /** Returns time and transition state to the start; `enable` controls future playback. */
  reset(enable = true): this {
    this.time = 0;
    this.paused = false;
    this.#enabled = enable;
    this.#repetitionCount = 0;
    this.#startTime = undefined;
    return this.cancelFade().cancelWarp();
  }

  /** Defers playback until the non-negative animator timeline time supplied to `advance`. */
  schedule(time: number): this {
    this.#startTime = this.#nonNegative(time, "time");
    return this;
  }

  /** Stores a loop policy and a non-negative integer repetition count, or `Infinity`. */
  setLoop(mode: LoopMode, repetitions: number): this {
    if (mode !== Loop.Once && mode !== Loop.Repeat && mode !== Loop.PingPong)
      throw new RangeError("invalid loop mode");
    if (
      !(Number.isInteger(repetitions) && repetitions >= 0) &&
      repetitions !== Number.POSITIVE_INFINITY
    ) {
      throw new RangeError(
        "repetitions must be a non-negative integer or Infinity",
      );
    }
    this.loop = mode;
    this.repetitions = repetitions;
    return this;
  }

  /** Interpolates weight from zero to one over the positive duration in seconds. */
  fadeIn(duration: number): this {
    return this.#beginFade(0, 1, duration);
  }

  /** Interpolates weight from one to zero over the positive duration in seconds. */
  fadeOut(duration: number): this {
    return this.#beginFade(1, 0, duration);
  }

  /** Fades this action in while fading `fadeOutAction` out over the same duration. */
  crossFadeFrom(
    fadeOutAction: AnimationAction,
    duration: number,
    warp = false,
  ): this {
    fadeOutAction.fadeOut(duration);
    this.fadeIn(duration);
    if (warp) {
      const inDuration = this.#clip.duration;
      const outDuration = fadeOutAction.#clip.duration;
      fadeOutAction.warp(1, outDuration / inDuration, duration);
      this.warp(inDuration / outDuration, 1, duration);
    }
    return this;
  }

  /** Fades this action out while starting `fadeInAction`; optionally warps both speeds. */
  crossFadeTo(
    fadeInAction: AnimationAction,
    duration: number,
    warp = false,
  ): AnimationAction {
    return fadeInAction.crossFadeFrom(this, duration, warp);
  }

  /** Removes the pending weight transition without changing the current weight. */
  cancelFade(): this {
    this.#fade = undefined;
    return this;
  }

  /** Interpolates playback speed between two finite values over a positive duration in seconds. */
  warp(startTimeScale: number, endTimeScale: number, duration: number): this {
    if (!(Number.isFinite(startTimeScale) && Number.isFinite(endTimeScale))) {
      throw new RangeError("warp time scales must be finite");
    }
    this.#warp = {
      from: startTimeScale,
      to: endTimeScale,
      duration: this.#positive(duration, "duration"),
      elapsed: 0,
    };
    this.#timeScale = startTimeScale;
    return this;
  }

  /** Warps the current effective speed to zero over the requested duration. */
  halt(duration: number): this {
    return this.warp(this.effectiveTimeScale, 0, duration);
  }

  /** Removes the pending speed transition without changing the current speed. */
  cancelWarp(): this {
    this.#warp = undefined;
    return this;
  }

  /** Copies time and speed from another action and clears this action’s speed transition. */
  syncWith(action: AnimationAction): this {
    this.time = action.time;
    this.timeScale = action.timeScale;
    return this.cancelWarp();
  }

  /** Advances playback by a delta in seconds; scheduled actions also require timeline time. */
  advance(delta: number, timelineTime: number | undefined = void 0): void {
    if (!Number.isFinite(delta)) throw new RangeError("delta must be finite");
    if (timelineTime !== undefined && !Number.isFinite(timelineTime)) {
      throw new RangeError("timelineTime must be finite");
    }
    const motionDelta = this.#scheduledDelta(delta, timelineTime);
    this.#updateTransitions(Math.abs(delta));
    if (this.paused || !this.#enabled || motionDelta === 0) return;
    this.time += motionDelta * this.#timeScale;
    this.#applyLoop(this.#clip.duration);
  }

  #scheduledDelta(delta: number, timelineTime: number | undefined): number {
    if (this.#startTime === undefined) return delta;
    if (timelineTime === undefined) return 0;
    if (
      (delta >= 0 && timelineTime < this.#startTime) ||
      (delta < 0 && timelineTime > this.#startTime)
    )
      return 0;
    const elapsed = timelineTime - this.#startTime;
    this.#startTime = undefined;
    if (delta >= 0) return Math.min(delta, elapsed);
    return Math.max(delta, elapsed);
  }

  #beginFade(from: number, to: number, duration: number): this {
    this.#fade = {
      from,
      to,
      duration: this.#positive(duration, "duration"),
      elapsed: 0,
    };
    this.#weight = from;
    return this;
  }

  #updateTransitions(delta: number): void {
    if (this.#fade) {
      this.#fade.elapsed = Math.min(
        this.#fade.elapsed + delta,
        this.#fade.duration,
      );
      const t = this.#fade.elapsed / this.#fade.duration;
      this.#weight = this.#fade.from + (this.#fade.to - this.#fade.from) * t;
      if (t === 1) {
        if (this.#fade.to === 0) this.#finish();
        this.#fade = undefined;
      }
    }
    if (this.#warp) {
      this.#warp.elapsed = Math.min(
        this.#warp.elapsed + delta,
        this.#warp.duration,
      );
      const t = this.#warp.elapsed / this.#warp.duration;
      this.#timeScale = this.#warp.from + (this.#warp.to - this.#warp.from) * t;
      if (t === 1) {
        if (this.#timeScale === 0) this.paused = true;
        this.#warp = undefined;
      }
    }
  }

  #applyLoop(duration: number): void {
    if (duration === 0) {
      this.time = 0;
      if (this.loop === Loop.Once || Number.isFinite(this.repetitions)) {
        if (this.clampWhenFinished) this.paused = true;
        else this.#finish();
      }
      return;
    }
    if (this.loop === Loop.Once) {
      if (this.time >= duration || this.time < 0) {
        this.time = this.time >= duration ? duration : 0;
        if (this.clampWhenFinished) this.paused = true;
        else this.#finish();
      }
      return;
    }
    const cycle = Math.floor(this.time / duration);
    const crossings = Math.abs(cycle);
    if (crossings > 0 && Number.isFinite(this.repetitions)) {
      this.#repetitionCount += crossings;
      if (this.#repetitionCount >= this.repetitions) {
        this.time = this.timeScale < 0 ? 0 : duration;
        if (this.clampWhenFinished) this.paused = true;
        else this.#finish();
        return;
      }
    } else if (crossings > 0) {
      this.#repetitionCount += crossings;
    }
    const local = ((this.time % duration) + duration) % duration;
    this.time =
      this.loop === Loop.PingPong && Math.abs(cycle) % 2 === 1
        ? duration - local
        : local;
  }

  #positive(value: number, name: string): number {
    if (!Number.isFinite(value) || value <= 0)
      throw new RangeError(`${name} must be positive and finite`);
    return value;
  }

  #nonNegative(value: number, name: string): number {
    if (!Number.isFinite(value) || value < 0)
      throw new RangeError(`${name} must be non-negative and finite`);
    return value;
  }

  #finish(): void {
    this.#enabled = false;
    this.#deactivate();
  }

  #deactivate(): void {
    if (!this.#active) return;
    this.#active = false;
    this.#lifecycle?.deactivate(this);
  }
}
