export class Clock {
    /** @private @type {boolean} */
    #autoStart;

    /**
     * @private @type {number}
     * @default 0
     */
    #startTime = 0;

    /**
     * @private @type {number}
     * @default 0
     */
    #oldTime = 0;

    /**
     * @private @type {number}
     * @default 0
     */
    #elapsedTime = 0;

    /**
     * @private @type {boolean}
     * @default false
     */
    #running = false;

    /**
     * Creates new Clock.
     * @param {boolean} [autoStart=true] - if `true`, clock starts on first delta call
     */
    constructor(autoStart = true) {
        this.#autoStart = autoStart;
    }

    /**
     * Returns total elapsed time in seconds.
     * @readonly @type {number}
     */
    get elapsedTime() {
        this.delta();
        return this.#elapsedTime;
    }

    /**
     * Calculates time difference since last call in seconds.
     * If clock is not running, starts automatically if `#autoStart` is `true`.
     * @returns {number} time difference in seconds
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
     * Starts clock, resetting elapsed time.
     * If clock is already running, this has no effect.
     * @returns {Clock}
     */
    start() {
        this.#startTime = _now();
        this.#oldTime = this.#startTime;
        this.#elapsedTime = 0;
        this.#running = true;
    }

    /**
     * Stops clock, updates final elapsed time, and disables auto-start.
     * @returns {Clock}
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
