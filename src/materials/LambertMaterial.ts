import { Shading } from "../core/Constants.ts";
import { Color } from "../math/Color.ts";
import type { Texture } from "../textures/Texture.ts";
import { Material } from "./Material.ts";

interface LambertMaterialOptions {
  color?: Color | number | string;
  map?: Texture | undefined;
  layer?: number;
  opacity?: number;
  transparent?: boolean;
  depthTest?: boolean;
  depthWrite?: boolean;
  shading?: number;
  side?: number;
}

/**
 * Diffuse lighting from all lights in scene. Defaults to Gouraud shading -
 * per-vertex lighting interpolated across faces.
 */
export class LambertMaterial extends Material {
  override type = "LambertMaterial";

  color: Color;

  map: Texture | undefined = undefined;

  constructor(options: LambertMaterialOptions = {}) {
    super(options);
    this.shading = options.shading ?? Shading.Gouraud;
    this.color =
      options.color instanceof Color
        ? options.color
        : new Color(options.color ?? 0xffffff);
    if (options.map !== undefined) this.map = options.map;
  }

  override clone(): LambertMaterial {
    return new LambertMaterial().copy(this);
  }

  override copy(source: LambertMaterial): this {
    super.copy(source);
    this.color.copy(source.color);
    this.map = source.map;
    return this;
  }
}
