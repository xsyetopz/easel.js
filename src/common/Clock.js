/**
 * A high-resolution timer for measuring elapsed time and frame deltas.
 * @class
 */
export class Clock {
    /** @private @type {boolean} */ #autoStart;
    /** @private @type {number} */ #startTime = 0;
    /** @private @type {number} */ #oldTime = 0;
    /** @private @type {number} */#elapsedTime = 0;
    /** @private @type {boolean} */ #running = false;

    /**
     * @param {boolean} [autoStart=true] if true, clock starts on first delta call.
     */
    constructor(autoStart = true) {
        this.#autoStart = autoStart;
    }

    /**
     * Total elapsed time in seconds.
     * @readonly @type {number}
     */
    get elapsedTime() {
        this.delta();
        return this.#elapsedTime;
    }

    /**
     * Returns time in seconds since last call.
     * @readonly @type {number}
     */
    delta() {
        let diff = 0;

        if (this.#autoStart && !this.#running) {
            this.start();
            return 0;
        }

        if (this.#running) {
            const newTime = _now();
            diff = (newTime - this.#oldTime) / 1000;
            this.#oldTime = newTime;
            this.#elapsedTime += diff;
        }

        return diff;
    }

    /**
     * Sets start time to current time, resets elapsed time, and marks clock as running.
     */
    start() {
        this.#startTime = _now();
        this.#oldTime = this.#startTime;
        this.#elapsedTime = 0;
        this.#running = true;
    }

    /**
     * Updates final elapsed time, marks clock as not running, and disables auto-start.
     */
    stop() {
        this.elapsedTime;
        this.#running = false;
        this.#autoStart = false;
    }
}

function _now() {
    return (typeof performance === undefined ? Date : performance).now();
}
