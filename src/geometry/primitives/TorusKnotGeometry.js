import { Geometry } from "../Geometry.js";

/**
 * Torus knot geometry.
 */
export class TorusKnotGeometry extends Geometry {
	/**
	 * @param {number} [radius=1]
	 * @param {number} [tube=0.4]
	 * @param {number} [tubularSegments=64]
	 * @param {number} [radialSegments=8]
	 * @param {number} [p=2]
	 * @param {number} [q=3]
	 */
	constructor(
		radius = 1,
		tube = 0.4,
		tubularSegments = 64,
		radialSegments = 8,
		p = 2,
		q = 3,
	) {
		super();

		this.type = "TorusKnotGeometry";
		this.parameters = { radius, tube, tubularSegments, radialSegments, p, q };

		const ts = Math.floor(tubularSegments);
		const rs = Math.floor(radialSegments);

		/** @type {number[]} */
		const positions = [];
		/** @type {number[]} */
		const normals = [];
		/** @type {number[]} */
		const uvs = [];
		/** @type {number[]} */
		const indices = [];

		/** @type {number[]} */
		const P1 = [];
		/** @type {number[]} */
		const P2 = [];

		for (let i = 0; i <= ts; i++) {
			const u = (i / ts) * p * Math.PI * 2;
			computePoint(u, P1);
			computePoint(u + 0.01, P2);

			const Tx = P2[0] - P1[0];
			const Ty = P2[1] - P1[1];
			const Tz = P2[2] - P1[2];

			// N = -normalize(P1 + P2) - points away from center of curvature
			let Nx = -(P1[0] + P2[0]);
			let Ny = -(P1[1] + P2[1]);
			let Nz = -(P1[2] + P2[2]);
			let Nlen = Math.sqrt(Nx * Nx + Ny * Ny + Nz * Nz) || 1;
			Nx /= Nlen;
			Ny /= Nlen;
			Nz /= Nlen;

			// B = normalize(T x N)
			let Bx = Ty * Nz - Tz * Ny;
			let By = Tz * Nx - Tx * Nz;
			let Bz = Tx * Ny - Ty * Nx;
			const Blen = Math.sqrt(Bx * Bx + By * By + Bz * Bz) || 1;
			Bx /= Blen;
			By /= Blen;
			Bz /= Blen;

			// Re-orthogonalize N = B x T (already unit-ish)
			Nx = By * Tz - Bz * Ty;
			Ny = Bz * Tx - Bx * Tz;
			Nz = Bx * Ty - By * Tx;
			Nlen = Math.sqrt(Nx * Nx + Ny * Ny + Nz * Nz) || 1;
			Nx /= Nlen;
			Ny /= Nlen;
			Nz /= Nlen;

			for (let j = 0; j <= rs; j++) {
				const v = (j / rs) * Math.PI * 2;
				const cosV = Math.cos(v);
				const sinV = Math.sin(v);

				const nx = cosV * Nx + sinV * Bx;
				const ny = cosV * Ny + sinV * By;
				const nz = cosV * Nz + sinV * Bz;

				positions.push(P1[0] + tube * nx, P1[1] + tube * ny, P1[2] + tube * nz);
				normals.push(nx, ny, nz);
				uvs.push(i / ts, j / rs);
			}
		}

		for (let i = 1; i <= ts; i++) {
			for (let j = 1; j <= rs; j++) {
				const a = (rs + 1) * (i - 1) + (j - 1);
				const b = (rs + 1) * i + (j - 1);
				const c = (rs + 1) * i + j;
				const d = (rs + 1) * (i - 1) + j;
				indices.push(a, d, b);
				indices.push(b, d, c);
			}
		}

		const vertexCount = (ts + 1) * (rs + 1);
		const IndexArray = vertexCount > 65535 ? Uint32Array : Uint16Array;

		this.setPositions(new Float32Array(positions));
		this.setNormals(new Float32Array(normals));
		this.setUVs(new Float32Array(uvs));
		this.setIndex(new IndexArray(indices));

		/**
		 * @param {number} u
		 * @param {number[]} out
		 */
		function computePoint(u, out) {
			const quOverP = q / p;
			const cs = Math.cos(u);
			const sn = Math.sin(u);
			const r = 0.5 * (2 + Math.cos(quOverP * u));
			out[0] = r * cs * radius;
			out[1] = r * sn * radius;
			out[2] = Math.sin(quOverP * u) * radius * 0.5;
		}
	}
}
