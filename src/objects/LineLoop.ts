import type { Geometry } from "../geometry/Geometry.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import { Line } from "./Line.ts";

/** Polyline that adds a segment from its final vertex back to its first. */
export class LineLoop extends Line {
  /** Serialization discriminator for this runtime type. */
  override type: string = "LineLoop";

  /** Type guard identifying this concrete object type. */
  get isLineLoop(): true {
    return true;
  }

  /** Constructs a closed line-loop object. */
  constructor(
    geometry: Geometry | undefined = void 0,
    material: LineMaterial | undefined = void 0,
  ) {
    super(geometry, material);
  }

  /** Returns an independent copy with cloned mutable state. */
  override clone(): LineLoop {
    return new LineLoop(this.geometry, this.material).copy(this);
  }
}
