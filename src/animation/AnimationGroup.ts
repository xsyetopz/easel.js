/** Explicit root membership for applying one animation state to multiple objects. */
export class AnimationGroup {
  readonly #roots = new Set<object>();

  /** Creates a group and adds each supplied root to its membership set. */
  constructor(...roots: object[]) {
    this.add(...roots);
  }

  /** Snapshot of the roots currently included in this group. */
  get roots(): readonly object[] {
    return [...this.#roots];
  }

  /** Number of unique roots currently in the group. */
  get size(): number {
    return this.#roots.size;
  }

  /** Returns whether the group contains `root`. */
  has(root: object): boolean {
    return this.#roots.has(root);
  }

  /** Adds each root once and returns this group for chaining. */
  add(...roots: object[]): this {
    for (const root of roots) this.#roots.add(root);
    return this;
  }

  /** Removes the supplied roots and reports whether any membership changed. */
  delete(...roots: object[]): boolean {
    let deleted = false;
    for (const root of roots) deleted = this.#roots.delete(root) || deleted;
    return deleted;
  }

  /** Removes every root from the group. */
  clear(): void {
    this.#roots.clear();
  }
}
