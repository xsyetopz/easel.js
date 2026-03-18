import { Geometry } from "../Geometry.js";

/**
 * Base class for platonic solid geometries. Subdivides faces by detail level
 * and projects all vertices onto a sphere of the given radius.
 */
export class PolyhedronGeometry extends Geometry {
	/**
	 * @param {number[]} vertices Flat array of xyz vertex positions.
	 * @param {number[]} indices Triangle index list (3 indices per face).
	 * @param {number} [radius=1]
	 * @param {number} [detail=0] Subdivision level (0 = no subdivision).
	 */
	constructor(vertices, indices, radius = 1, detail = 0) {
		super();

		this.type = "PolyhedronGeometry";
		/** @type {Record<string, unknown>} */
		this.parameters = { vertices, indices, radius, detail };

		/** @type {number[]} */
		const positions = [];
		/** @type {number[]} */
		const normals = [];
		/** @type {number[]} */
		const uvs = [];

		// Build initial triangles from flat vertex/index arrays
		for (let i = 0; i < indices.length; i += 3) {
			const ax = vertices[indices[i] * 3];
			const ay = vertices[indices[i] * 3 + 1];
			const az = vertices[indices[i] * 3 + 2];
			const bx = vertices[indices[i + 1] * 3];
			const by = vertices[indices[i + 1] * 3 + 1];
			const bz = vertices[indices[i + 1] * 3 + 2];
			const cx = vertices[indices[i + 2] * 3];
			const cy = vertices[indices[i + 2] * 3 + 1];
			const cz = vertices[indices[i + 2] * 3 + 2];

			subdivide([ax, ay, az], [bx, by, bz], [cx, cy, cz], detail, positions);
		}

		// Project onto sphere and compute normals/uvs
		for (let i = 0; i < positions.length; i += 3) {
			const x = positions[i];
			const y = positions[i + 1];
			const z = positions[i + 2];
			const len = Math.sqrt(x * x + y * y + z * z);
			const nx = x / len;
			const ny = y / len;
			const nz = z / len;

			positions[i] = nx * radius;
			positions[i + 1] = ny * radius;
			positions[i + 2] = nz * radius;

			normals.push(nx, ny, nz);

			const u = 0.5 + Math.atan2(nz, nx) / (2 * Math.PI);
			const v = 0.5 - Math.asin(ny) / Math.PI;
			uvs.push(u, v);
		}

		this.setPositions(new Float32Array(positions));
		this.setNormals(new Float32Array(normals));
		this.setUVs(new Float32Array(uvs));
	}
}

/**
 * Recursively subdivide a triangle into 4^detail sub-triangles.
 * @param {number[]} a
 * @param {number[]} b
 * @param {number[]} c
 * @param {number} detail
 * @param {number[]} out
 */
function subdivide(a, b, c, detail, out) {
	if (detail === 0) {
		out.push(...a, ...b, ...c);
		return;
	}

	const ab = midpoint(a, b);
	const bc = midpoint(b, c);
	const ca = midpoint(c, a);

	subdivide(a, ab, ca, detail - 1, out);
	subdivide(b, bc, ab, detail - 1, out);
	subdivide(c, ca, bc, detail - 1, out);
	subdivide(ab, bc, ca, detail - 1, out);
}

/**
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number[]}
 */
function midpoint(a, b) {
	return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}
