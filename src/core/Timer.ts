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

  /** Resets the timestamp baseline and zeroes the next delta without changing elapsed time. */
  reset(timestamp: number = now()): this {
    this.#currentTime = timestamp - this.#startTime;
    this.#delta = 0;
    return this;
  }
}
