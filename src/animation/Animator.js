import { AnimationAction } from "./AnimationAction.js";
import { Binding } from "./Binding.js";
import { PropertyMixer } from "./PropertyMixer.js";

/**
 * Manages AnimationActions on a root Node, driving per-frame playback and blending.
 */
export class Animator {
	/** @type {object} */
	#root;

	/** @type {AnimationAction[]} */
	#actions = [];

	/** @type {Binding[]} */
	#bindings = [];

	/** @type {PropertyMixer[]} */
	#mixers = [];

	/** @type {number} */
	#time = 0;

	/** @type {Map<*, AnimationAction>} */
	#actionMap = new Map();

	/** @type {Map<AnimationAction, PropertyMixer[]>} */
	#actionMixers = new Map();

	/** @type {Map<AnimationAction, *[]>} */
	#actionTracks = new Map();

	/**
	 * @param {object} root - Root Node
	 */
	constructor(root) {
		this.#root = root;
	}

	/** @returns {object} */
	get root() {
		return this.#root;
	}

	/** @returns {number} */
	get time() {
		return this.#time;
	}

	/**
	 * Finds or creates an AnimationAction for the given clip.
	 * @param {*} clip
	 * @returns {AnimationAction}
	 */
	clipAction(clip) {
		const existing = this.#actionMap.get(clip);
		if (existing !== undefined) return existing;

		const action = new AnimationAction(clip, this.#root);
		this.#actions.push(action);
		this.#actionMap.set(clip, action);

		const mixers = [];
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

	/**
	 * Returns an existing action for the clip, or undefined.
	 * @param {*} clip
	 * @returns {AnimationAction|undefined}
	 */
	existingAction(clip) {
		return this.#actionMap.get(clip) ?? undefined;
	}

	/**
	 * Advances all enabled actions and applies blended property values.
	 * @param {number} delta - Time delta in seconds
	 */
	update(delta) {
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

	/**
	 * Stops and disables all actions.
	 */
	stopAllAction() {
		for (const action of this.#actions) {
			action.stop();
		}
	}

	/**
	 * Removes all actions and bindings for the given clip.
	 * @param {*} clip
	 */
	uncacheClip(clip) {
		const action = this.#actionMap.get(clip);
		if (action) this.uncacheAction(clip);
	}

	/**
	 * Removes the action and associated mixers/bindings for the given clip.
	 * @param {*} clip
	 */
	uncacheAction(clip) {
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
