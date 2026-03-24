import { earcut } from "../../math/Earcut.ts";
import { Geometry } from "../Geometry.js";

/**
 * @typedef {{
 *   depth?: number,
 *   steps?: number,
 *   bevelEnabled?: boolean,
 *   bevelThickness?: number,
 *   bevelSize?: number,
 *   bevelSegments?: number,
 * }} ExtrudeOptions
 */

/**
 * Extrudes one or more Shape objects along the Z axis.
 * Generates front face, back face, and side walls.
 * Bevel is not implemented.
 */
export class ExtrudeGeometry extends Geometry {
	/**
	 * @param {*|*[]} shapes
	 * @param {ExtrudeOptions} [options]
	 */
	constructor(shapes, options = {}) {
		super();

		this.type = "ExtrudeGeometry";
		/** @type {Record<string, unknown>} */
		this.parameters = { shapes, options };

		const depth = options.depth ?? 1;
		const steps = Math.max(1, options.steps ?? 1);

		const shapeArray = Array.isArray(shapes) ? shapes : [shapes];

		/** @type {number[]} */
		const positions = [];
		/** @type {number[]} */
		const normals = [];
		/** @type {number[]} */
		const uvs = [];
		/** @type {number[]} */
		const indices = [];

		let vertexOffset = 0;

		for (const shape of shapeArray) {
			const { shape: shapePoints, holes } = shape.extractPoints(12);

			/** @type {number[]} */
			const flatCoords = [];
			/** @type {number[]} */
			const holeIndices = [];

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

			const vertexCount = flatCoords.length / 2;

			// Front face at z=0 (CCW winding → normal faces -Z)
			for (let i = 0; i < vertexCount; i++) {
				positions.push(flatCoords[i * 2], flatCoords[i * 2 + 1], 0);
				normals.push(0, 0, -1);
				uvs.push(flatCoords[i * 2], flatCoords[i * 2 + 1]);
			}
			for (const idx of faceIndices) {
				indices.push(vertexOffset + idx);
			}
			vertexOffset += vertexCount;

			// Back face at z=depth (reversed winding → normal faces +Z)
			for (let i = 0; i < vertexCount; i++) {
				positions.push(flatCoords[i * 2], flatCoords[i * 2 + 1], depth);
				normals.push(0, 0, 1);
				uvs.push(flatCoords[i * 2], flatCoords[i * 2 + 1]);
			}
			for (let i = 0; i < faceIndices.length; i += 3) {
				// Reverse triangle winding
				indices.push(
					vertexOffset + faceIndices[i],
					vertexOffset + faceIndices[i + 2],
					vertexOffset + faceIndices[i + 1],
				);
			}
			vertexOffset += vertexCount;

			// Side walls along the outer contour and each hole contour
			const contours = [shapePoints, ...holes];
			for (const contour of contours) {
				const contourLen = contour.length;
				for (let s = 0; s < steps; s++) {
					const z0 = (s / steps) * depth;
					const z1 = ((s + 1) / steps) * depth;

					for (let i = 0; i < contourLen; i++) {
						const next = (i + 1) % contourLen;
						const ax = contour[i].x;
						const ay = contour[i].y;
						const bx = contour[next].x;
						const by = contour[next].y;

						// Edge tangent and outward normal in XY
						const tx = bx - ax;
						const ty = by - ay;
						const len = Math.sqrt(tx * tx + ty * ty);
						const nx = len > 0 ? ty / len : 0;
						const ny = len > 0 ? -tx / len : 1;

						const uA = i / contourLen;
						const uB = (i + 1) / contourLen;
						const v0 = s / steps;
						const v1 = (s + 1) / steps;

						// Four corner vertices of the quad
						const base = vertexOffset;

						positions.push(ax, ay, z0);
						normals.push(nx, ny, 0);
						uvs.push(uA, v0);
						positions.push(bx, by, z0);
						normals.push(nx, ny, 0);
						uvs.push(uB, v0);
						positions.push(bx, by, z1);
						normals.push(nx, ny, 0);
						uvs.push(uB, v1);
						positions.push(ax, ay, z1);
						normals.push(nx, ny, 0);
						uvs.push(uA, v1);

						indices.push(base, base + 1, base + 2);
						indices.push(base, base + 2, base + 3);

						vertexOffset += 4;
					}
				}
			}
		}

		const IndexArray = vertexOffset > 65535 ? Uint32Array : Uint16Array;

		this.setPositions(new Float32Array(positions));
		this.setNormals(new Float32Array(normals));
		this.setUVs(new Float32Array(uvs));
		this.setIndex(new IndexArray(indices));
		this.computeBoundingSphere();
	}
}
