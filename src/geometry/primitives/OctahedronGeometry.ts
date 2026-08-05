import { PolyhedronGeometry } from "./PolyhedronGeometry.ts";

const _vertices = [1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1];

const _indices = [
  0, 2, 4, 0, 4, 3, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 3, 1, 3, 4, 1, 4, 2,
];

/** Octahedron projected onto a sphere by `PolyhedronGeometry`. */
export class OctahedronGeometry extends PolyhedronGeometry {
  /** Constructs an octahedron projected to the requested radius and detail level. */
  constructor(radius: number = 1, detail: number = 0) {
    super(_vertices, _indices, radius, detail);
    this.type = "OctahedronGeometry";
    this.parameters = { radius, detail };
  }
}
