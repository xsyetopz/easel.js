import { Shading } from "../core/Constants.ts";
import { Color } from "../math/Color.ts";
import type { Texture } from "../textures/Texture.ts";
import {
  Material,
  type MaterialJSON,
  type MaterialOptions,
} from "./Material.ts";

/** Values accepted by a basic material constructor. */
export interface BasicMaterialOptions extends MaterialOptions {
  /** Base RGB color used when no color map is assigned. */
  readonly color?: Color | number | string;
  /** Optional color texture sampled with nearest-neighbor CPU lookup. */
  readonly map?: Texture | undefined;
}

/** Serialized state of a basic material. */
export interface BasicMaterialJSON extends MaterialJSON {
  /** Serialized base RGB color packed as a 24-bit integer. */
  color: number;
  /** Texture id used by the color map, when assigned. */
  map?: string;
}

function assertFiniteColor(color: Color): void {
  if (!Number.isFinite(color.r)) {
    throw new RangeError("BasicMaterial.toJSON requires finite color.r.");
  }
  if (!Number.isFinite(color.g)) {
    throw new RangeError("BasicMaterial.toJSON requires finite color.g.");
  }
  if (!Number.isFinite(color.b)) {
    throw new RangeError("BasicMaterial.toJSON requires finite color.b.");
  }
}

/** Solid color or textured, no lighting. Defaults to flat shading. */
export class BasicMaterial extends Material {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "BasicMaterial";

  /** Returns `true` for this concrete type. */
  get isBasicMaterial(): true {
    return true;
  }

  /** Base RGB color multiplied into rasterized fragments. */
  color: Color;

  /** Optional nearest-neighbor texture sampled for fragment color. */
  map: Texture | undefined = undefined;

  /** Constructs an unlit material with optional nearest-neighbor texturing. */
  constructor(options: BasicMaterialOptions = {}) {
    super(options);
    this.shading = options.shading ?? Shading.Flat;
    this.color = new Color(options.color ?? 0xffffff);
    if (options.map !== undefined) this.map = options.map;
  }

  /** Creates an independent copy with cloned owned state. */
  override clone(): BasicMaterial {
    return new BasicMaterial().copy(this);
  }

  /** Copies public state from `source` into this instance and returns `this`. */
  override copy(source: BasicMaterial): this {
    super.copy(source);
    this.color.copy(source.color);
    this.map = source.map;
    return this;
  }

  /** Serializes common state, color, and the optional color-map reference. */
  override toJSON(): BasicMaterialJSON {
    assertFiniteColor(this.color);
    const json: BasicMaterialJSON = {
      ...super.toJSON(),
      color: this.color.hex,
    };
    if (this.map !== undefined) json.map = this.map.uuid;
    return json;
  }
}
