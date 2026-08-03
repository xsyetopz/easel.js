import { Node } from "../core/Node.ts";
import type { Geometry } from "../geometry/Geometry.ts";
import type { Material } from "../materials/Material.ts";

/** Polyline rendered as connected line segments. */
export class Line extends Node {
  override type = "Line";

  geometry: Geometry | undefined;

  material: Material | undefined;

  constructor(
    geometry: Geometry | undefined = void 0,
    material: Material | undefined = void 0,
  ) {
    super();
    this.geometry = geometry;
    this.material = material;
  }

  override clone(): Line {
    return new Line(this.geometry, this.material).copy(this);
  }

  override copy(source: Line, recursive = true): this {
    super.copy(source, recursive);
    this.geometry = source.geometry;
    this.material = source.material;
    return this;
  }
}
