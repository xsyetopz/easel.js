import { AnimationAction } from "./AnimationAction.ts";
import type { AnimationClip } from "./AnimationClip.ts";
import { Binding } from "./Binding.ts";
import { PropertyMixer } from "./PropertyMixer.ts";
import type { Track } from "./Track.ts";

/** Manages AnimationActions on a root Node, driving per-frame playback and blending. */
export class Animator {
  #root: object;
  #actions: AnimationAction[] = [];
  #bindings: Binding[] = [];
  #mixers: PropertyMixer[] = [];
  #time = 0;
  #actionMap = new Map<AnimationClip, AnimationAction>();
  #actionMixers = new Map<AnimationAction, PropertyMixer[]>();
  #actionTracks = new Map<AnimationAction, Track[]>();

  constructor(root: object) {
    this.#root = root;
  }

  get root(): object {
    return this.#root;
  }

  get time(): number {
    return this.#time;
  }

  /** Finds or creates an AnimationAction for the given clip. */
  clipAction(clip: AnimationClip): AnimationAction {
    const existing = this.#actionMap.get(clip);
    if (existing !== undefined) return existing;

    const action = new AnimationAction(clip, this.#root);
    this.#actions.push(action);
    this.#actionMap.set(clip, action);

    const mixers: PropertyMixer[] = [];
    for (const track of clip.tracks) {
      const binding = new Binding(this.#root, track.name);
      const mixer = new PropertyMixer(binding, track.itemSize);
      this.#bindings.push(binding);
      this.#mixers.push(mixer);
      mixers.push(mixer);
    }
    this.#actionMixers.set(action, mixers);
    this.#actionTracks.set(action, clip.tracks);

    return action;
  }

  /** Returns an existing action for the clip, or undefined. */
  existingAction(clip: AnimationClip): AnimationAction | undefined {
    return this.#actionMap.get(clip) ?? undefined;
  }

  /** Advances all enabled actions and applies blended property values. */
  update(delta: number): void {
    this.#time += delta;

    for (const action of this.#actions) {
      if (!action.enabled) continue;

      action._update(delta);

      const tracks = this.#actionTracks.get(action);
      const mixers = this.#actionMixers.get(action);
      if (!(tracks && mixers)) continue;

      const weight = action.getEffectiveWeight();
      for (let i = 0; i < tracks.length; i++) {
        const values = tracks[i].getValueAtTime(action.time);
        const mixer = mixers[i];
        mixer.accumulate(0, weight, values);
      }
    }

    for (const mixer of this.#mixers) {
      mixer.apply(0);
    }
  }

  /** Stops and disables all actions. */
  stopAllAction(): void {
    for (const action of this.#actions) {
      action.stop();
    }
  }

  /** Removes all actions and bindings for the given clip. */
  uncacheClip(clip: AnimationClip): void {
    const action = this.#actionMap.get(clip);
    if (action) this.uncacheAction(clip);
  }

  /** Removes the action and associated mixers/bindings for the given clip. */
  uncacheAction(clip: AnimationClip): void {
    const action = this.#actionMap.get(clip);
    if (!action) return;

    const mixers = this.#actionMixers.get(action) ?? [];
    for (const mixer of mixers) {
      const idx = this.#mixers.indexOf(mixer);
      if (idx !== -1) this.#mixers.splice(idx, 1);
    }

    this.#actionMixers.delete(action);
    this.#actionTracks.delete(action);
    this.#actionMap.delete(clip);

    const actionIdx = this.#actions.indexOf(action);
    if (actionIdx !== -1) this.#actions.splice(actionIdx, 1);
  }
}
