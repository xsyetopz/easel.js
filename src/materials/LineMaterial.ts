import { Color } from "../math/Color.ts";
import { Material } from "./Material.ts";

interface LineMaterialOptions {
  color?: Color | number | string;
  linewidth?: number;
  layer?: number;
  opacity?: number;
  transparent?: boolean;
  depthTest?: boolean;
  depthWrite?: boolean;
}

/** For Line, LineSegments, LineLoop. Rendered via Bresenham integer line. */
export class LineMaterial extends Material {
  override type = "LineMaterial";

  color: Color;

  linewidth = 1;

  constructor(options: LineMaterialOptions = {}) {
    super(options);
    this.color =
      options.color instanceof Color
        ? options.color
        : new Color(options.color ?? 0xffffff);
    if (options.linewidth !== undefined) this.linewidth = options.linewidth;
  }

  override clone(): LineMaterial {
    return new LineMaterial().copy(this);
  }

  override copy(source: LineMaterial): this {
    super.copy(source);
    this.color.copy(source.color);
    this.linewidth = source.linewidth;
    return this;
  }
}
