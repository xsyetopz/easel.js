import { AnimationAction } from "./AnimationAction.ts";
import type { AnimationClip } from "./AnimationClip.ts";
import { AnimationBlend } from "./AnimationClip.ts";
import { AnimationGroup } from "./AnimationGroup.ts";
import { Binding } from "./Binding.ts";
import { PropertyMixer } from "./PropertyMixer.ts";
import type { AnimationTrack } from "./Track.ts";

interface MixerEntry {
  readonly root: object;
  readonly key: string;
  readonly binding: Binding;
  readonly mixer: PropertyMixer;
  references: number;
}

/** Manages actions for one root, advancing active clips and blending bound properties. */
export class Animator {
  readonly #root: object;
  readonly #actions: AnimationAction[] = [];
  readonly #activeActions: AnimationAction[] = [];
  readonly #activeActionSet = new Set<AnimationAction>();
  #bindings: Binding[] = [];
  #mixers: PropertyMixer[] = [];
  #time = 0;
  #timeScale = 1;
  readonly #actionMap = new Map<
    AnimationClip,
    Map<object | undefined, AnimationAction>
  >();
  readonly #actionMixers = new Map<AnimationAction, PropertyMixer[][]>();
  readonly #actionTracks = new Map<AnimationAction, AnimationTrack[]>();
  readonly #entriesByRoot = new Map<object, Map<string, MixerEntry>>();
  readonly #entriesByMixer = new Map<PropertyMixer, MixerEntry>();
  readonly #activeMixers = new Set<PropertyMixer>();
  readonly #previouslyActiveMixers = new Set<PropertyMixer>();
  readonly #actionLifecycle = {
    activate: (action: AnimationAction): void => this.#activateAction(action),
    deactivate: (action: AnimationAction): void =>
      this.#deactivateAction(action),
  };

  /** Creates an animator for the supplied root object. */
  constructor(root: object) {
    this.#root = root;
  }

  /** Object used as the default binding root for clip actions. */
  get root(): object {
    return this.#root;
  }

  /** Accumulated animator timeline in seconds. */
  get time(): number {
    return this.#time;
  }

  /** Multiplier applied to update deltas before actions advance. */
  get timeScale(): number {
    return this.#timeScale;
  }

  /** Stores a finite, non-negative update speed multiplier. */
  set timeScale(value: number) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError("timeScale must be a finite non-negative number");
    }
    this.#timeScale = value;
  }

  /** Returns the existing action for a clip/root pair or creates and caches one. */
  clipAction(
    clip: AnimationClip,
    localRoot: object | undefined = void 0,
  ): AnimationAction {
    let actionsForClip = this.#actionMap.get(clip);
    if (!actionsForClip) {
      actionsForClip = new Map<object | undefined, AnimationAction>();
      this.#actionMap.set(clip, actionsForClip);
    }
    const existing = actionsForClip.get(localRoot);
    if (existing !== undefined) return existing;

    const action = new AnimationAction(clip, localRoot, this.#actionLifecycle, this);
    const mixers = this.#createMixers(action, clip.tracks);
    this.#actions.push(action);
    actionsForClip.set(localRoot, action);

    this.#actionMixers.set(action, mixers);
    this.#actionTracks.set(action, clip.tracks);

    return action;
  }

  /** Returns a cached action for a clip/root pair, or `undefined` when absent. */
  existingAction(
    clip: AnimationClip,
    localRoot: object | undefined = void 0,
  ): AnimationAction | undefined {
    return this.#actionMap.get(clip)?.get(localRoot);
  }

  /** Advances active actions by seconds and applies their blended property values. */
  update(delta: number): this {
    if (!Number.isFinite(delta)) {
      throw new RangeError("delta must be finite");
    }
    const scaledDelta = delta * this.#timeScale;
    this.#time += scaledDelta;
    this.#activeMixers.clear();

    // Iterate backwards because a naturally finished action removes itself by
    // swapping the array's last entry into its slot.
    for (
      let actionIndex = this.#activeActions.length - 1;
      actionIndex >= 0;
      actionIndex--
    ) {
      const action = this.#activeActions[actionIndex];
      action.advance(scaledDelta, this.#time);
      if (!action.enabled) continue;

      const tracks = this.#actionTracks.get(action);
      const mixers = this.#actionMixers.get(action);
      if (!(tracks && mixers)) continue;

      const weight = action.effectiveWeight;
      if (weight === 0) continue;
      for (let i = 0; i < tracks.length; i++) {
        const values = tracks[i].getValueAtTime(action.time);
        for (const mixer of mixers[i]) {
          this.#activeMixers.add(mixer);
          if (action.blendMode === AnimationBlend.Additive) {
            mixer.accumulateAdditive(weight, values as number[]);
          } else {
            mixer.accumulate(0, weight, values);
          }
        }
      }
    }

    for (const mixer of this.#activeMixers) {
      mixer.apply(0);
    }
    for (const mixer of this.#previouslyActiveMixers) {
      if (!this.#activeMixers.has(mixer)) mixer.restoreOriginalState();
    }
    this.#previouslyActiveMixers.clear();
    for (const mixer of this.#activeMixers) {
      this.#previouslyActiveMixers.add(mixer);
    }

    return this;
  }

  /** Resets action time, evaluates the timeline at `time` seconds, and applies the result. */
  seek(time: number): this {
    if (!Number.isFinite(time) || time < 0) {
      throw new RangeError("time must be a finite non-negative number");
    }
    this.#time = 0;
    for (const action of this.#actions) action.reset(action.enabled);
    return this.update(time);
  }

  /** Stops every active action and returns this animator for chaining. */
  stopAll(): this {
    while (this.#activeActions.length > 0) this.#activeActions.at(-1)?.stop();
    return this;
  }

  /** Stores the accumulated animator timeline in seconds. */
  set time(value: number) {
    if (!Number.isFinite(value)) {
      throw new RangeError("time must be finite");
    }
    this.#time = value;
  }

  /** Stops every active action (three.js-compatible alias for `stopAll`). */
  stopAllAction(): this {
    return this.stopAll();
  }

  /** Removes every cached action and binding associated with `root`. */
  uncacheRoot(root: object): void {
    for (const [clip, actionsForClip] of [...this.#actionMap]) {
      for (const localRoot of [...actionsForClip.keys()]) {
        const actionRoot = localRoot ?? this.#root;
        if (actionRoot === root) {
          this.uncacheAction(clip, localRoot);
        }
      }
    }
    const entries = this.#entriesByRoot.get(root);
    if (entries) {
      for (const entry of [...entries.values()]) {
        this.#releaseMixer(entry.mixer);
      }
    }
  }

  /** Recreates property mixers after an animation group’s roots change. */
  rebuildBindings(): void {
    if (!(this.#root instanceof AnimationGroup)) return;

    this.#clearMixerEntries();
    for (const action of this.#actions) {
      const tracks = this.#actionTracks.get(action);
      if (tracks)
        this.#actionMixers.set(action, this.#createMixers(action, tracks));
    }
  }

  /** Removes every cached action and binding associated with a clip. */
  uncacheClip(clip: AnimationClip): void {
    const actions = this.#actionMap.get(clip);
    if (!actions) return;
    for (const localRoot of [...actions.keys()])
      this.uncacheAction(clip, localRoot);
  }

  /** Removes one cached clip/root action and releases its mixers and bindings. */
  uncacheAction(
    clip: AnimationClip,
    localRoot: object | undefined = void 0,
  ): void {
    const action = this.#actionMap.get(clip)?.get(localRoot);
    if (!action) return;
    if (action.active) action.stop();

    const mixersByTrack = this.#actionMixers.get(action) ?? [];
    for (const mixers of mixersByTrack) {
      for (const mixer of mixers) {
        this.#releaseMixer(mixer);
      }
    }

    this.#actionMixers.delete(action);
    this.#actionTracks.delete(action);
    const actionsForClip = this.#actionMap.get(clip);
    actionsForClip?.delete(localRoot);
    if (actionsForClip && actionsForClip.size === 0) {
      this.#actionMap.delete(clip);
    }

    const actionIdx = this.#actions.indexOf(action);
    if (actionIdx !== -1) this.#actions.splice(actionIdx, 1);
  }

  #createMixers(
    action: AnimationAction,
    tracks: readonly AnimationTrack[],
  ): PropertyMixer[][] {
    const actionRoot = action.localRoot ?? this.#root;
    const roots =
      actionRoot instanceof AnimationGroup ? actionRoot.roots : [actionRoot];
    const retained: PropertyMixer[] = [];
    try {
      return tracks.map((track) =>
        roots.map((root) => {
          const mixer = this.#acquireMixer(root, track);
          retained.push(mixer);
          return mixer;
        }),
      );
    } catch (error) {
      for (const mixer of retained.reverse()) this.#releaseMixer(mixer);
      throw error;
    }
  }

  #acquireMixer(root: object, track: AnimationTrack): PropertyMixer {
    const key = `${track.name}\u0000${track.itemSize}\u0000${track.valueType}`;
    let entries = this.#entriesByRoot.get(root);
    if (!entries) {
      entries = new Map<string, MixerEntry>();
      this.#entriesByRoot.set(root, entries);
    }
    const existing = entries.get(key);
    if (existing) {
      existing.references++;
      return existing.mixer;
    }
    const binding = new Binding(root, track.name).bind();
    const mixer = new PropertyMixer(binding, track.itemSize, track.valueType);
    try {
      mixer.saveOriginalState();
    } catch (error) {
      binding.unbind();
      throw error;
    }
    const entry: MixerEntry = { root, key, binding, mixer, references: 1 };
    entries.set(key, entry);
    this.#entriesByMixer.set(mixer, entry);
    this.#bindings.push(binding);
    this.#mixers.push(mixer);
    return mixer;
  }

  #releaseMixer(mixer: PropertyMixer): void {
    const entry = this.#entriesByMixer.get(mixer);
    if (!entry) return;
    entry.references--;
    if (entry.references > 0) return;
    try {
      entry.mixer.restoreOriginalState();
    } finally {
      entry.binding.unbind();
      this.#entriesByMixer.delete(mixer);
      const entries = this.#entriesByRoot.get(entry.root);
      entries?.delete(entry.key);
      if (entries && entries.size === 0) this.#entriesByRoot.delete(entry.root);
      const mixerIndex = this.#mixers.indexOf(mixer);
      if (mixerIndex !== -1) this.#mixers.splice(mixerIndex, 1);
      const bindingIndex = this.#bindings.indexOf(entry.binding);
      if (bindingIndex !== -1) this.#bindings.splice(bindingIndex, 1);
      this.#activeMixers.delete(mixer);
      this.#previouslyActiveMixers.delete(mixer);
    }
  }

  #clearMixerEntries(): void {
    for (const entry of this.#entriesByMixer.values()) {
      try {
        entry.mixer.restoreOriginalState();
      } finally {
        entry.binding.unbind();
      }
    }
    this.#entriesByMixer.clear();
    this.#entriesByRoot.clear();
    this.#bindings = [];
    this.#mixers = [];
    this.#activeMixers.clear();
    this.#previouslyActiveMixers.clear();
  }

  #activateAction(action: AnimationAction): void {
    if (this.#activeActionSet.has(action)) return;
    this.#activeActionSet.add(action);
    this.#activeActions.push(action);
  }

  #deactivateAction(action: AnimationAction): void {
    if (!this.#activeActionSet.delete(action)) return;
    const index = this.#activeActions.indexOf(action);
    if (index === -1) return;
    const last = this.#activeActions.pop();
    if (last && index < this.#activeActions.length) {
      this.#activeActions[index] = last;
    }
  }
}
