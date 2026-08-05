import type { DrawCall } from "./DrawCall.ts";

/** Growable list of DrawCalls collected during scene traversal. */
export class DrawList {
  #calls: DrawCall[] = [];

  /** Lights collected during scene traversal. */
  lights: Record<string, unknown>[] = [];

  /** Draw calls collected during the current traversal. */
  get calls(): DrawCall[] {
    return this.#calls;
  }

  /** Number of draw calls currently collected. */
  get length(): number {
    return this.#calls.length;
  }

  /** Appends one visible draw call to the current traversal list. */
  add(drawCall: DrawCall): void {
    this.#calls.push(drawCall);
  }

  /** Clears the current contents while retaining reusable storage. */
  clear(): void {
    this.#calls.length = 0;
    this.lights.length = 0;
  }

  /** Iterates over draw calls in collection order. */
  [Symbol.iterator](): Iterator<DrawCall> {
    return this.#calls[Symbol.iterator]();
  }
}
