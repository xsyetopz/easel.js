import type { LineMaterialJSON, LineMaterialOptions } from "./LineMaterial.ts";
import { LineMaterial } from "./LineMaterial.ts";

/** Values accepted by a dashed line material constructor. */
export interface DashedLineMaterialOptions extends LineMaterialOptions {
  /** Positive integer dash size in framebuffer pixels. */
  readonly dashSize?: number;
  /** Non-negative integer gap size in framebuffer pixels. */
  readonly gapSize?: number;
}

/** Serialized state of a dashed line material. */
export interface DashedLineMaterialJSON extends LineMaterialJSON {
  /** Positive dash length in framebuffer pixels. */
  dashSize: number;
  /** Non-negative gap length in framebuffer pixels. */
  gapSize: number;
}

/**
 * Line material that renders a repeating pixel-space dash pattern.
 *
 * The CPU rasterizer restarts the phase for each logical segment instead of
 * accumulating implicit world-distance continuity.
 */
export class DashedLineMaterial extends LineMaterial {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "DashedLineMaterial";

  /** Returns `true` for this concrete type. */
  get isDashedLineMaterial(): true {
    return true;
  }

  #dashSize = 3;

  #gapSize = 1;

  /** Positive dash length in framebuffer pixels. */
  get dashSize(): number {
    return this.#dashSize;
  }

  /** Sets the positive dash length in framebuffer pixels. */
  set dashSize(value: number) {
    if (!(Number.isInteger(value) && Number.isFinite(value)) || value <= 0) {
      throw new RangeError(
        "DashedLineMaterial.dashSize must be a finite positive integer",
      );
    }
    this.#dashSize = value;
  }

  /** Non-negative gap length in framebuffer pixels. */
  get gapSize(): number {
    return this.#gapSize;
  }

  /** Sets the non-negative gap length in framebuffer pixels. */
  set gapSize(value: number) {
    if (!(Number.isInteger(value) && Number.isFinite(value)) || value < 0) {
      throw new RangeError(
        "DashedLineMaterial.gapSize must be a non-negative integer",
      );
    }
    this.#gapSize = value;
  }

  /** Constructs an integer-rasterized line material with dash settings. */
  constructor(options: DashedLineMaterialOptions = {}) {
    super(options);
    if (options.dashSize !== undefined) this.dashSize = options.dashSize;
    if (options.gapSize !== undefined) this.gapSize = options.gapSize;
  }

  /** Creates an independent copy with cloned owned state. */
  override clone(): DashedLineMaterial {
    return new DashedLineMaterial().copy(this);
  }

  /** Copies public state from `source` into this instance and returns `this`. */
  override copy(source: DashedLineMaterial): this {
    super.copy(source);
    this.dashSize = source.dashSize;
    this.gapSize = source.gapSize;
    return this;
  }

  /** Serializes common line state and the dash pattern. */
  override toJSON(): DashedLineMaterialJSON {
    return {
      ...super.toJSON(),
      dashSize: this.dashSize,
      gapSize: this.gapSize,
    };
  }
}
