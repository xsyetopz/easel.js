import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { LineSegments } from "../objects/LineSegments.ts";

/** Displays the three coordinate axes as RGB lines. */
export class AxesHelper extends LineSegments {
  override type = "AxesHelper";

  constructor(size = 1) {
    const geometry = new Geometry();

    geometry.setAttribute(
      "position",
      new Attribute(
        new Float32Array([
          0,
          0,
          0,
          size,
          0,
          0,
          0,
          0,
          0,
          0,
          size,
          0,
          0,
          0,
          0,
          0,
          0,
          size,
        ]),
        3,
      ),
    );

    geometry.setAttribute(
      "color",
      new Attribute(
        new Float32Array([
          1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1,
        ]),
        3,
      ),
    );

    super(geometry);
  }

  dispose(): void {
    this.geometry?.dispose();
  }
}
