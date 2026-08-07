function now(): number {
  return (typeof performance === "undefined" ? Date : performance).now();
}

/** Explicit high-resolution simulation timer with seconds-based deltas. */
export class Timer {
  #startTime = now();
  #currentTime = 0;
  #delta = 0;
  #elapsedTime = 0;
  #timeScale = 1;

  /** Last timestamp at which the timer was sampled, in milliseconds. */
  oldTime = 0;
  /** Whether the Clock-compatible timer is running. */
  running = false;
  /** Whether `delta` automatically starts the timer on first call. */
  autoStart = true;

  /** Delta from the most recent explicit update, in seconds. */
  get delta(): number {
    return this.#delta;
  }

  /** Accumulated scaled time, in seconds. */
  get elapsedTime(): number {
    return this.#elapsedTime;
  }

  /** Scale applied to subsequent update deltas. */
  get timeScale(): number {
    return this.#timeScale;
  }

  /** Sets the multiplier applied to subsequent update deltas. */
  set timeScale(value: number) {
    this.#timeScale = value;
  }

  /**
   * Explicitly samples a timestamp and advances the timer.
   * Pass a requestAnimationFrame timestamp to avoid sampling the clock again.
   */
  update(timestamp: number = now()): this {
    const previousTime = this.#currentTime;
    this.#currentTime = timestamp - this.#startTime;
    this.#delta = ((this.#currentTime - previousTime) * this.#timeScale) / 1000;
    this.#elapsedTime += this.#delta;
    return this;
  }

  /** Starts the timer, recording the baseline timestamp. */
  start(): this {
    this.#startTime = now();
    this.oldTime = this.#startTime;
    this.#currentTime = 0;
    this.#delta = 0;
    this.#elapsedTime = 0;
    this.running = true;
    this.autoStart = false;
    return this;
  }

  /** Stops the timer after a final update and freezes accumulated state. */
  stop(): this {
    this.update();
    this.running = false;
    this.autoStart = false;
    return this;
  }

  /** Resets the timestamp baseline and zeroes the next delta without changing elapsed time. */
  reset(timestamp: number = now()): this {
    this.#currentTime = timestamp - this.#startTime;
    this.#delta = 0;
    this.oldTime = timestamp;
    this.running = false;
    return this;
  }
}
