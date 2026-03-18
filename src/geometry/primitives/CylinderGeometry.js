import { Geometry } from "../Geometry.js";

/**
 * Cylinder (or truncated cone) geometry with optional caps.
 */
export class CylinderGeometry extends Geometry {
	/**
	 * @param {number} [radiusTop=1]
	 * @param {number} [radiusBottom=1]
	 * @param {number} [height=1]
	 * @param {number} [radialSegments=32]
	 * @param {number} [heightSegments=1]
	 * @param {boolean} [openEnded=false]
	 * @param {number} [thetaStart=0]
	 * @param {number} [thetaLength=Math.PI*2]
	 */
	constructor(
		radiusTop = 1,
		radiusBottom = 1,
		height = 1,
		radialSegments = 32,
		heightSegments = 1,
		openEnded = false,
		thetaStart = 0,
		thetaLength = Math.PI * 2,
	) {
		super();

		this.type = "CylinderGeometry";
		/** @type {Record<string, unknown>} */
		this.parameters = {
			radiusTop,
			radiusBottom,
			height,
			radialSegments,
			heightSegments,
			openEnded,
			thetaStart,
			thetaLength,
		};

		const rs = Math.floor(radialSegments);
		const hs = Math.floor(heightSegments);

		const positions = [];
		const normals = [];
		const uvs = [];
		const indices = [];

		let index = 0;
		const indexArray = [];

		// torso
		const slope = (radiusBottom - radiusTop) / height;
		const halfHeight = height / 2;

		for (let y = 0; y <= hs; y++) {
			const row = [];
			const v = y / hs;
			const radius = v * (radiusBottom - radiusTop) + radiusTop;

			for (let x = 0; x <= rs; x++) {
				const u = x / rs;
				const theta = u * thetaLength + thetaStart;
				const sinTheta = Math.sin(theta);
				const cosTheta = Math.cos(theta);

				positions.push(
					radius * sinTheta,
					-v * height + halfHeight,
					radius * cosTheta,
				);

				const nx = sinTheta;
				const ny = slope;
				const nz = cosTheta;
				const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
				normals.push(nx / len, ny / len, nz / len);

				uvs.push(u, 1 - v);
				row.push(index++);
			}
			indexArray.push(row);
		}

		for (let x = 0; x < rs; x++) {
			for (let y = 0; y < hs; y++) {
				const a = indexArray[y][x];
				const b = indexArray[y + 1][x];
				const c = indexArray[y + 1][x + 1];
				const d = indexArray[y][x + 1];
				indices.push(a, b, d);
				indices.push(b, c, d);
			}
		}

		// caps
		if (!openEnded) {
			buildCap(true);
			buildCap(false);
		}

		/**
		 * @param {boolean} top
		 */
		function buildCap(top) {
			const radius = top ? radiusTop : radiusBottom;
			if (radius === 0) return;

			const sign = top ? 1 : -1;
			const centerY = sign * halfHeight;
			const centerIndex = index;

			positions.push(0, centerY, 0);
			normals.push(0, sign, 0);
			uvs.push(0.5, 0.5);
			index++;

			for (let x = 0; x <= rs; x++) {
				const u = x / rs;
				const theta = u * thetaLength + thetaStart;
				const cosTheta = Math.cos(theta);
				const sinTheta = Math.sin(theta);

				positions.push(radius * sinTheta, centerY, radius * cosTheta);
				normals.push(0, sign, 0);
				uvs.push(cosTheta * 0.5 + 0.5, sinTheta * 0.5 * sign + 0.5);
				index++;
			}

			for (let x = 0; x < rs; x++) {
				const first = centerIndex + x + 1;
				const second = centerIndex + x + 2;
				if (top) {
					indices.push(second, first, centerIndex);
				} else {
					indices.push(centerIndex, first, second);
				}
			}
		}

		const IndexArray = index > 65535 ? Uint32Array : Uint16Array;

		this.setPositions(new Float32Array(positions));
		this.setNormals(new Float32Array(normals));
		this.setUVs(new Float32Array(uvs));
		this.setIndex(new IndexArray(indices));
	}
}
