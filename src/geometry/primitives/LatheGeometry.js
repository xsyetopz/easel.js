import { Geometry } from "../Geometry.js";

/**
 * Lathe geometry - revolves an array of Vector2 points around the Y axis.
 */
export class LatheGeometry extends Geometry {
	/**
	 * @param {import('../../math/Vector2.js').Vector2[]} points Array of 2D points (x=radius, y=height).
	 * @param {number} [segments=12]
	 * @param {number} [phiStart=0]
	 * @param {number} [phiLength=Math.PI*2]
	 */
	constructor(points, segments = 12, phiStart = 0, phiLength = Math.PI * 2) {
		super();

		this.type = "LatheGeometry";
		/** @type {Record<string, unknown>} */
		this.parameters = { points, segments, phiStart, phiLength };

		const seg = Math.floor(segments);
		const positions = [];
		const normals = [];
		const uvs = [];
		const indices = [];

		const inversePointCount = 1 / (points.length - 1);
		const inverseSegments = 1 / seg;

		// Build vertex grid
		const grid = [];
		let index = 0;

		for (let i = 0; i < points.length; i++) {
			const row = [];
			const t = i * inversePointCount;
			for (let s = 0; s <= seg; s++) {
				const phi = phiStart + s * inverseSegments * phiLength;
				const sin = Math.sin(phi);
				const cos = Math.cos(phi);
				const px = points[i].x * sin;
				const py = points[i].y;
				const pz = points[i].x * cos;
				positions.push(px, py, pz);
				uvs.push(s * inverseSegments, t);
				row.push(index++);
			}
			grid.push(row);
		}

		// Compute normals from tangents
		for (let i = 0; i < points.length; i++) {
			for (let s = 0; s <= seg; s++) {
				const ip = Math.min(i + 1, points.length - 1);
				const im = Math.max(i - 1, 0);
				const tx = points[ip].x - points[im].x;
				const ty = points[ip].y - points[im].y;
				const phi = phiStart + s * inverseSegments * phiLength;
				const sin = Math.sin(phi);
				const cos = Math.cos(phi);
				const nx = ty * cos;
				const ny = -tx;
				const nz = ty * sin;
				const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
				if (len > 0) {
					normals.push(nx / len, ny / len, nz / len);
				} else {
					normals.push(0, 1, 0);
				}
			}
		}

		// Indices
		for (let i = 0; i < points.length - 1; i++) {
			for (let s = 0; s < seg; s++) {
				const a = grid[i][s];
				const b = grid[i + 1][s];
				const c = grid[i + 1][s + 1];
				const d = grid[i][s + 1];
				indices.push(a, b, d);
				indices.push(b, c, d);
			}
		}

		const IndexArray = index > 65535 ? Uint32Array : Uint16Array;

		this.setPositions(new Float32Array(positions));
		this.setNormals(new Float32Array(normals));
		this.setUVs(new Float32Array(uvs));
		this.setIndex(new IndexArray(indices));
	}
}
