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

/** Walks the scene graph collecting visible draw calls. */
export class SceneTraversal {
	/** @type {number} */
	#fogNear = 0;
	/** @type {number} */
	#fogFar = 0;
	/** @type {boolean} */
	#hasFog = false;

	/**
	 * @param {{ children: *, visible: boolean, fog?: * }} scene
	 * @param {{ matrixWorldInverse: Matrix4, projectionMatrix: Matrix4, position: Vec3, updateMatrixWorld: () => void }} camera
	 * @param {number} [width]
	 * @param {number} [height]
	 * @returns {DrawList}
	 */
	traverse(scene, camera, width = 300, height = 150) {
		camera.updateMatrixWorld();

		const fog = scene.fog;
		this.#hasFog = !!fog;
		this.#fogNear = fog?.near ?? 0;
		this.#fogFar = fog?.far ?? 0;

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

		this.#projectVertices(node, drawCall);

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
			drawCall.worldPositions,
			width,
			height,
			node.material,
			node.geometry,
		);

		return drawCall;
	}

	/**
	 * Projects local-space vertex positions to NDC and world space, storing
	 * results in drawCall.projectedVerts and drawCall.worldPositions.
	 * @param {{ matrixWorld: Matrix4, geometry: * }} node
	 * @param {DrawCall} drawCall
	 * @returns {void}
	 */
	#projectVertices(node, drawCall) {
		const posAttr = node.geometry.getAttribute("position");
		if (!posAttr) return;

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

		const worldNeeded = count * 3;
		let wp = node.geometry._worldPositions;
		if (!wp || wp.length !== worldNeeded) {
			wp = new Float32Array(worldNeeded);
			node.geometry._worldPositions = wp;
		}
		drawCall.worldPositions = wp;

		// M2: Inline 4×4 matrix multiply - avoids Vector3 method dispatch per vertex.
		const mw = node.matrixWorld.elements;
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
			pv[base] = px * invW;
			pv[base + 1] = py * invW;
			pv[base + 2] = pz * invW;
			pv[base + 3] = pw;

			const wb = i * 3;
			wp[wb] = mw[0] * lx + mw[4] * ly + mw[8] * lz + mw[12];
			wp[wb + 1] = mw[1] * lx + mw[5] * ly + mw[9] * lz + mw[13];
			wp[wb + 2] = mw[2] * lx + mw[6] * ly + mw[10] * lz + mw[14];
		}
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
	 * @param {Float32Array} worldPositions Stride-3 flat buffer
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
		worldPositions,
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

			const [ff0, ff1, ff2] = this.#computeFogFactors(w0, w1, w2);

			this.#appendTriangle(
				buf,
				worldNormals,
				uvs,
				worldPositions,
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
				ff0,
				ff1,
				ff2,
			);
		}

		buf.buildSortOrder();
		return buf;
	}

	/**
	 * @param {TriangleBuffer} buf
	 * @param {Float32Array} worldNormals Stride-3 flat buffer
	 * @param {Float32Array} uvs Stride-2 flat buffer
	 * @param {Float32Array} worldPositions Stride-3 flat buffer
	 * @param {number} i0
	 * @param {number} i1
	 * @param {number} i2
	 * @param {number} sx0 @param {number} sy0
	 * @param {number} sx1 @param {number} sy1
	 * @param {number} sx2 @param {number} sy2
	 * @param {number} z0 @param {number} z1 @param {number} z2
	 * @param {number} [ff0=0] @param {number} [ff1=0] @param {number} [ff2=0]
	 */
	#appendTriangle(
		buf,
		worldNormals,
		uvs,
		worldPositions,
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
		ff0 = 0,
		ff1 = 0,
		ff2 = 0,
	) {
		const [fnx, fny, fnz] = this.#computeFaceNormal(worldNormals, i0, i1, i2);
		const vn0 = this.#vertNormal(worldNormals, i0, fnx, fny, fnz);
		const vn1 = this.#vertNormal(worldNormals, i1, fnx, fny, fnz);
		const vn2 = this.#vertNormal(worldNormals, i2, fnx, fny, fnz);
		const uv0 = this.#vertUv(uvs, i0);
		const uv1 = this.#vertUv(uvs, i1);
		const uv2 = this.#vertUv(uvs, i2);
		const wp0 = this.#vertWorld(worldPositions, i0);
		const wp1 = this.#vertWorld(worldPositions, i1);
		const wp2 = this.#vertWorld(worldPositions, i2);

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
			vn0[0],
			vn0[1],
			vn0[2],
			vn1[0],
			vn1[1],
			vn1[2],
			vn2[0],
			vn2[1],
			vn2[2],
			uv0[0],
			uv0[1],
			uv1[0],
			uv1[1],
			uv2[0],
			uv2[1],
			wp0[0],
			wp0[1],
			wp0[2],
			wp1[0],
			wp1[1],
			wp1[2],
			wp2[0],
			wp2[1],
			wp2[2],
			ff0,
			ff1,
			ff2,
		);
	}

	/**
	 * @param {Float32Array} worldNormals
	 * @param {number} idx
	 * @param {number} fnx @param {number} fny @param {number} fnz
	 * @returns {[number, number, number]}
	 */
	#vertNormal(worldNormals, idx, fnx, fny, fnz) {
		if (worldNormals.length < (idx + 1) * 3) return [fnx, fny, fnz];
		return [
			worldNormals[idx * 3],
			worldNormals[idx * 3 + 1],
			worldNormals[idx * 3 + 2],
		];
	}

	/**
	 * Compute per-vertex fog factors from clip-space W values.
	 * @param {number} w0 @param {number} w1 @param {number} w2
	 * @returns {[number, number, number]}
	 */
	#computeFogFactors(w0, w1, w2) {
		if (!this.#hasFog) return [0, 0, 0];
		const range = this.#fogFar - this.#fogNear;
		const invRange = range > 0 ? 1 / range : 0;
		const f0 = (w0 - this.#fogNear) * invRange;
		const f1 = (w1 - this.#fogNear) * invRange;
		const f2 = (w2 - this.#fogNear) * invRange;
		return [
			f0 < 0 ? 0 : f0 > 1 ? 1 : f0,
			f1 < 0 ? 0 : f1 > 1 ? 1 : f1,
			f2 < 0 ? 0 : f2 > 1 ? 1 : f2,
		];
	}

	/**
	 * @param {Float32Array} uvs
	 * @param {number} idx
	 * @returns {[number, number]}
	 */
	#vertUv(uvs, idx) {
		if (uvs.length < (idx + 1) * 2) return [0, 0];
		return [uvs[idx * 2], uvs[idx * 2 + 1]];
	}

	/**
	 * @param {Float32Array} worldPositions
	 * @param {number} idx
	 * @returns {[number, number, number]}
	 */
	#vertWorld(worldPositions, idx) {
		if (worldPositions.length < (idx + 1) * 3) return [0, 0, 0];
		return [
			worldPositions[idx * 3],
			worldPositions[idx * 3 + 1],
			worldPositions[idx * 3 + 2],
		];
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
	 * @param {any} light
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

		if (light.type === "SpotLight") {
			drawList.lights.push(this.#buildSpotLightEntry(light));
			return;
		}

		if (light.type === "PointLight") {
			const pos = light.position;
			drawList.lights.push({
				type: "point",
				position: { x: pos.x, y: pos.y, z: pos.z },
				color: light.color,
				intensity: light.intensity,
				distance: light.distance ?? 0,
				decay: light.decay ?? 2,
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

	/**
	 * Builds the draw list light entry for a SpotLight, transforming its
	 * local-space direction into world space via matrixWorld.
	 * @param {any} light
	 * @returns {Record<string, unknown>}
	 */
	#buildSpotLightEntry(light) {
		const pos = light.position;
		const me = light.matrixWorld?.elements;
		const dx = light.direction?.x ?? 0;
		const dy = light.direction?.y ?? -1;
		const dz = light.direction?.z ?? 0;
		let wdx;
		let wdy;
		let wdz;
		if (me) {
			wdx = me[0] * dx + me[4] * dy + me[8] * dz;
			wdy = me[1] * dx + me[5] * dy + me[9] * dz;
			wdz = me[2] * dx + me[6] * dy + me[10] * dz;
		} else {
			wdx = dx;
			wdy = dy;
			wdz = dz;
		}
		const dirLen = Math.sqrt(wdx * wdx + wdy * wdy + wdz * wdz) || 1;
		return {
			type: "spot",
			position: { x: pos.x, y: pos.y, z: pos.z },
			direction: { x: wdx / dirLen, y: wdy / dirLen, z: wdz / dirLen },
			color: light.color,
			intensity: light.intensity,
			angle: light.angle,
			penumbra: light.penumbra ?? 0,
			distance: light.distance ?? 0,
			decay: light.decay ?? 2,
		};
	}
}
