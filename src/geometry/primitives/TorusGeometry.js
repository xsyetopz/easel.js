import { Geometry } from "../Geometry.js";

/**
 * Torus geometry.
 */
export class TorusGeometry extends Geometry {
	/**
	 * @param {number} [radius=1]
	 * @param {number} [tube=0.4]
	 * @param {number} [radialSegments=12]
	 * @param {number} [tubularSegments=48]
	 * @param {number} [arc=Math.PI*2]
	 */
	constructor(
		radius = 1,
		tube = 0.4,
		radialSegments = 12,
		tubularSegments = 48,
		arc = Math.PI * 2,
	) {
		super();

		this.type = "TorusGeometry";
		this.parameters = { radius, tube, radialSegments, tubularSegments, arc };

		const rs = Math.floor(radialSegments);
		const ts = Math.floor(tubularSegments);

		const positions = [];
		const normals = [];
		const uvs = [];
		const indices = [];

		for (let j = 0; j <= rs; j++) {
			for (let i = 0; i <= ts; i++) {
				const u = (i / ts) * arc;
				const v = (j / rs) * Math.PI * 2;

				const cosU = Math.cos(u);
				const sinU = Math.sin(u);
				const cosV = Math.cos(v);
				const sinV = Math.sin(v);

				const px = (radius + tube * cosV) * cosU;
				const py = (radius + tube * cosV) * sinU;
				const pz = tube * sinV;

				positions.push(px, py, pz);

				const cx = radius * cosU;
				const cy = radius * sinU;
				const nx = (px - cx) / tube;
				const ny = (py - cy) / tube;
				const nz = pz / tube;
				normals.push(nx, ny, nz);

				uvs.push(i / ts, j / rs);
			}
		}

		for (let j = 1; j <= rs; j++) {
			for (let i = 1; i <= ts; i++) {
				const a = (ts + 1) * j + i - 1;
				const b = (ts + 1) * (j - 1) + i - 1;
				const c = (ts + 1) * (j - 1) + i;
				const d = (ts + 1) * j + i;
				indices.push(a, b, d);
				indices.push(b, c, d);
			}
		}

		const vertexCount = (rs + 1) * (ts + 1);
		const IndexArray = vertexCount > 65535 ? Uint32Array : Uint16Array;

		this.setPositions(new Float32Array(positions));
		this.setNormals(new Float32Array(normals));
		this.setUVs(new Float32Array(uvs));
		this.setIndex(new IndexArray(indices));
	}
}
