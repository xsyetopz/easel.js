import type { Shape } from "../../curves/Shape.ts";
import { earcut } from "../../math/Earcut.ts";
import { Geometry } from "../Geometry.ts";

/** Triangulates one or more flat Shape objects into a filled 2D geometry on the XY plane. */
export class ShapeGeometry extends Geometry {
	constructor(shapes: Shape | Shape[], curveSegments = 12) {
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
			const holeIndices: number[] = [];

			for (const pt of shapePoints) {
				flatCoords.push(pt.x, pt.y);
			}

			for (const hole of holes) {
				holeIndices.push(flatCoords.length / 2);
				for (const pt of hole) {
					flatCoords.push(pt.x, pt.y);
				}
			}

			const faceIndices = earcut(
				flatCoords,
				holeIndices.length > 0 ? holeIndices : undefined,
				2,
			);

			// Emit vertices
			const vertexCount = flatCoords.length / 2;
			for (let i = 0; i < vertexCount; i++) {
				positions.push(flatCoords[i * 2], flatCoords[i * 2 + 1], 0);
				normals.push(0, 0, 1);
				uvs.push(flatCoords[i * 2], flatCoords[i * 2 + 1]);
			}

			for (const idx of faceIndices) {
				indices.push(vertexOffset + idx);
			}

			vertexOffset += vertexCount;
		}

		const IndexArray = vertexOffset > 65535 ? Uint32Array : Uint16Array;

		this.setPositions(new Float32Array(positions));
		this.setNormals(new Float32Array(normals));
		this.setUVs(new Float32Array(uvs));
		this.setIndex(new IndexArray(indices));
		this.computeBoundingSphere();
	}
}
