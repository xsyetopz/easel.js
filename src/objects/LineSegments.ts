import { Attribute } from "../geometry/Attribute.ts";
import type { Geometry } from "../geometry/Geometry.ts";
import type { LineMaterial } from "../materials/LineMaterial.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Line } from "./Line.ts";

const _segmentStart = new Vector3();
const _segmentEnd = new Vector3();

/** Line geometry interpreted as independent pairs of vertices. */
export class LineSegments extends Line {
  /** Serialization discriminator for this runtime type. */
  override type: string = "LineSegments";

  /** Type guard identifying this concrete object type. */
  get isLineSegments(): true {
    return true;
  }

  /** Constructs a line object whose vertices are consumed in pairs. */
  constructor(
    geometry: Geometry | undefined = void 0,
    material: LineMaterial | undefined = void 0,
  ) {
    super(geometry, material);
  }

  /** Computes per-segment cumulative distances for non-indexed vertices. */
  override computeLineDistances(): this {
    const geometry = this.geometry;
    const position = geometry?.getAttribute("position");
    if (geometry === undefined || position === undefined || geometry.index) {
      return this;
    }

    const lineDistances = new Float32Array(position.count);
    for (let index = 0; index + 1 < position.count; index += 2) {
      _segmentStart.set(
        position.getX(index),
        position.getY(index),
        position.getZ(index),
      );
      _segmentEnd.set(
        position.getX(index + 1),
        position.getY(index + 1),
        position.getZ(index + 1),
      );
      lineDistances[index + 1] =
        lineDistances[index] + _segmentStart.distanceTo(_segmentEnd);
      if (index + 2 < position.count) {
        lineDistances[index + 2] = lineDistances[index + 1];
      }
    }
    geometry.setAttribute("lineDistance", new Attribute(lineDistances, 1));
    return this;
  }

  /** Returns an independent copy with cloned mutable state. */
  override clone(): LineSegments {
    return new LineSegments(this.geometry, this.material).copy(this);
  }
}
