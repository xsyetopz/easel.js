import { Shading } from "../core/Constants.ts";
import { Color } from "../math/Color.ts";
import type { Texture } from "../textures/Texture.ts";
import {
  Material,
  type MaterialJSON,
  type MaterialOptions,
} from "./Material.ts";

/** Values accepted by a sprite material constructor. */
export interface SpriteMaterialOptions extends MaterialOptions {
  /** Base RGB color used when no color map is assigned. */
  readonly color?: Color | number | string;
  /** Optional color texture sampled with nearest-neighbor CPU lookup. */
  readonly map?: Texture | undefined;
  /** Rotation of the sprite quad in radians. */
  readonly rotation?: number;
}

/** Serialized state of a sprite material. */
export interface SpriteMaterialJSON extends MaterialJSON {
  /** Serialized base RGB color packed as a 24-bit integer. */
  color: number;
  /** Texture id used by the color map, when assigned. */
  map?: string;
  /** Rotation of the sprite quad in radians. */
  rotation: number;
}

function assertFiniteColor(color: Color): void {
  if (!Number.isFinite(color.r)) {
    throw new RangeError("SpriteMaterial.toJSON requires finite color.r.");
  }
  if (!Number.isFinite(color.g)) {
    throw new RangeError("SpriteMaterial.toJSON requires finite color.g.");
  }
  if (!Number.isFinite(color.b)) {
    throw new RangeError("SpriteMaterial.toJSON requires finite color.b.");
  }
}

/** Solid color or textured material for camera-facing sprite quads. Defaults to flat shading, transparency, and no depth writes. */
export class SpriteMaterial extends Material {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "SpriteMaterial";

  /** Returns `true` for this concrete type. */
  get isSpriteMaterial(): true {
    return true;
  }

  /** Base RGB color multiplied into rasterized fragments. */
  color: Color;

  /** Optional nearest-neighbor texture sampled for fragment color. */
  map: Texture | undefined = undefined;

  /** Rotation of the sprite quad in radians. */
  rotation: number = 0;

  /** Constructs a sprite material with optional nearest-neighbor texturing. */
  constructor(options: SpriteMaterialOptions = {}) {
    super(options);
    this.shading = options.shading ?? Shading.Flat;
    this.color = new Color(options.color ?? 0xffffff);
    if (options.map !== undefined) this.map = options.map;
    if (options.rotation !== undefined) this.rotation = options.rotation;
    this.transparent = options.transparent ?? true;
    this.depthWrite = options.depthWrite ?? false;
  }

  /** Creates an independent copy with cloned owned state. */
  override clone(): SpriteMaterial {
    return new SpriteMaterial().copy(this);
  }

  /** Copies public state from `source` into this instance and returns `this`. */
  override copy(source: SpriteMaterial): this {
    super.copy(source);
    this.color.copy(source.color);
    this.map = source.map;
    this.rotation = source.rotation;
    return this;
  }

  /** Serializes common state, color, rotation, and the optional color-map reference. */
  override toJSON(): SpriteMaterialJSON {
    assertFiniteColor(this.color);
    const json: SpriteMaterialJSON = {
      ...super.toJSON(),
      color: this.color.hex,
      rotation: this.rotation,
    };
    if (this.map !== undefined) json.map = this.map.uuid;
    return json;
  }
}
