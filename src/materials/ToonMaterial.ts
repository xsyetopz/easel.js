import { Shading } from "../core/Constants.ts";
import { Color } from "../math/Color.ts";
import type { Texture } from "../textures/Texture.ts";
import {
  Material,
  type MaterialJSON,
  type MaterialOptions,
} from "./Material.ts";

/** Values accepted by a toon material constructor. */
export interface ToonMaterialOptions extends MaterialOptions {
  /** Base diffuse RGB color before stepped CPU lighting. */
  readonly color?: Color | number | string;
  /** Optional color texture sampled with nearest-neighbor CPU lookup. */
  readonly map?: Texture | undefined;
  /** Light the surface emits regardless of scene lights; black by default. */
  readonly emissive?: Color | number | string;
  /** Scalar applied to {@link emissive}; defaults to 1. */
  readonly emissiveIntensity?: number;
  /** Optional nearest-neighbor lighting gradient map. */
  readonly gradientMap?: Texture | undefined;
}

/** Serialized state of a toon material. */
export interface ToonMaterialJSON extends MaterialJSON {
  /** Serialized diffuse RGB color packed as a 24-bit integer. */
  color: number;
  /** Serialized emissive sRGB color packed as a 24-bit integer. */
  emissive: number;
  /** Emissive intensity, present only when it differs from 1. */
  emissiveIntensity?: number;
  /** Texture id used by the color map, when assigned. */
  map?: string;
  /** Texture id used by the lighting gradient map, when assigned. */
  gradientMap?: string;
}

function assertFiniteColor(color: Color): void {
  if (!Number.isFinite(color.r)) {
    throw new RangeError("ToonMaterial.toJSON requires finite color.r.");
  }
  if (!Number.isFinite(color.g)) {
    throw new RangeError("ToonMaterial.toJSON requires finite color.g.");
  }
  if (!Number.isFinite(color.b)) {
    throw new RangeError("ToonMaterial.toJSON requires finite color.b.");
  }
}

/** Stepped shading via gradientMap with Gouraud lighting. */
export class ToonMaterial extends Material {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "ToonMaterial";

  /** Returns `true` for this concrete type. */
  get isToonMaterial(): true {
    return true;
  }

  /** Base diffuse RGB color multiplied into baked lighting. */
  color: Color;

  /** Optional nearest-neighbor texture sampled for fragment color. */
  map: Texture | undefined = undefined;

  /**
   * Emitted light added after lighting, as in three.js: a surface no light
   * reaches renders this color instead of black. The CPU bake adds it per
   * vertex; `emissiveMap` is not supported.
   */
  emissive: Color;

  /** Scalar applied to {@link emissive}. */
  emissiveIntensity: number;

  /** Optional nearest-neighbor map from baked light levels to toon colors. */
  gradientMap: Texture | undefined = undefined;

  /** Constructs a Gouraud-lit material with optional gradient-map steps. */
  constructor(options: ToonMaterialOptions = {}) {
    super(options);
    this.shading = Shading.Gouraud;
    this.color = new Color(options.color ?? 0xffffff);
    this.emissive = new Color(options.emissive ?? 0x000000);
    this.emissiveIntensity = options.emissiveIntensity ?? 1;
    if (options.map !== undefined) this.map = options.map;
    if (options.gradientMap !== undefined) {
      this.gradientMap = options.gradientMap;
    }
  }

  /** Creates an independent copy with cloned owned state. */
  override clone(): ToonMaterial {
    return new ToonMaterial().copy(this);
  }

  /** Copies public state from `source` into this instance and returns `this`. */
  override copy(source: ToonMaterial): this {
    super.copy(source);
    this.color.copy(source.color);
    this.emissive.copy(source.emissive);
    this.emissiveIntensity = source.emissiveIntensity;
    this.map = source.map;
    this.gradientMap = source.gradientMap;
    return this;
  }

  /** Serializes common state, color, and optional texture references. */
  override toJSON(): ToonMaterialJSON {
    assertFiniteColor(this.color);
    const json: ToonMaterialJSON = {
      ...super.toJSON(),
      color: this.color.hex,
      emissive: this.emissive.hex,
    };
    if (this.emissiveIntensity !== 1) {
      json.emissiveIntensity = this.emissiveIntensity;
    }
    if (this.map !== undefined) json.map = this.map.uuid;
    if (this.gradientMap !== undefined) {
      json.gradientMap = this.gradientMap.uuid;
    }
    return json;
  }
}
