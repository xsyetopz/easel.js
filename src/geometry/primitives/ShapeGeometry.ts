import type { Shape } from "../../curves/Shape.ts";
import { triangulateShape } from "../../math/ShapeUtils.ts";
import { Geometry } from "../Geometry.ts";

/** Triangulates flat `Shape` contours into filled XY-plane geometry. */
export class ShapeGeometry extends Geometry {
  /** Triangulates one or more `Shape` contours on the XY plane. */
  constructor(shapes: Shape | Shape[], curveSegments: number = 12) {
    super();

    this.type = "ShapeGeometry";
    this.parameters = { shapes, curveSegments } as Record<string, unknown>;

    const shapeArray = Array.isArray(shapes) ? shapes : [shapes];

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    let vertexOffset = 0;

    for (const shape of shapeArray) {
      const { shape: shapePoints, holes } = shape.extractPoints(curveSegments);

      // Flat vertex list: outer contour + all hole contours
      const flatCoords: number[] = [];
      for (const pt of shapePoints) {
        flatCoords.push(pt.x, pt.y);
      }

      for (const hole of holes) {
        for (const pt of hole) {
          flatCoords.push(pt.x, pt.y);
        }
      }

      const faces = triangulateShape(shapePoints, holes);

      // Emit vertices
      const vertexCount = flatCoords.length / 2;
      for (let i = 0; i < vertexCount; i++) {
        positions.push(flatCoords[i * 2], flatCoords[i * 2 + 1], 0);
        normals.push(0, 0, 1);
        uvs.push(flatCoords[i * 2], flatCoords[i * 2 + 1]);
      }

      for (const face of faces) {
        indices.push(
          vertexOffset + face[0],
          vertexOffset + face[1],
          vertexOffset + face[2],
        );
      }

      vertexOffset += vertexCount;
    }

    const IndexArray = vertexOffset > 65535 ? Uint32Array : Uint16Array;

    this.setPositions(new Float32Array(positions));
    this.setNormals(new Float32Array(normals));
    this.setUVs(new Float32Array(uvs));
    this.index = new IndexArray(indices);
    this.computeBoundingSphere();
  }
}
