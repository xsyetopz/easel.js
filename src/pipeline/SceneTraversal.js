import { Side } from "../core/Constants.js";
import { Frustum } from "../math/Frustum.js";
import { Matrix4 } from "../math/Matrix4.js";
import { Vector3 } from "../math/Vector3.js";
import { DrawCall } from "./DrawCall.js";
import { DrawList } from "./DrawList.js";
import { TriangleBuffer } from "./TriangleBuffer.js";

const _mvp = new Matrix4();
const _vp = new Matrix4();
const _bsCenter = new Vector3();
const _frustum = new Frustum();

/**
 * Conceptual layout of one entry in the Float32Array vertex buffer (stride 4).
 * The data lives flat; this typedef is for documentation only.
 * @typedef {{ x: number, y: number, z: number, w: number }} ProjectedVert
 */
/** @typedef {{ x: number, y: number, z: number }} Vec3 */

const VERT_STRIDE = 4;

export class SceneTraversal {
	/**
	 * @param {{ children: *, visible: boolean, fog?: * }} scene
	 * @param {{ matrixWorldInverse: Matrix4, projectionMatrix: Matrix4, position: Vec3, updateMatrixWorld: () => void }} camera
	 * @param {number} [width]
	 * @param {number} [height]
	 * @returns {DrawList}
	 */
	traverse(scene, camera, width = 300, height = 150) {
		camera.updateMatrixWorld();

		_vp.copy(camera.projectionMatrix).mul(camera.matrixWorldInverse);
		_frustum.setFromProjectionMatrix(_vp);

		const drawList = new DrawList();
		this.#walk(
			/** @type {*} */ (scene),
			drawList,
			camera,
			_frustum,
			width,
			height,
		);
		return drawList;
	}

	/**
	 * @param {{ type?: string, visible: boolean, children: *, geometry?: *, material?: *, matrixWorld: Matrix4, updateMatrixWorld: (p: boolean, c: boolean) => void }} node
	 * @param {DrawList} drawList
	 * @param {{ matrixWorldInverse: Matrix4, projectionMatrix: Matrix4 }} camera
	 * @param {Frustum} frustum
	 * @param {number} width
	 * @param {number} height
	 * @returns {void}
	 */
	#walk(node, drawList, camera, frustum, width, height) {
		if (!node.visible) return;

		if (node.type === "Mesh" && node.geometry && node.material) {
			if (
				!this.#isFrustumCulled(
					/** @type {{ geometry: any, matrixWorld: Matrix4 }} */ (node),
					frustum,
				)
			) {
				const dc = this.#buildDrawCall(
					/** @type {{ matrixWorld: Matrix4, geometry: *, material: *, updateMatrixWorld: (p: boolean, c: boolean) => void }} */ (
						/** @type {unknown} */ (node)
					),
					camera,
					width,
					height,
				);
				drawList.add(dc);
			}
		} else if (typeof node.type === "string" && node.type.endsWith("Light")) {
			this.#collectLight(/** @type {any} */ (node), drawList);
		}

		for (const child of node.children) {
			this.#walk(child, drawList, camera, frustum, width, height);
		}
	}

	/**
	 * @param {{ geometry: *, matrixWorld: Matrix4 }} node
	 * @param {Frustum} frustum
	 * @returns {boolean}
	 */
	#isFrustumCulled(node, frustum) {
		if (
			node.geometry.boundingSphere === undefined &&
			typeof node.geometry.computeBoundingSphere === "function"
		) {
			node.geometry.computeBoundingSphere();
		}
		const bs = node.geometry.boundingSphere;
		if (!bs) return false;

		const worldCenter = _bsCenter
			.copy(bs.centre)
			.applyMatrix4(node.matrixWorld);
		const me = node.matrixWorld.elements;
		const sx = Math.sqrt(me[0] * me[0] + me[1] * me[1] + me[2] * me[2]);
		const sy = Math.sqrt(me[4] * me[4] + me[5] * me[5] + me[6] * me[6]);
		const sz = Math.sqrt(me[8] * me[8] + me[9] * me[9] + me[10] * me[10]);
		const worldRadius = bs.radius * Math.max(sx, sy, sz);
		return !frustum.intersectsSphere({
			centre: worldCenter,
			radius: worldRadius,
		});
	}

	/**
	 * @param {{ matrixWorld: Matrix4, geometry: *, material: *, updateMatrixWorld: (p: boolean, c: boolean) => void }} node
	 * @param {{ matrixWorldInverse: Matrix4, projectionMatrix: Matrix4 }} camera
	 * @param {number} width
	 * @param {number} height
	 * @returns {import('./DrawCall.js').DrawCall}
	 */
	#buildDrawCall(node, camera, width, height) {
		node.updateMatrixWorld(false, false);

		const drawCall = new DrawCall(
			/** @type {import('../objects/Mesh.js').Mesh} */ (
				/** @type {unknown} */ (node)
			),
			node.material,
		);

		_mvp
			.copy(camera.projectionMatrix)
			.mul(camera.matrixWorldInverse)
			.mul(node.matrixWorld);

		const posAttr = node.geometry.getAttribute("position");
		if (posAttr) {
			const arr = posAttr.array;
			const itemSize = posAttr.itemSize ?? 3;
			const count = arr.length / itemSize;
			const me = _mvp.elements;
			const needed = count * VERT_STRIDE;
			let pv = node.geometry._projectedVerts;
			if (!pv || pv.length !== needed) {
				pv = new Float32Array(needed);
				node.geometry._projectedVerts = pv;
			}
			drawCall.projectedVerts = pv;
			drawCall.vertCount = count;

			// M2: Inline 4×4 matrix multiply — avoids Vector3 method dispatch per vertex.
			for (let i = 0; i < count; i++) {
				const lx = arr[i * itemSize];
				const ly = arr[i * itemSize + 1];
				const lz = arr[i * itemSize + 2];

				const px = me[0] * lx + me[4] * ly + me[8] * lz + me[12];
				const py = me[1] * lx + me[5] * ly + me[9] * lz + me[13];
				const pz = me[2] * lx + me[6] * ly + me[10] * lz + me[14];
				const pw = me[3] * lx + me[7] * ly + me[11] * lz + me[15];
				const invW = 1 / pw;

				const base = i * VERT_STRIDE;
				drawCall.projectedVerts[base] = px * invW;
				drawCall.projectedVerts[base + 1] = py * invW;
				drawCall.projectedVerts[base + 2] = pz * invW;
				drawCall.projectedVerts[base + 3] = pw;
			}
		}

		// M3: Use TypedArray directly instead of copying into a JS Array.
		const index = node.geometry.index;
		if (index) {
			drawCall.faceIndices = index.array ?? index;
		} else {
			if (
				!node.geometry._sequentialIndices ||
				node.geometry._sequentialIndices.length !== drawCall.vertCount
			) {
				node.geometry._sequentialIndices = Uint32Array.from(
					{ length: drawCall.vertCount },
					(_, i) => i,
				);
			}
			drawCall.faceIndices = node.geometry._sequentialIndices;
		}

		// M4: Cache UVs (geometry-intrinsic, never change).
		const worldNormals = this.#buildWorldNormals(node);
		const uvs = this.#buildUvs(node);
		drawCall.triangles = this.#assembleTriangles(
			drawCall.faceIndices,
			drawCall.projectedVerts,
			worldNormals,
			uvs,
			width,
			height,
			node.material,
			node.geometry,
		);

		return drawCall;
	}

	/**
	 * @param {{ matrixWorld: Matrix4, geometry: * }} node
	 * @returns {Float32Array} Stride-3 flat array: [x0,y0,z0, x1,y1,z1, ...]
	 */
	#buildWorldNormals(node) {
		const normAttr = node.geometry.getAttribute("normal");
		if (!normAttr) return new Float32Array(0);

		const nArr = normAttr.array;
		const nSize = normAttr.itemSize ?? 3;
		const nCount = nArr.length / nSize;
		const m = node.matrixWorld.elements;
		const result = new Float32Array(nCount * 3);

		for (let i = 0; i < nCount; i++) {
			const nx = nArr[i * nSize];
			const ny = nArr[i * nSize + 1];
			const nz = nArr[i * nSize + 2];
			const wx = m[0] * nx + m[4] * ny + m[8] * nz;
			const wy = m[1] * nx + m[5] * ny + m[9] * nz;
			const wz = m[2] * nx + m[6] * ny + m[10] * nz;
			const len = Math.sqrt(wx * wx + wy * wy + wz * wz) || 1;
			result[i * 3] = wx / len;
			result[i * 3 + 1] = wy / len;
			result[i * 3 + 2] = wz / len;
		}

		return result;
	}

	/**
	 * M4: Caches the UV buffer on the geometry since UVs are intrinsic and never change.
	 * @param {{ geometry: * }} node
	 * @returns {Float32Array} Stride-2 flat array: [u0,v0, u1,v1, ...]
	 */
	#buildUvs(node) {
		if (node.geometry._uvCache) return node.geometry._uvCache;

		const uvAttr = node.geometry.getAttribute("uv");
		if (!uvAttr) return new Float32Array(0);

		const arr = uvAttr.array;
		const itemSize = uvAttr.itemSize ?? 2;
		const count = arr.length / itemSize;
		const result = new Float32Array(count * 2);
		for (let i = 0; i < count; i++) {
			result[i * 2] = arr[i * itemSize];
			result[i * 2 + 1] = arr[i * itemSize + 1];
		}
		node.geometry._uvCache = result;
		return result;
	}

	/**
	 * @param {number[] | Uint16Array | Uint32Array} indices
	 * @param {Float32Array} verts Stride-4 flat buffer (see VERT_STRIDE)
	 * @param {Float32Array} worldNormals Stride-3 flat buffer
	 * @param {Float32Array} uvs Stride-2 flat buffer
	 * @param {number} width
	 * @param {number} height
	 * @param {import('../materials/Material.js').Material} material
	 * @param {{ _triangleBuffer?: TriangleBuffer }} geometry
	 * @returns {TriangleBuffer}
	 */
	#assembleTriangles(
		indices,
		verts,
		worldNormals,
		uvs,
		width,
		height,
		material,
		geometry,
	) {
		const triCount = Math.floor(indices.length / 3);
		const side = material.side;

		let buf = geometry._triangleBuffer;
		if (!buf) {
			buf = new TriangleBuffer(triCount || 64);
			geometry._triangleBuffer = buf;
		}
		buf.reset();

		const halfW = width * 0.5;
		const halfH = height * 0.5;

		for (let t = 0; t < triCount; t++) {
			const i0 = indices[t * 3];
			const i1 = indices[t * 3 + 1];
			const i2 = indices[t * 3 + 2];

			const b0 = i0 * VERT_STRIDE;
			const b1 = i1 * VERT_STRIDE;
			const b2 = i2 * VERT_STRIDE;

			const w0 = verts[b0 + 3];
			const w1 = verts[b1 + 3];
			const w2 = verts[b2 + 3];

			if (w0 <= 0 || w1 <= 0 || w2 <= 0) continue;

			const x0 = verts[b0];
			const y0 = verts[b0 + 1];
			const x1 = verts[b1];
			const y1 = verts[b1 + 1];
			const x2 = verts[b2];
			const y2 = verts[b2 + 1];

			const sx0 = ((x0 + 1) * halfW + 0.5) | 0;
			const sy0 = ((1 - y0) * halfH + 0.5) | 0;
			const sx1 = ((x1 + 1) * halfW + 0.5) | 0;
			const sy1 = ((1 - y1) * halfH + 0.5) | 0;
			const sx2 = ((x2 + 1) * halfW + 0.5) | 0;
			const sy2 = ((1 - y2) * halfH + 0.5) | 0;

			const cross = (sx1 - sx0) * (sy2 - sy0) - (sy1 - sy0) * (sx2 - sx0);
			if (this.#isCulled(cross, side)) continue;

			this.#appendTriangle(
				buf,
				worldNormals,
				uvs,
				i0,
				i1,
				i2,
				sx0,
				sy0,
				sx1,
				sy1,
				sx2,
				sy2,
				verts[b0 + 2],
				verts[b1 + 2],
				verts[b2 + 2],
			);
		}

		buf.buildSortOrder();
		return buf;
	}

	/**
	 * @param {TriangleBuffer} buf
	 * @param {Float32Array} worldNormals Stride-3 flat buffer
	 * @param {Float32Array} uvs Stride-2 flat buffer
	 * @param {number} i0
	 * @param {number} i1
	 * @param {number} i2
	 * @param {number} sx0 @param {number} sy0
	 * @param {number} sx1 @param {number} sy1
	 * @param {number} sx2 @param {number} sy2
	 * @param {number} z0 @param {number} z1 @param {number} z2
	 */
	#appendTriangle(
		buf,
		worldNormals,
		uvs,
		i0,
		i1,
		i2,
		sx0,
		sy0,
		sx1,
		sy1,
		sx2,
		sy2,
		z0,
		z1,
		z2,
	) {
		const [fnx, fny, fnz] = this.#computeFaceNormal(worldNormals, i0, i1, i2);

		const has0 = worldNormals.length >= (i0 + 1) * 3;
		const has1 = worldNormals.length >= (i1 + 1) * 3;
		const has2 = worldNormals.length >= (i2 + 1) * 3;

		const vn0x = has0 ? worldNormals[i0 * 3] : fnx;
		const vn0y = has0 ? worldNormals[i0 * 3 + 1] : fny;
		const vn0z = has0 ? worldNormals[i0 * 3 + 2] : fnz;
		const vn1x = has1 ? worldNormals[i1 * 3] : fnx;
		const vn1y = has1 ? worldNormals[i1 * 3 + 1] : fny;
		const vn1z = has1 ? worldNormals[i1 * 3 + 2] : fnz;
		const vn2x = has2 ? worldNormals[i2 * 3] : fnx;
		const vn2y = has2 ? worldNormals[i2 * 3 + 1] : fny;
		const vn2z = has2 ? worldNormals[i2 * 3 + 2] : fnz;

		const hasUv0 = uvs.length >= (i0 + 1) * 2;
		const hasUv1 = uvs.length >= (i1 + 1) * 2;
		const hasUv2 = uvs.length >= (i2 + 1) * 2;

		buf.append(
			sx0,
			sy0,
			sx1,
			sy1,
			sx2,
			sy2,
			z0,
			z1,
			z2,
			fnx,
			fny,
			fnz,
			vn0x,
			vn0y,
			vn0z,
			vn1x,
			vn1y,
			vn1z,
			vn2x,
			vn2y,
			vn2z,
			hasUv0 ? uvs[i0 * 2] : 0,
			hasUv0 ? uvs[i0 * 2 + 1] : 0,
			hasUv1 ? uvs[i1 * 2] : 0,
			hasUv1 ? uvs[i1 * 2 + 1] : 0,
			hasUv2 ? uvs[i2 * 2] : 0,
			hasUv2 ? uvs[i2 * 2 + 1] : 0,
		);
	}

	/**
	 * Computes and normalises the averaged face normal for three vertices.
	 * @param {Float32Array} worldNormals Stride-3 flat buffer
	 * @param {number} i0
	 * @param {number} i1
	 * @param {number} i2
	 * @returns {[number, number, number]}
	 */
	#computeFaceNormal(worldNormals, i0, i1, i2) {
		if (worldNormals.length === 0) return [0, 1, 0];
		const n0x = worldNormals[i0 * 3] ?? 0;
		const n0y = worldNormals[i0 * 3 + 1] ?? 0;
		const n0z = worldNormals[i0 * 3 + 2] ?? 0;
		const n1x = worldNormals[i1 * 3] ?? 0;
		const n1y = worldNormals[i1 * 3 + 1] ?? 0;
		const n1z = worldNormals[i1 * 3 + 2] ?? 0;
		const n2x = worldNormals[i2 * 3] ?? 0;
		const n2y = worldNormals[i2 * 3 + 1] ?? 0;
		const n2z = worldNormals[i2 * 3 + 2] ?? 0;
		const ax = (n0x + n1x + n2x) / 3;
		const ay = (n0y + n1y + n2y) / 3;
		const az = (n0z + n1z + n2z) / 3;
		const al = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
		return [ax / al, ay / al, az / al];
	}

	/**
	 * Returns true if a triangle should be culled based on its screen-space
	 * signed area and the material's side setting.
	 * @param {number} cross Screen-space signed area (negative = front-facing)
	 * @param {number} side Material.side value (Side.Front, Side.Back, Side.Double)
	 * @returns {boolean}
	 */
	#isCulled(cross, side) {
		if (cross === 0) return true;
		if (side === Side.Front) return cross > 0;
		if (side === Side.Back) return cross < 0;
		return false;
	}

	/**
	 * @param {{ type?: string, position?: *, color?: *, groundColor?: *, intensity: number }} light
	 * @param {DrawList} drawList
	 * @returns {void}
	 */
	#collectLight(light, drawList) {
		if (light.type === "AmbientLight") {
			drawList.lights.push({
				type: "ambient",
				color: light.color,
				intensity: light.intensity,
			});
			return;
		}

		if (light.type === "HemisphereLight") {
			const pos = light.position;
			const len = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z) || 1;
			drawList.lights.push({
				type: "hemisphere",
				skyColor: light.color,
				groundColor: light.groundColor,
				direction: { x: pos.x / len, y: pos.y / len, z: pos.z / len },
				intensity: light.intensity,
			});
			return;
		}

		if (
			!light.position ||
			light.color === undefined ||
			light.intensity === undefined
		) {
			return;
		}
		const pos = light.position;
		const len = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z) || 1;
		drawList.lights.push({
			type: "directional",
			direction: { x: -pos.x / len, y: -pos.y / len, z: -pos.z / len },
			color: light.color,
			intensity: light.intensity,
		});
	}
}
