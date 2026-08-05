import { PolyhedronGeometry } from "./PolyhedronGeometry.ts";

const _vertices = [1, 1, 1, -1, -1, 1, -1, 1, -1, 1, -1, -1];

const _indices = [2, 1, 0, 0, 3, 2, 1, 3, 0, 2, 3, 1];

/** Tetrahedron projected onto a sphere by `PolyhedronGeometry`. */
export class TetrahedronGeometry extends PolyhedronGeometry {
  /** Constructs a tetrahedron projected to the requested radius and detail level. */
  constructor(radius: number = 1, detail: number = 0) {
    super(_vertices, _indices, radius, detail);
    this.type = "TetrahedronGeometry";
    this.parameters = { radius, detail };
  }
}
