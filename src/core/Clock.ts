function now(): number {
	return (typeof performance === "undefined" ? Date : performance).now();
}

/** High-resolution elapsed time tracker. */
export class Clock {
	#autoStart: boolean;
	#startTime = 0;
	#oldTime = 0;
	#elapsedTime = 0;
	#running = false;

	constructor(autoStart = true) {
		this.#autoStart = autoStart;
	}

	/** Total elapsed time in seconds since the clock started. */
	get elapsedTime(): number {
		this.delta;
		return this.#elapsedTime;
	}

	/**
	 * Time in seconds since the last call to `.delta`.
	 * Auto-starts the clock on first access if autoStart is true.
	 */
	get delta(): number {
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

	/** Start or restart the clock. */
	start(): void {
		this.#startTime = now();
		this.#oldTime = this.#startTime;
		this.#elapsedTime = 0;
		this.#running = true;
	}

	/** Stop the clock and disable auto-start. */
	stop(): void {
		this.elapsedTime;
		this.#running = false;
		this.#autoStart = false;
	}
}
