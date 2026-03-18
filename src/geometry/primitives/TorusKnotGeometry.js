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

			// normal via rotation minimizing frame (simple approximation: B = T x N, N = T x up)
			let Nx = Ty * 0 - Tz * 1;
			let Ny = Tz * 0 - Tx * 0;
			let Nz = Tx * 1 - Ty * 0;
			let Nlen = Math.sqrt(Nx * Nx + Ny * Ny + Nz * Nz);
			if (Nlen === 0) {
				Nx = 1;
				Ny = 0;
				Nz = 0;
				Nlen = 1;
			}
			Nx /= Nlen;
			Ny /= Nlen;
			Nz /= Nlen;

			const Bx = Ty * Nz - Tz * Ny;
			const By = Tz * Nx - Tx * Nz;
			const Bz = Tx * Ny - Ty * Nx;
			const Blen = Math.sqrt(Bx * Bx + By * By + Bz * Bz);
			const Bnx = Bx / Blen;
			const Bny = By / Blen;
			const Bnz = Bz / Blen;

			for (let j = 0; j <= rs; j++) {
				const v = (j / rs) * Math.PI * 2;
				const cosV = Math.cos(v);
				const sinV = Math.sin(v);

				const nx = cosV * Nx + sinV * Bnx;
				const ny = cosV * Ny + sinV * Bny;
				const nz = cosV * Nz + sinV * Bnz;

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
				indices.push(a, b, d);
				indices.push(b, c, d);
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
			out[2] = -Math.sin(quOverP * u) * radius;
		}
	}
}
