import type { AnimationClip } from "./AnimationClip.ts";

/** Loop once and stop. */
export const LoopOnce = 2200;

/** Loop repeatedly. */
export const LoopRepeat = 2201;

/** Loop back and forth (ping-pong). */
export const LoopPingPong = 2202;

/** Playback state for a single AnimationClip on a root Node. */
export class AnimationAction {
	#clip: AnimationClip;
	enabled = true;
	weight = 1;
	timeScale = 1;
	time = 0;
	loop = LoopRepeat;
	repetitions = Number.POSITIVE_INFINITY;
	clampWhenFinished = false;
	paused = false;
	#repetitionCount = 0;
	#localRoot: object | undefined = undefined;
	_fadeTarget: number | undefined = undefined;
	_fadeDuration: number | undefined = undefined;
	_fadeElapsed: number | undefined = undefined;

	constructor(clip: AnimationClip, localRoot: object | undefined = undefined) {
		this.#clip = clip;
		this.#localRoot = localRoot;
	}

	get clip(): AnimationClip {
		return this.#clip;
	}

	get localRoot(): object | undefined {
		return this.#localRoot;
	}

	play(): this {
		this.enabled = true;
		return this;
	}

	stop(): this {
		this.enabled = false;
		this.time = 0;
		this.#repetitionCount = 0;
		return this;
	}

	reset(): this {
		this.time = 0;
		this.enabled = true;
		this.#repetitionCount = 0;
		return this;
	}

	setLoop(mode: number, repetitions: number): this {
		this.loop = mode;
		this.repetitions = repetitions;
		return this;
	}

	setEffectiveWeight(weight: number): this {
		this.weight = weight;
		return this;
	}

	getEffectiveWeight(): number {
		return this.weight;
	}

	/** Schedules weight to animate from 0 to 1 over duration seconds. */
	fadeIn(duration: number): this {
		this.weight = 0;
		this._fadeTarget = 1;
		this._fadeDuration = duration;
		this._fadeElapsed = 0;
		return this;
	}

	/** Schedules weight to animate from 1 to 0 over duration seconds. */
	fadeOut(duration: number): this {
		this.weight = 1;
		this._fadeTarget = 0;
		this._fadeDuration = duration;
		this._fadeElapsed = 0;
		return this;
	}

	/** Fades out another action while this one fades in. */
	crossFadeFrom(
		fadeOutAction: AnimationAction,
		duration: number,
		_warp = false,
	): this {
		fadeOutAction.fadeOut(duration);
		this.fadeIn(duration);
		return this;
	}

	/** Fades out this action while another fades in. */
	crossFadeTo(
		fadeInAction: AnimationAction,
		duration: number,
		_warp = false,
	): this {
		this.fadeOut(duration);
		fadeInAction.fadeIn(duration);
		return this;
	}

	/** Advances time by delta, handling loop modes and fade. */
	#advance(delta: number): void {
		if (this.paused || !this.enabled) return;

		const scaledDelta = delta * this.timeScale;
		const duration = this.#clip.duration;

		this.#updateFade(delta);
		this.time += scaledDelta;

		if (duration <= 0) return;

		this.#applyLoop(duration);
	}

	#updateFade(delta: number): void {
		if (
			this._fadeDuration === undefined ||
			this._fadeElapsed === undefined ||
			this._fadeTarget === undefined
		) {
			return;
		}
		this._fadeElapsed += delta;
		const t = Math.min(this._fadeElapsed / this._fadeDuration, 1);
		this.weight += (this._fadeTarget - this.weight) * t;
		if (t >= 1) {
			this.weight = this._fadeTarget;
			this._fadeDuration = undefined;
			this._fadeElapsed = undefined;
			this._fadeTarget = undefined;
		}
	}

	#applyLoop(duration: number): void {
		if (this.loop === LoopOnce) {
			this.#applyLoopOnce(duration);
		} else if (this.loop === LoopRepeat) {
			this.#applyLoopRepeat(duration);
		} else if (this.loop === LoopPingPong) {
			const period = duration * 2;
			const mod = ((this.time % period) + period) % period;
			this.time = mod > duration ? period - mod : mod;
		}
	}

	#applyLoopOnce(duration: number): void {
		if (this.time >= duration) {
			this.time = this.clampWhenFinished ? duration : 0;
			this.enabled = !this.clampWhenFinished;
		}
	}

	#applyLoopRepeat(duration: number): void {
		if (this.time >= duration) {
			this.#repetitionCount++;
			if (this.#repetitionCount >= this.repetitions) {
				this.time = this.clampWhenFinished ? duration : 0;
				this.enabled = !this.clampWhenFinished;
			} else {
				this.time %= duration;
			}
		}
	}

	/** Called by Animator.update - exposed for internal use. */
	_update(delta: number): void {
		this.#advance(delta);
	}
}
