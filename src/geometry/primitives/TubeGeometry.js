import { Vector3 } from "../../math/Vector3.ts";
import { Geometry } from "../Geometry.js";

/**
 * Generates a tube that extrudes along a 3D curve path using
 * rotation-minimizing frames to avoid unnecessary twisting.
 */
export class TubeGeometry extends Geometry {
	/**
	 * @param {import("../../curves/Curve.js").Curve} path
	 * @param {number} [tubularSegments=64]
	 * @param {number} [radius=1]
	 * @param {number} [radialSegments=8]
	 * @param {boolean} [closed=false]
	 */
	constructor(
		path,
		tubularSegments = 64,
		radius = 1,
		radialSegments = 8,
		closed = false,
	) {
		super();

		this.type = "TubeGeometry";
		/** @type {Record<string, unknown>} */
		this.parameters = { path, tubularSegments, radius, radialSegments, closed };

		const segCount = tubularSegments;

		// Sample points and tangents along the curve
		/** @type {Vector3[]} */
		const frameCenters = [];
		/** @type {Vector3[]} */
		const frameTangents = [];

		const sampleCount = closed ? segCount : segCount + 1;
		for (let i = 0; i < sampleCount; i++) {
			const u = i / segCount;
			const pt = path.getPointAt(u);
			const tan = path.getTangentAt(u);
			frameCenters.push(new Vector3(pt.x, pt.y, pt.z ?? 0));
			frameTangents.push(new Vector3(tan.x, tan.y, tan.z ?? 0).normalize());
		}

		// Rotation-minimizing frames
		/** @type {Vector3[]} */
		const frameNormals = [];
		/** @type {Vector3[]} */
		const frameBinormals = [];

		// Bootstrap initial frame: find a vector not parallel to the first tangent
		const t0 = frameTangents[0];
		const init =
			Math.abs(t0.x) > 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
		const n0 = new Vector3()
			.copy(init)
			.sub(t0.clone().mulScalar(t0.dot(init)))
			.normalize();
		frameNormals.push(n0);
		frameBinormals.push(new Vector3().copy(t0).cross(n0).normalize());

		for (let i = 1; i < sampleCount; i++) {
			const tPrev = frameTangents[i - 1];
			const tCurr = frameTangents[i];
			const nPrev = frameNormals[i - 1];

			// Reflect nPrev across the bisecting plane of tPrev and tCurr
			const v1 = frameCenters[i].clone().sub(frameCenters[i - 1]);
			const c1 = v1.dot(v1);
			const nL =
				c1 > 0
					? nPrev.clone().sub(v1.clone().mulScalar((2 / c1) * v1.dot(nPrev)))
					: nPrev.clone();
			const tL =
				c1 > 0
					? tPrev.clone().sub(v1.clone().mulScalar((2 / c1) * v1.dot(tPrev)))
					: tPrev.clone();

			const v2 = tCurr.clone().sub(tL);
			const c2 = v2.dot(v2);
			const nCurr =
				c2 > 0
					? nL.clone().sub(v2.clone().mulScalar((2 / c2) * v2.dot(nL)))
					: nL.clone();

			frameNormals.push(nCurr.normalize());
			frameBinormals.push(new Vector3().copy(tCurr).cross(nCurr).normalize());
		}

		/** @type {number[]} */
		const positions = [];
		/** @type {number[]} */
		const normals = [];
		/** @type {number[]} */
		const uvs = [];
		/** @type {number[]} */
		const indices = [];

		// Build vertex rings
		for (let i = 0; i < sampleCount; i++) {
			const center = frameCenters[i];
			const normal = frameNormals[i];
			const binormal = frameBinormals[i];
			const uTube = i / segCount;

			for (let j = 0; j <= radialSegments; j++) {
				const theta = (j / radialSegments) * Math.PI * 2;
				const cosT = Math.cos(theta);
				const sinT = Math.sin(theta);

				const vx = cosT * normal.x + sinT * binormal.x;
				const vy = cosT * normal.y + sinT * binormal.y;
				const vz = cosT * normal.z + sinT * binormal.z;

				positions.push(
					center.x + radius * vx,
					center.y + radius * vy,
					center.z + radius * vz,
				);

				const nLen = Math.sqrt(vx * vx + vy * vy + vz * vz);
				normals.push(
					nLen > 0 ? vx / nLen : vx,
					nLen > 0 ? vy / nLen : vy,
					nLen > 0 ? vz / nLen : vz,
				);

				uvs.push(uTube, j / radialSegments);
			}
		}

		// Connect rings with quads
		const ringVertCount = radialSegments + 1;
		const tubeSegments = closed ? segCount : segCount;

		for (let i = 0; i < tubeSegments; i++) {
			const iNext = closed ? (i + 1) % sampleCount : i + 1;
			for (let j = 0; j < radialSegments; j++) {
				const a = i * ringVertCount + j;
				const b = iNext * ringVertCount + j;
				const c = iNext * ringVertCount + j + 1;
				const d = i * ringVertCount + j + 1;

				indices.push(a, b, d);
				indices.push(b, c, d);
			}
		}

		const vertexCount = positions.length / 3;
		const IndexArray = vertexCount > 65535 ? Uint32Array : Uint16Array;

		this.setPositions(new Float32Array(positions));
		this.setNormals(new Float32Array(normals));
		this.setUVs(new Float32Array(uvs));
		this.setIndex(new IndexArray(indices));
		this.computeBoundingSphere();
	}
}
