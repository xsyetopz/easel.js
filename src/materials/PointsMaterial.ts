import { Color } from "../math/Color.ts";
import type { Texture } from "../textures/Texture.ts";
import {
  Material,
  type MaterialJSON,
  type MaterialOptions,
} from "./Material.ts";

/** Values accepted by a points material constructor. */
export interface PointsMaterialOptions extends MaterialOptions {
  /** Base RGB color for rasterized points. */
  readonly color?: Color | number | string;
  /** Integer pixel radius used by the CPU point rasterizer. */
  readonly size?: number;
  /** Optional nearest-neighbor color map. */
  readonly map?: Texture | undefined;
}

/** Serialized state of a points material. */
export interface PointsMaterialJSON extends MaterialJSON {
  /** Serialized point RGB color packed as a 24-bit integer. */
  color: number;
  /** Positive integer point radius in framebuffer pixels. */
  size: number;
  /** Texture id used by the color map, when assigned. */
  map?: string;
}

function assertFiniteColor(color: Color): void {
  if (!Number.isFinite(color.r)) {
    throw new RangeError("PointsMaterial.toJSON requires finite color.r.");
  }
  if (!Number.isFinite(color.g)) {
    throw new RangeError("PointsMaterial.toJSON requires finite color.g.");
  }
  if (!Number.isFinite(color.b)) {
    throw new RangeError("PointsMaterial.toJSON requires finite color.b.");
  }
}

/** Material for Points objects. Size is an integer pixel radius. */
export class PointsMaterial extends Material {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "PointsMaterial";

  /** Returns `true` for this concrete type. */
  get isPointsMaterial(): true {
    return true;
  }

  /** Base RGB color for rasterized point primitives. */
  color: Color;

  #size = 1;

  /** Positive integer point radius in framebuffer pixels. */
  get size(): number {
    return this.#size;
  }

  /** Sets the point radius in integer framebuffer pixels. */
  set size(value: number) {
    if (!(Number.isInteger(value) && Number.isFinite(value)) || value <= 0) {
      throw new RangeError(
        "PointsMaterial.size must be a finite positive integer",
      );
    }
    this.#size = value;
  }

  /** Signals the rasterizer to use point rendering. */
  readonly points: true = true;

  /** Optional nearest-neighbor texture sampled for fragment color. */
  map: Texture | undefined = undefined;

  /** Constructs a point material with an integer pixel radius. */
  constructor(options: PointsMaterialOptions = {}) {
    super(options);
    this.color = new Color(options.color ?? 0xffffff);
    if (options.size !== undefined) this.size = options.size;
    if (options.map !== undefined) this.map = options.map;
  }

  /** Creates an independent copy with cloned owned state. */
  override clone(): PointsMaterial {
    return new PointsMaterial().copy(this);
  }

  /** Copies public state from `source` into this instance and returns `this`. */
  override copy(source: PointsMaterial): this {
    super.copy(source);
    this.color.copy(source.color);
    this.size = source.size;
    this.map = source.map;
    return this;
  }

  /** Serializes common state, color, size, and the optional color-map reference. */
  override toJSON(): PointsMaterialJSON {
    assertFiniteColor(this.color);
    const json: PointsMaterialJSON = {
      ...super.toJSON(),
      color: this.color.hex,
      size: this.size,
    };
    if (this.map !== undefined) json.map = this.map.uuid;
    return json;
  }
}
