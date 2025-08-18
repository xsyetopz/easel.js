/**
 * A high-resolution timer for measuring elapsed time and frame deltas.
 * @class
 */
export class Clock {
    /**
     * Whether clock should automatically start on first use.
     * @private
     * @type {boolean}
     */
    #autoStart;

    /**
     * Time when clock was started (ms).
     * @private
     * @type {number}
     */
    #startTime = 0;

    /**
     * Time of previous tick (ms).
     * @private
     * @type {number}
     */
    #oldTime = 0;

    /**
     * Total elapsed time in seconds.
     * @private
     * @type {number}
     */
    #elapsedTime = 0;

    /**
     * Whether clock is currently running.
     * @private
     * @type {boolean}
     */
    #running = false;

    /**
     * @param {boolean} [autoStart=true] if true, clock starts on first delta call.
     */
    constructor(autoStart = true) {
        this.#autoStart = autoStart;
    }

    /**
     * Total elapsed time in seconds.
     * @readonly
     * @type {number}
     */
    get elapsedTime() {
        this.delta;
        return this.#elapsedTime;
    }

    /**
     * Returns time in seconds since last call.
     * @readonly
     * @type {number}
     */
    get delta() {
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

    start() {
        this.#startTime = _now();
        this.#oldTime = this.#startTime;
        this.#elapsedTime = 0;
        this.#running = true;
    }

    stop() {
        this.elapsedTime;
        this.#running = false;
        this.#autoStart = false;
    }
}

function _now() {
    return (typeof performance === undefined ? Date : performance).now();
}
