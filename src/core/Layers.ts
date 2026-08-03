/** Bit-mask layer system for selective rendering and raycasting. */
export class Layers {
  #mask = 1;

  /** Current bitmask. */
  get mask(): number {
    return this.#mask;
  }

  /** Set the mask to a single layer. */
  set(layer: number): void {
    this.#mask = 1 << layer;
  }

  /** Enable a layer (add it to the mask). */
  enable(layer: number): void {
    this.#mask |= 1 << layer;
  }

  /** Enable all 32 layers. */
  enableAll(): void {
    this.#mask = 0xffffffff;
  }

  /** Toggle a layer on/off. */
  toggle(layer: number): void {
    this.#mask ^= 1 << layer;
  }

  /** Disable a layer (remove it from the mask). */
  disable(layer: number): void {
    this.#mask &= ~(1 << layer);
  }

  /** Disable all layers. */
  disableAll(): void {
    this.#mask = 0;
  }

  /** Test whether this mask overlaps another Layers mask. */
  test(layers: Layers): boolean {
    return (this.#mask & layers.mask) !== 0;
  }

  /** Test if a specific layer is enabled. */
  isEnabled(layer: number): boolean {
    return (this.#mask & (1 << layer)) !== 0;
  }
}
