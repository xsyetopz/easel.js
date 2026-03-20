/** @type {number} Loop once and stop. */
export const LoopOnce = 2200;

/** @type {number} Loop repeatedly. */
export const LoopRepeat = 2201;

/** @type {number} Loop back and forth (ping-pong). */
export const LoopPingPong = 2202;

/**
 * Playback state for a single AnimationClip on a root Node.
 */
export class AnimationAction {
	/** @type {*} */
	#clip;

	/** @type {boolean} */
	enabled = true;

	/** @type {number} */
	weight = 1;

	/** @type {number} */
	timeScale = 1;

	/** @type {number} */
	time = 0;

	/** @type {number} */
	loop = LoopRepeat;

	/** @type {number} */
	repetitions = Number.POSITIVE_INFINITY;

	/** @type {boolean} */
	clampWhenFinished = false;

	/** @type {boolean} */
	paused = false;

	/** @type {number} */
	#repetitionCount = 0;

	/** @type {object|undefined} */
	#localRoot = undefined;

	/** @type {number|undefined} */
	_fadeTarget = undefined;

	/** @type {number|undefined} */
	_fadeDuration = undefined;

	/** @type {number|undefined} */
	_fadeElapsed = undefined;

	/**
	 * @param {*} clip
	 * @param {object|undefined} [localRoot=undefined]
	 */
	constructor(clip, localRoot = undefined) {
		this.#clip = clip;
		this.#localRoot = localRoot;
	}

	/** @returns {*} */
	get clip() {
		return this.#clip;
	}

	/** @returns {object|undefined} */
	get localRoot() {
		return this.#localRoot;
	}

	/**
	 * @returns {this}
	 */
	play() {
		this.enabled = true;
		return this;
	}

	/**
	 * @returns {this}
	 */
	stop() {
		this.enabled = false;
		this.time = 0;
		this.#repetitionCount = 0;
		return this;
	}

	/**
	 * @returns {this}
	 */
	reset() {
		this.time = 0;
		this.enabled = true;
		this.#repetitionCount = 0;
		return this;
	}

	/**
	 * @param {number} mode - LoopOnce | LoopRepeat | LoopPingPong
	 * @param {number} repetitions
	 * @returns {this}
	 */
	setLoop(mode, repetitions) {
		this.loop = mode;
		this.repetitions = repetitions;
		return this;
	}

	/**
	 * @param {number} weight
	 * @returns {this}
	 */
	setEffectiveWeight(weight) {
		this.weight = weight;
		return this;
	}

	/**
	 * @returns {number}
	 */
	getEffectiveWeight() {
		return this.weight;
	}

	/**
	 * Schedules weight to animate from 0 to 1 over duration seconds.
	 * @param {number} duration
	 * @returns {this}
	 */
	fadeIn(duration) {
		this.weight = 0;
		this._fadeTarget = 1;
		this._fadeDuration = duration;
		this._fadeElapsed = 0;
		return this;
	}

	/**
	 * Schedules weight to animate from 1 to 0 over duration seconds.
	 * @param {number} duration
	 * @returns {this}
	 */
	fadeOut(duration) {
		this.weight = 1;
		this._fadeTarget = 0;
		this._fadeDuration = duration;
		this._fadeElapsed = 0;
		return this;
	}

	/**
	 * Fades out another action while this one fades in.
	 * @param {AnimationAction} fadeOutAction
	 * @param {number} duration
	 * @param {boolean} [_warp=false]
	 * @returns {this}
	 */
	crossFadeFrom(fadeOutAction, duration, _warp = false) {
		fadeOutAction.fadeOut(duration);
		this.fadeIn(duration);
		return this;
	}

	/**
	 * Fades out this action while another fades in.
	 * @param {AnimationAction} fadeInAction
	 * @param {number} duration
	 * @param {boolean} [_warp=false]
	 * @returns {this}
	 */
	crossFadeTo(fadeInAction, duration, _warp = false) {
		this.fadeOut(duration);
		fadeInAction.fadeIn(duration);
		return this;
	}

	/**
	 * Advances time by delta, handling loop modes and fade.
	 * @param {number} delta
	 */
	#advance(delta) {
		if (this.paused || !this.enabled) return;

		const scaledDelta = delta * this.timeScale;
		const duration = this.#clip.duration;

		this.#updateFade(delta);
		this.time += scaledDelta;

		if (duration <= 0) return;

		this.#applyLoop(duration);
	}

	/**
	 * @param {number} delta
	 */
	#updateFade(delta) {
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

	/**
	 * @param {number} duration
	 */
	#applyLoop(duration) {
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

	/**
	 * @param {number} duration
	 */
	#applyLoopOnce(duration) {
		if (this.time >= duration) {
			this.time = this.clampWhenFinished ? duration : 0;
			this.enabled = !this.clampWhenFinished;
		}
	}

	/**
	 * @param {number} duration
	 */
	#applyLoopRepeat(duration) {
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

	/**
	 * Called by Animator.update - exposed for internal use.
	 * @param {number} delta
	 */
	_update(delta) {
		this.#advance(delta);
	}
}
