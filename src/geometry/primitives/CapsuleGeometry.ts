import { Vector2 } from "../../math/Vector2.ts";
import { LatheGeometry } from "./LatheGeometry.ts";

/** Capsule formed by revolving a hemisphere–cylinder–hemisphere profile. */
export class CapsuleGeometry extends LatheGeometry {
  /** Constructs a capsule from cylindrical length, cap radius, and radial subdivisions. */
  constructor(
    radius: number = 1,
    length: number = 1,
    capSegments: number = 4,
    radialSegments: number = 8,
  ) {
    const path: Vector2[] = [];
    const halfLength = length / 2;

    // bottom hemisphere (south pole -> equator)
    for (let i = capSegments; i >= 0; i--) {
      const angle = (Math.PI / 2) * (i / capSegments);
      path.push(
        new Vector2(
          Math.cos(angle) * radius,
          -halfLength - Math.sin(angle) * radius,
        ),
      );
    }

    // top hemisphere (equator -> north pole)
    for (let i = 0; i <= capSegments; i++) {
      const angle = (Math.PI / 2) * (i / capSegments);
      path.push(
        new Vector2(
          Math.cos(angle) * radius,
          halfLength + Math.sin(angle) * radius,
        ),
      );
    }

    super(path, radialSegments);

    this.type = "CapsuleGeometry";
    this.parameters = { radius, length, capSegments, radialSegments };
  }
}
