/**
 * @returns {number}
 */
function now() {
	return (typeof performance === "undefined" ? Date : performance).now();
}

/** High-resolution elapsed time tracker. */
export class Clock {
	#autoStart;
	#startTime = 0;
	#oldTime = 0;
	#elapsedTime = 0;
	#running = false;

	/**
	 * @param {boolean} [autoStart=true]
	 */
	constructor(autoStart = true) {
		this.#autoStart = autoStart;
	}

	/**
	 * Total elapsed time in seconds since the clock started.
	 * @returns {number}
	 */
	get elapsedTime() {
		this.delta;
		return this.#elapsedTime;
	}

	/**
	 * Time in seconds since the last call to `.delta`.
	 * Auto-starts the clock on first access if autoStart is true.
	 * @returns {number}
	 */
	get delta() {
		let diff = 0;

		if (this.#autoStart && !this.#running) {
			this.start();
			return 0;
		}

		if (this.#running) {
			const newTime = now();

			diff = (newTime - this.#oldTime) / 1000;
			this.#oldTime = newTime;

			this.#elapsedTime += diff;
		}

		return diff;
	}

	/**
	 * Start or restart the clock.
	 * @returns {void}
	 */
	start() {
		this.#startTime = now();
		this.#oldTime = this.#startTime;
		this.#elapsedTime = 0;
		this.#running = true;
	}

	/**
	 * Stop the clock and disable auto-start.
	 * @returns {void}
	 */
	stop() {
		this.elapsedTime;
		this.#running = false;
		this.#autoStart = false;
	}
}
