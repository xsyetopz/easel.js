import { Color } from "../math/Color.ts";
import {
  Material,
  type MaterialJSON,
  type MaterialOptions,
} from "./Material.ts";

/** Values accepted by a line material constructor. */
export interface LineMaterialOptions extends MaterialOptions {
  /** Base RGB color for integer-rasterized lines. */
  readonly color?: Color | number | string;
  /** Integer pixel linewidth used by the CPU line rasterizer. */
  readonly linewidth?: number;
}

/** Serialized state of a line material. */
export interface LineMaterialJSON extends MaterialJSON {
  /** Serialized line RGB color packed as a 24-bit integer. */
  color: number;
  /** Integer line width in framebuffer pixels. */
  linewidth: number;
}

function assertFiniteColor(color: Color): void {
  if (!Number.isFinite(color.r)) {
    throw new RangeError("LineMaterial.toJSON requires finite color.r.");
  }
  if (!Number.isFinite(color.g)) {
    throw new RangeError("LineMaterial.toJSON requires finite color.g.");
  }
  if (!Number.isFinite(color.b)) {
    throw new RangeError("LineMaterial.toJSON requires finite color.b.");
  }
}

/** Material for Line, LineSegments, and LineLoop objects using integer Bresenham rasterization. */
export class LineMaterial extends Material {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "LineMaterial";

  /** Returns `true` for this concrete type. */
  get isLineMaterial(): true {
    return true;
  }

  /** Base RGB color for integer-rasterized line primitives. */
  color: Color;

  #linewidth = 1;

  /** Integer line width in framebuffer pixels. */
  get linewidth(): number {
    return this.#linewidth;
  }

  /** Sets the line width in integer framebuffer pixels. */
  set linewidth(value: number) {
    if (!(Number.isInteger(value) && Number.isFinite(value)) || value <= 0) {
      throw new RangeError(
        "LineMaterial.linewidth must be a finite positive integer",
      );
    }
    this.#linewidth = value;
  }

  /** Constructs an integer-rasterized line material. */
  constructor(options: LineMaterialOptions = {}) {
    super(options);
    this.color = new Color(options.color ?? 0xffffff);
    if (options.linewidth !== undefined) this.linewidth = options.linewidth;
  }

  /** Creates an independent copy with cloned owned state. */
  override clone(): LineMaterial {
    return new LineMaterial().copy(this);
  }

  /** Copies public state from `source` into this instance and returns `this`. */
  override copy(source: LineMaterial): this {
    super.copy(source);
    this.color.copy(source.color);
    this.linewidth = source.linewidth;
    return this;
  }

  /** Serializes common state, color, and integer linewidth. */
  override toJSON(): LineMaterialJSON {
    assertFiniteColor(this.color);
    return {
      ...super.toJSON(),
      color: this.color.hex,
      linewidth: this.linewidth,
    };
  }
}
