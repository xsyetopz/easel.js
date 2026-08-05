import { Shading } from "../core/Constants.ts";
import { Color } from "../math/Color.ts";
import type { Texture } from "../textures/Texture.ts";
import {
  Material,
  type MaterialJSON,
  type MaterialOptions,
} from "./Material.ts";

/** Values accepted by a Lambert material constructor. */
export interface LambertMaterialOptions extends MaterialOptions {
  /** Base diffuse RGB color before CPU-baked lighting. */
  readonly color?: Color | number | string;
  /** Optional color texture sampled with nearest-neighbor CPU lookup. */
  readonly map?: Texture | undefined;
}

/** Serialized state of a Lambert material. */
export interface LambertMaterialJSON extends MaterialJSON {
  /** Serialized diffuse RGB color packed as a 24-bit integer. */
  color: number;
  /** Texture id used by the color map, when assigned. */
  map?: string;
}

function assertFiniteColor(color: Color): void {
  if (!Number.isFinite(color.r)) {
    throw new RangeError("LambertMaterial.toJSON requires finite color.r.");
  }
  if (!Number.isFinite(color.g)) {
    throw new RangeError("LambertMaterial.toJSON requires finite color.g.");
  }
  if (!Number.isFinite(color.b)) {
    throw new RangeError("LambertMaterial.toJSON requires finite color.b.");
  }
}

/**
 * Diffuse lighting from all lights in scene. Defaults to Gouraud shading -
 * per-vertex lighting interpolated across faces.
 */
export class LambertMaterial extends Material {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "LambertMaterial";

  /** Returns `true` for this concrete type. */
  get isLambertMaterial(): true {
    return true;
  }

  /** Base diffuse RGB color multiplied into baked lighting. */
  color: Color;

  /** Optional nearest-neighbor texture sampled for fragment color. */
  map: Texture | undefined = undefined;

  /** Constructs a diffuse material for CPU-baked Lambert lighting. */
  constructor(options: LambertMaterialOptions = {}) {
    super(options);
    this.shading = options.shading ?? Shading.Gouraud;
    this.color = new Color(options.color ?? 0xffffff);
    if (options.map !== undefined) this.map = options.map;
  }

  /** Creates an independent copy with cloned owned state. */
  override clone(): LambertMaterial {
    return new LambertMaterial().copy(this);
  }

  /** Copies public state from `source` into this instance and returns `this`. */
  override copy(source: LambertMaterial): this {
    super.copy(source);
    this.color.copy(source.color);
    this.map = source.map;
    return this;
  }

  /** Serializes common state, color, and the optional color-map reference. */
  override toJSON(): LambertMaterialJSON {
    assertFiniteColor(this.color);
    const json: LambertMaterialJSON = {
      ...super.toJSON(),
      color: this.color.hex,
    };
    if (this.map !== undefined) json.map = this.map.uuid;
    return json;
  }
}
