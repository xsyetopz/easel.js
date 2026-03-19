import { Side } from "../core/Constants.js";
import { Frustum } from "../math/Frustum.js";
import { Matrix4 } from "../math/Matrix4.js";
import { Vector3 } from "../math/Vector3.js";
import { DrawCall } from "./DrawCall.js";
import { DrawList } from "./DrawList.js";

const _mvp = new Matrix4();
const _vp = new Matrix4();
const _worldPos = new Vector3();
const _frustum = new Frustum();

/** @typedef {{ x: number, y: number, z: number, w: number, wx: number, wy: number, wz: number }} ProjectedVert */
/** @typedef {{ x: number, y: number, z: number }} Vec3 */

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

		const camPos = camera.position ?? { x: 0, y: 0, z: 0 };
		const drawList = new DrawList();
		this.#walk(
			/** @type {*} */ (scene),
			drawList,
			camera,
			_frustum,
			camPos.x ?? 0,
			camPos.y ?? 0,
			camPos.z ?? 0,
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
	 * @param {number} camX
	 * @param {number} camY
	 * @param {number} camZ
	 * @param {number} width
	 * @param {number} height
	 * @returns {void}
	 */
	#walk(node, drawList, camera, frustum, camX, camY, camZ, width, height) {
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
					camX,
					camY,
					camZ,
					width,
					height,
				);
				drawList.add(dc);
			}
		} else if (typeof node.type === "string" && node.type.endsWith("Light")) {
			this.#collectLight(/** @type {any} */ (node), drawList);
		}

		for (const child of node.children) {
			this.#walk(
				child,
				drawList,
				camera,
				frustum,
				camX,
				camY,
				camZ,
				width,
				height,
			);
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

		const worldCenter = bs.centre.clone().applyMatrix4(node.matrixWorld);
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
	 * @param {number} camX
	 * @param {number} camY
	 * @param {number} camZ
	 * @param {number} width
	 * @param {number} height
	 * @returns {import('./DrawCall.js').DrawCall}
	 */
	#buildDrawCall(node, camera, camX, camY, camZ, width, height) {
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
			const mw = node.matrixWorld.elements;
			drawCall.projectedVerts = new Array(count);

			for (let i = 0; i < count; i++) {
				const lx = arr[i * itemSize];
				const ly = arr[i * itemSize + 1];
				const lz = arr[i * itemSize + 2];

				// Clip-space w for near-plane guard
				const rawW = me[3] * lx + me[7] * ly + me[11] * lz + me[15];

				// World-space position for hybrid backface culling
				const wx = mw[0] * lx + mw[4] * ly + mw[8] * lz + mw[12];
				const wy = mw[1] * lx + mw[5] * ly + mw[9] * lz + mw[13];
				const wz = mw[2] * lx + mw[6] * ly + mw[10] * lz + mw[14];

				_worldPos.set(lx, ly, lz).applyMatrix4(_mvp);

				drawCall.projectedVerts[i] = {
					x: _worldPos.x,
					y: _worldPos.y,
					z: _worldPos.z,
					w: rawW,
					wx,
					wy,
					wz,
				};
			}
		}

		// Fix 2: Non-indexed geometry fallback
		const index = node.geometry.index;
		if (index) {
			drawCall.faceIndices = Array.from(index.array ?? index);
		} else {
			const vertCount = drawCall.projectedVerts.length;
			drawCall.faceIndices = Array.from({ length: vertCount }, (_, i) => i);
		}

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
			camX,
			camY,
			camZ,
		);

		return drawCall;
	}

	/**
	 * @param {{ matrixWorld: Matrix4, geometry: * }} node
	 * @returns {Array<Vec3>}
	 */
	#buildWorldNormals(node) {
		const normAttr = node.geometry.getAttribute("normal");
		/** @type {Array<Vec3>} */
		const worldNormals = [];
		if (!normAttr) return worldNormals;

		const nArr = normAttr.array;
		const nSize = normAttr.itemSize ?? 3;
		const nCount = nArr.length / nSize;
		const m = node.matrixWorld.elements;

		for (let i = 0; i < nCount; i++) {
			const nx = nArr[i * nSize];
			const ny = nArr[i * nSize + 1];
			const nz = nArr[i * nSize + 2];
			const wx = m[0] * nx + m[4] * ny + m[8] * nz;
			const wy = m[1] * nx + m[5] * ny + m[9] * nz;
			const wz = m[2] * nx + m[6] * ny + m[10] * nz;
			const len = Math.sqrt(wx * wx + wy * wy + wz * wz) || 1;
			worldNormals[i] = { x: wx / len, y: wy / len, z: wz / len };
		}

		return worldNormals;
	}

	/**
	 * @param {{ geometry: * }} node
	 * @returns {Array<{ u: number, v: number }>}
	 */
	#buildUvs(node) {
		const uvAttr = node.geometry.getAttribute("uv");
		/** @type {Array<{ u: number, v: number }>} */
		const uvs = [];
		if (!uvAttr) return uvs;

		const arr = uvAttr.array;
		const itemSize = uvAttr.itemSize ?? 2;
		const count = arr.length / itemSize;
		for (let i = 0; i < count; i++) {
			uvs[i] = { u: arr[i * itemSize], v: arr[i * itemSize + 1] };
		}
		return uvs;
	}

	/**
	 * @param {number[]} indices
	 * @param {ProjectedVert[]} verts
	 * @param {Array<Vec3>} worldNormals
	 * @param {Array<{ u: number, v: number }>} uvs
	 * @param {number} width
	 * @param {number} height
	 * @param {import('../materials/Material.js').Material} material
	 * @param {number} camX
	 * @param {number} camY
	 * @param {number} camZ
	 * @returns {import('./DrawCall.js').DrawCall['triangles']}
	 */
	#assembleTriangles(
		indices,
		verts,
		worldNormals,
		uvs,
		width,
		height,
		material,
		camX,
		camY,
		camZ,
	) {
		const triCount = Math.floor(indices.length / 3);
		/** @type {import('./DrawCall.js').DrawCall['triangles']} */
		const triangles = [];
		const side = material.side;

		for (let t = 0; t < triCount; t++) {
			const i0 = indices[t * 3];
			const i1 = indices[t * 3 + 1];
			const i2 = indices[t * 3 + 2];
			const v0 = verts[i0];
			const v1 = verts[i1];
			const v2 = verts[i2];

			const tri = this.#buildTriangle(
				v0,
				v1,
				v2,
				i0,
				i1,
				i2,
				worldNormals,
				uvs,
				width,
				height,
				side,
				camX,
				camY,
				camZ,
			);
			if (tri) {
				triangles.push(tri);
			}
		}

		return triangles;
	}

	/**
	 * @param {ProjectedVert} v0
	 * @param {ProjectedVert} v1
	 * @param {ProjectedVert} v2
	 * @param {number} i0
	 * @param {number} i1
	 * @param {number} i2
	 * @param {Array<Vec3>} worldNormals
	 * @param {Array<{ u: number, v: number }>} uvs
	 * @param {number} width
	 * @param {number} height
	 * @param {number} side
	 * @param {number} camX
	 * @param {number} camY
	 * @param {number} camZ
	 * @returns {import('./DrawCall.js').DrawCall['triangles'][0] | null}
	 */
	#buildTriangle(
		v0,
		v1,
		v2,
		i0,
		i1,
		i2,
		worldNormals,
		uvs,
		width,
		height,
		side,
		camX,
		camY,
		camZ,
	) {
		// Fix 3: Near-plane guard - skip triangles with any vertex behind camera
		if (v0.w <= 0 || v1.w <= 0 || v2.w <= 0) return null;

		// Fix 4: World-space backface cull (early-out before screen projection)
		const normal = this.#avgNormal(worldNormals, i0, i1, i2);

		if (!this.#passBackfaceCull(v0, v1, v2, normal, side, camX, camY, camZ)) {
			return null;
		}

		const screenVerts = this.#projectToScreen(v0, v1, v2, width, height);
		const cross =
			(screenVerts[1].x - screenVerts[0].x) *
				(screenVerts[2].y - screenVerts[0].y) -
			(screenVerts[1].y - screenVerts[0].y) *
				(screenVerts[2].x - screenVerts[0].x);

		if (this.#isCulled(cross, side)) return null;

		/** @type {import('./DrawCall.js').DrawCall['triangles'][0]} */
		const tri = {
			screenVerts,
			normal,
			vertices: [
				{ normal: worldNormals[i0] ?? normal },
				{ normal: worldNormals[i1] ?? normal },
				{ normal: worldNormals[i2] ?? normal },
			],
			centroidZ: (v0.z + v1.z + v2.z) / 3,
			minZ: Math.min(v0.z, v1.z, v2.z),
			maxZ: Math.max(v0.z, v1.z, v2.z),
			ndcVerts: [v0, v1, v2],
		};

		if (uvs.length > 0) {
			tri.uvs = [
				uvs[i0] ?? { u: 0, v: 0 },
				uvs[i1] ?? { u: 0, v: 0 },
				uvs[i2] ?? { u: 0, v: 0 },
			];
		}

		return tri;
	}

	/**
	 * @param {ProjectedVert} v0
	 * @param {ProjectedVert} v1
	 * @param {ProjectedVert} v2
	 * @param {Vec3} faceNormal
	 * @param {number} side
	 * @param {number} camX
	 * @param {number} camY
	 * @param {number} camZ
	 * @returns {boolean}
	 */
	#passBackfaceCull(v0, v1, v2, faceNormal, side, camX, camY, camZ) {
		if (side === Side.Double) return true;

		const fcx = (v0.wx + v1.wx + v2.wx) / 3;
		const fcy = (v0.wy + v1.wy + v2.wy) / 3;
		const fcz = (v0.wz + v1.wz + v2.wz) / 3;
		const dot =
			faceNormal.x * (camX - fcx) +
			faceNormal.y * (camY - fcy) +
			faceNormal.z * (camZ - fcz);

		if (side === Side.Front) return dot >= 0;
		if (side === Side.Back) return dot <= 0;
		return true;
	}

	/**
	 * @param {ProjectedVert} v0
	 * @param {ProjectedVert} v1
	 * @param {ProjectedVert} v2
	 * @param {number} width
	 * @param {number} height
	 * @returns {Array<{ x: number, y: number }>}
	 */
	#projectToScreen(v0, v1, v2, width, height) {
		return [
			{
				x: Math.trunc(((v0.x + 1) * width) / 2),
				y: Math.trunc(((1 - v0.y) * height) / 2),
			},
			{
				x: Math.trunc(((v1.x + 1) * width) / 2),
				y: Math.trunc(((1 - v1.y) * height) / 2),
			},
			{
				x: Math.trunc(((v2.x + 1) * width) / 2),
				y: Math.trunc(((1 - v2.y) * height) / 2),
			},
		];
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
	 * @param {Array<Vec3>} worldNormals
	 * @param {number} i0
	 * @param {number} i1
	 * @param {number} i2
	 * @returns {Vec3}
	 */
	#avgNormal(worldNormals, i0, i1, i2) {
		if (worldNormals.length === 0) return { x: 0, y: 1, z: 0 };
		const zero = { x: 0, y: 0, z: 0 };
		const n0 = worldNormals[i0] ?? zero;
		const n1 = worldNormals[i1] ?? zero;
		const n2 = worldNormals[i2] ?? zero;
		const ax = (n0.x + n1.x + n2.x) / 3;
		const ay = (n0.y + n1.y + n2.y) / 3;
		const az = (n0.z + n1.z + n2.z) / 3;
		const al = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
		return { x: ax / al, y: ay / al, z: az / al };
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

		// Directional / Point / Spot
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
