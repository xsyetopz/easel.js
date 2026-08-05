/** 32-bit mask used to filter rendering and raycasting participation. */
export class Layers {
  #mask = 1;

  /** Current signed 32-bit layer mask. */
  get mask(): number {
    return this.#mask;
  }

  /** Replaces the mask with the bit at `layer`. */
  set(layer: number): void {
    this.#mask = 1 << layer;
  }

  /** Sets the bit at `layer` without changing other enabled layers. */
  enable(layer: number): void {
    this.#mask |= 1 << layer;
  }

  /** Enables all 32 mask bits. */
  enableAll(): void {
    this.#mask = 0xffffffff;
  }

  /** Flips the bit at `layer`. */
  toggle(layer: number): void {
    this.#mask ^= 1 << layer;
  }

  /** Clears the bit at `layer`. */
  disable(layer: number): void {
    this.#mask &= ~(1 << layer);
  }

  /** Disables all 32 layer bits. */
  disableAll(): void {
    this.#mask = 0;
  }

  /** Returns whether this mask shares at least one bit with `layers`. */
  test(layers: Layers): boolean {
    return (this.#mask & layers.mask) !== 0;
  }

  /** Returns whether the bit at `layer` is enabled. */
  isEnabled(layer: number): boolean {
    return (this.#mask & (1 << layer)) !== 0;
  }
}
