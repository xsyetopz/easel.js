import { LightType, Side } from "../core/Constants.js";
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
	/** @type {boolean} */
	#autoUpdate = false;

	// Scratch storage set by #isFrustumCulled so #walk can reuse the
	// bounding sphere world center without recomputing it for fog checks.
	/** @type {number} */
	#lastBsCenterX = 0;
	/** @type {number} */
	#lastBsCenterY = 0;
	/** @type {number} */
	#lastBsCenterZ = 0;
	/** @type {number} */
	#lastBsWorldRadius = 0;

	#drawList = new DrawList();

	/**
	 * @param {{ children: *, visible: boolean, fog?: *, autoUpdate?: boolean }} scene
	 * @param {{ matrixWorldInverse: Matrix4, projectionMatrix: Matrix4, position: Vec3, updateMatrixWorld: () => void }} camera
	 * @param {number} [width]
	 * @param {number} [height]
	 * @returns {DrawList}
	 */
	traverse(scene, camera, width = 300, height = 150) {
		this.#autoUpdate = scene.autoUpdate !== false;
		camera.updateMatrixWorld();

		const fog = scene.fog;
		this.#hasFog = !!fog;
		this.#fogNear = fog?.near ?? 0;
		this.#fogFar = fog?.far ?? 0;

		_vp.copy(camera.projectionMatrix).mul(camera.matrixWorldInverse);
		_frustum.setFromProjectionMatrix(_vp);

		const drawList = this.#drawList;
		drawList.clear();
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
	 * @param {{ type?: string, visible: boolean, children: *, geometry?: *, material?: *, matrixWorld: Matrix4, updateMatrixWorld?: (updateParents?: boolean, force?: boolean) => void }} node
	 * @param {DrawList} drawList
	 * @param {{ matrixWorldInverse: Matrix4, projectionMatrix: Matrix4, position?: { x: number, y: number, z: number } }} camera
	 * @param {Frustum} frustum
	 * @param {number} width
	 * @param {number} height
	 * @returns {void}
	 */
	#walk(node, drawList, camera, frustum, width, height) {
		if (!node.visible) return;

		if (
			(node.type === "Mesh" || node.type === "Points") &&
			node.geometry &&
			node.material
		) {
			if (this.#autoUpdate && node.updateMatrixWorld) {
				node.updateMatrixWorld(true, false);
			}
			if (
				!this.#isFrustumCulled(
					/** @type {{ geometry: any, matrixWorld: Matrix4 }} */ (node),
					frustum,
				)
			) {
				// Cheap bounding-sphere fog check before any vertex work.
				// Matches the RuneTek 3 pattern: cull by tile distance first.
				if (this.#hasFog && camera.position) {
					const dx = this.#lastBsCenterX - camera.position.x;
					const dy = this.#lastBsCenterY - camera.position.y;
					const dz = this.#lastBsCenterZ - camera.position.z;
					const distSq = dx * dx + dy * dy + dz * dz;
					const fogFarPlusRadius = this.#fogFar + this.#lastBsWorldRadius;
					if (distSq > fogFarPlusRadius * fogFarPlusRadius) {
						// Mesh is entirely beyond fog far — skip all vertex work.
						for (const child of node.children) {
							this.#walk(child, drawList, camera, frustum, width, height);
						}
						return;
					}
				}

				const dc = this.#buildDrawCall(
					/** @type {{ matrixWorld: Matrix4, geometry: *, material: * }} */ (
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
	 * Returns true if the node is outside the frustum and should be skipped.
	 * As a side-effect, writes the bounding sphere world center and radius into
	 * #lastBsCenterX/Y/Z and #lastBsWorldRadius so callers can reuse them for
	 * the fog distance check without a second matrix multiply.
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

		// Cache for fog check in #walk — avoid recomputing these values.
		this.#lastBsCenterX = worldCenter.x;
		this.#lastBsCenterY = worldCenter.y;
		this.#lastBsCenterZ = worldCenter.z;
		this.#lastBsWorldRadius = worldRadius;

		return !frustum.intersectsSphere({
			centre: worldCenter,
			radius: worldRadius,
		});
	}

	/**
	 * @param {{ matrixWorld: Matrix4, geometry: *, material: *, _projectedVerts?: Float32Array, _worldPositions?: Float32Array, _worldNormalCache?: Float32Array, _worldNormalCacheKey?: Float32Array, _triangleBuffer?: TriangleBuffer }} node
	 * @param {{ matrixWorldInverse: Matrix4, projectionMatrix: Matrix4 }} camera
	 * @param {number} width
	 * @param {number} height
	 * @returns {*}
	 */
	#buildDrawCall(node, camera, width, height) {
		const drawCall = new DrawCall(
			/** @type {*} */ (/** @type {unknown} */ (node)),
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
			node,
		);

		return drawCall;
	}

	/**
	 * Projects local-space vertex positions to NDC and world space, storing
	 * results in drawCall.projectedVerts and drawCall.worldPositions.
	 * @param {{ matrixWorld: Matrix4, geometry: *, _projectedVerts?: Float32Array, _worldPositions?: Float32Array }} node
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
		let pv = node._projectedVerts;
		if (!pv || pv.length !== needed) {
			pv = new Float32Array(needed);
			node._projectedVerts = pv;
		}
		drawCall.projectedVerts = pv;
		drawCall.vertCount = count;

		const worldNeeded = count * 3;
		let wp = node._worldPositions;
		if (!wp || wp.length !== worldNeeded) {
			wp = new Float32Array(worldNeeded);
			node._worldPositions = wp;
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
	 * Caches world normals on the geometry keyed by the 3×3 rotation submatrix.
	 * Translation doesn't affect normals, so only m[0..2], m[4..6], m[8..10] are
	 * compared. The key buffer is reused across frames to avoid allocation.
	 * @param {{ matrixWorld: Matrix4, geometry: *, _worldNormalCache?: Float32Array, _worldNormalCacheKey?: Float32Array }} node
	 * @returns {Float32Array} Stride-3 flat array: [x0,y0,z0, x1,y1,z1, ...]
	 */
	#buildWorldNormals(node) {
		const normAttr = node.geometry.getAttribute("normal");
		if (!normAttr) return new Float32Array(0);

		const nArr = normAttr.array;
		const nSize = normAttr.itemSize ?? 3;
		const nCount = nArr.length / nSize;
		const m = node.matrixWorld.elements;
		// Cache hit: compare the 3×3 rotation submatrix.
		// Cached on node (not geometry) so shared geometry with different
		// rotations doesn't return stale normals.
		if (node._worldNormalCache && node._worldNormalCacheKey) {
			const k = node._worldNormalCacheKey;
			if (
				k[0] === m[0] &&
				k[1] === m[1] &&
				k[2] === m[2] &&
				k[3] === m[4] &&
				k[4] === m[5] &&
				k[5] === m[6] &&
				k[6] === m[8] &&
				k[7] === m[9] &&
				k[8] === m[10]
			) {
				return node._worldNormalCache;
			}
			// Reuse the key buffer — no allocation needed on subsequent frames.
			k[0] = m[0];
			k[1] = m[1];
			k[2] = m[2];
			k[3] = m[4];
			k[4] = m[5];
			k[5] = m[6];
			k[6] = m[8];
			k[7] = m[9];
			k[8] = m[10];
		} else {
			node._worldNormalCacheKey = new Float32Array([
				m[0],
				m[1],
				m[2],
				m[4],
				m[5],
				m[6],
				m[8],
				m[9],
				m[10],
			]);
		}

		let result = node._worldNormalCache;
		if (!result || result.length !== nCount * 3) {
			result = new Float32Array(nCount * 3);
			node._worldNormalCache = result;
		}

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
	 * @param {*} material
	 * @param {{ _triangleBuffer?: TriangleBuffer, [k: string]: any }} node
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
		node,
	) {
		const triCount = Math.floor(indices.length / 3);
		const side = material.side;

		let buf = node._triangleBuffer;
		if (!buf) {
			buf = new TriangleBuffer(triCount || 64);
			node._triangleBuffer = buf;
		}
		buf.reset();

		const halfW = width * 0.5;
		const halfH = height * 0.5;

		const hasFog = this.#hasFog;
		const fogNear = this.#fogNear;
		const fogInvRange =
			this.#fogFar - fogNear > 0 ? 1 / (this.#fogFar - fogNear) : 0;
		const wnLen = worldNormals.length;
		const uvLen = uvs.length;
		const wpLen = worldPositions.length;

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

			// Inline fog factors — avoids [f0,f1,f2] array allocation per triangle.
			let ff0 = 0;
			let ff1 = 0;
			let ff2 = 0;
			if (hasFog) {
				const raw0 = (w0 - fogNear) * fogInvRange;
				const raw1 = (w1 - fogNear) * fogInvRange;
				const raw2 = (w2 - fogNear) * fogInvRange;
				ff0 = raw0 < 0 ? 0 : raw0 > 1 ? 1 : raw0;
				ff1 = raw1 < 0 ? 0 : raw1 > 1 ? 1 : raw1;
				ff2 = raw2 < 0 ? 0 : raw2 > 1 ? 1 : raw2;
			}

			// Inline face normal — avoids [fnx,fny,fnz] array allocation per triangle.
			let fnx = 0;
			let fny = 1;
			let fnz = 0;
			if (wnLen > 0) {
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
				fnx = ax / al;
				fny = ay / al;
				fnz = az / al;
			}

			// Inline vertex normals — falls back to face normal when out-of-range.
			const vn0b = i0 * 3;
			const vn0x = wnLen < vn0b + 3 ? fnx : worldNormals[vn0b];
			const vn0y = wnLen < vn0b + 3 ? fny : worldNormals[vn0b + 1];
			const vn0z = wnLen < vn0b + 3 ? fnz : worldNormals[vn0b + 2];
			const vn1b = i1 * 3;
			const vn1x = wnLen < vn1b + 3 ? fnx : worldNormals[vn1b];
			const vn1y = wnLen < vn1b + 3 ? fny : worldNormals[vn1b + 1];
			const vn1z = wnLen < vn1b + 3 ? fnz : worldNormals[vn1b + 2];
			const vn2b = i2 * 3;
			const vn2x = wnLen < vn2b + 3 ? fnx : worldNormals[vn2b];
			const vn2y = wnLen < vn2b + 3 ? fny : worldNormals[vn2b + 1];
			const vn2z = wnLen < vn2b + 3 ? fnz : worldNormals[vn2b + 2];

			// Inline UV reads — falls back to 0 when out-of-range.
			const uv0b = i0 * 2;
			const uv0u = uvLen < uv0b + 2 ? 0 : uvs[uv0b];
			const uv0v = uvLen < uv0b + 2 ? 0 : uvs[uv0b + 1];
			const uv1b = i1 * 2;
			const uv1u = uvLen < uv1b + 2 ? 0 : uvs[uv1b];
			const uv1v = uvLen < uv1b + 2 ? 0 : uvs[uv1b + 1];
			const uv2b = i2 * 2;
			const uv2u = uvLen < uv2b + 2 ? 0 : uvs[uv2b];
			const uv2v = uvLen < uv2b + 2 ? 0 : uvs[uv2b + 1];

			// Inline world position reads — falls back to 0 when out-of-range.
			const wp0b = i0 * 3;
			const wp0x = wpLen < wp0b + 3 ? 0 : worldPositions[wp0b];
			const wp0y = wpLen < wp0b + 3 ? 0 : worldPositions[wp0b + 1];
			const wp0z = wpLen < wp0b + 3 ? 0 : worldPositions[wp0b + 2];
			const wp1b = i1 * 3;
			const wp1x = wpLen < wp1b + 3 ? 0 : worldPositions[wp1b];
			const wp1y = wpLen < wp1b + 3 ? 0 : worldPositions[wp1b + 1];
			const wp1z = wpLen < wp1b + 3 ? 0 : worldPositions[wp1b + 2];
			const wp2b = i2 * 3;
			const wp2x = wpLen < wp2b + 3 ? 0 : worldPositions[wp2b];
			const wp2y = wpLen < wp2b + 3 ? 0 : worldPositions[wp2b + 1];
			const wp2z = wpLen < wp2b + 3 ? 0 : worldPositions[wp2b + 2];

			buf.append(
				sx0,
				sy0,
				sx1,
				sy1,
				sx2,
				sy2,
				verts[b0 + 2],
				verts[b1 + 2],
				verts[b2 + 2],
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
				uv0u,
				uv0v,
				uv1u,
				uv1v,
				uv2u,
				uv2v,
				wp0x,
				wp0y,
				wp0z,
				wp1x,
				wp1y,
				wp1z,
				wp2x,
				wp2y,
				wp2z,
				ff0,
				ff1,
				ff2,
				i0,
				i1,
				i2,
			);
		}

		buf.buildSortOrder();
		return buf;
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
				lightType: LightType.Ambient,
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
				lightType: LightType.Hemisphere,
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
				lightType: LightType.Point,
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
			lightType: LightType.Directional,
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
			lightType: LightType.Spot,
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
