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
			drawCall.projectedVerts = new Float32Array(count * VERT_STRIDE);
			drawCall.vertCount = count;

			for (let i = 0; i < count; i++) {
				const lx = arr[i * itemSize];
				const ly = arr[i * itemSize + 1];
				const lz = arr[i * itemSize + 2];

				// Clip-space w for near-plane guard
				const rawW = me[3] * lx + me[7] * ly + me[11] * lz + me[15];

				_worldPos.set(lx, ly, lz).applyMatrix4(_mvp);

				const base = i * VERT_STRIDE;
				drawCall.projectedVerts[base] = _worldPos.x;
				drawCall.projectedVerts[base + 1] = _worldPos.y;
				drawCall.projectedVerts[base + 2] = _worldPos.z;
				drawCall.projectedVerts[base + 3] = rawW;
			}
		}

		// Fix 2: Non-indexed geometry fallback
		const index = node.geometry.index;
		if (index) {
			drawCall.faceIndices = Array.from(index.array ?? index);
		} else {
			drawCall.faceIndices = Array.from(
				{ length: drawCall.vertCount },
				(_, i) => i,
			);
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
	 * @param {{ geometry: * }} node
	 * @returns {Float32Array} Stride-2 flat array: [u0,v0, u1,v1, ...]
	 */
	#buildUvs(node) {
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
		return result;
	}

	/**
	 * @param {number[]} indices
	 * @param {Float32Array} verts Stride-4 flat buffer (see VERT_STRIDE)
	 * @param {Float32Array} worldNormals Stride-3 flat buffer
	 * @param {Float32Array} uvs Stride-2 flat buffer
	 * @param {number} width
	 * @param {number} height
	 * @param {import('../materials/Material.js').Material} material
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
	) {
		const triCount = Math.floor(indices.length / 3);
		/** @type {import('./DrawCall.js').DrawCall['triangles']} */
		const triangles = [];
		const side = material.side;

		for (let t = 0; t < triCount; t++) {
			const i0 = indices[t * 3];
			const i1 = indices[t * 3 + 1];
			const i2 = indices[t * 3 + 2];

			const b0 = i0 * VERT_STRIDE;
			const b1 = i1 * VERT_STRIDE;
			const b2 = i2 * VERT_STRIDE;

			const tri = this.#buildTriangle(
				verts[b0],
				verts[b0 + 1],
				verts[b0 + 2],
				verts[b0 + 3],
				verts[b1],
				verts[b1 + 1],
				verts[b1 + 2],
				verts[b1 + 3],
				verts[b2],
				verts[b2 + 1],
				verts[b2 + 2],
				verts[b2 + 3],
				i0,
				i1,
				i2,
				worldNormals,
				uvs,
				width,
				height,
				side,
			);
			if (tri) {
				triangles.push(tri);
			}
		}

		return triangles;
	}

	/**
	 * @param {number} x0 @param {number} y0 @param {number} z0 @param {number} w0
	 * @param {number} x1 @param {number} y1 @param {number} z1 @param {number} w1
	 * @param {number} x2 @param {number} y2 @param {number} z2 @param {number} w2
	 * @param {number} i0
	 * @param {number} i1
	 * @param {number} i2
	 * @param {Float32Array} worldNormals Stride-3 flat buffer
	 * @param {Float32Array} uvs Stride-2 flat buffer
	 * @param {number} width
	 * @param {number} height
	 * @param {number} side
	 * @returns {import('./DrawCall.js').DrawCall['triangles'][0] | null}
	 */
	#buildTriangle(
		x0,
		y0,
		z0,
		w0,
		x1,
		y1,
		z1,
		w1,
		x2,
		y2,
		z2,
		w2,
		i0,
		i1,
		i2,
		worldNormals,
		uvs,
		width,
		height,
		side,
	) {
		// Near-plane guard - skip triangles with any vertex behind camera
		if (w0 <= 0 || w1 <= 0 || w2 <= 0) return null;

		const normal = this.#avgNormal(worldNormals, i0, i1, i2);

		const screenVerts = this.#projectToScreen(
			x0,
			y0,
			x1,
			y1,
			x2,
			y2,
			width,
			height,
		);
		const cross =
			(screenVerts[1].x - screenVerts[0].x) *
				(screenVerts[2].y - screenVerts[0].y) -
			(screenVerts[1].y - screenVerts[0].y) *
				(screenVerts[2].x - screenVerts[0].x);

		if (this.#isCulled(cross, side)) return null;

		// Build per-vertex normal objects for LightBaker consumption
		const vn0 =
			worldNormals.length >= (i0 + 1) * 3
				? {
						x: worldNormals[i0 * 3],
						y: worldNormals[i0 * 3 + 1],
						z: worldNormals[i0 * 3 + 2],
					}
				: normal;
		const vn1 =
			worldNormals.length >= (i1 + 1) * 3
				? {
						x: worldNormals[i1 * 3],
						y: worldNormals[i1 * 3 + 1],
						z: worldNormals[i1 * 3 + 2],
					}
				: normal;
		const vn2 =
			worldNormals.length >= (i2 + 1) * 3
				? {
						x: worldNormals[i2 * 3],
						y: worldNormals[i2 * 3 + 1],
						z: worldNormals[i2 * 3 + 2],
					}
				: normal;

		/** @type {import('./DrawCall.js').DrawCall['triangles'][0]} */
		const tri = {
			screenVerts,
			normal,
			vertices: [{ normal: vn0 }, { normal: vn1 }, { normal: vn2 }],
			centroidZ: (z0 + z1 + z2) / 3,
			minZ: Math.min(z0, z1, z2),
			maxZ: Math.max(z0, z1, z2),
			ndcVerts: [
				{ x: x0, y: y0, z: z0 },
				{ x: x1, y: y1, z: z1 },
				{ x: x2, y: y2, z: z2 },
			],
		};

		if (uvs.length > 0) {
			tri.uvs = [
				uvs.length >= (i0 + 1) * 2
					? { u: uvs[i0 * 2], v: uvs[i0 * 2 + 1] }
					: { u: 0, v: 0 },
				uvs.length >= (i1 + 1) * 2
					? { u: uvs[i1 * 2], v: uvs[i1 * 2 + 1] }
					: { u: 0, v: 0 },
				uvs.length >= (i2 + 1) * 2
					? { u: uvs[i2 * 2], v: uvs[i2 * 2 + 1] }
					: { u: 0, v: 0 },
			];
		}

		return tri;
	}

	/**
	 * @param {number} x0 @param {number} y0
	 * @param {number} x1 @param {number} y1
	 * @param {number} x2 @param {number} y2
	 * @param {number} width
	 * @param {number} height
	 * @returns {Array<{ x: number, y: number }>}
	 */
	#projectToScreen(x0, y0, x1, y1, x2, y2, width, height) {
		return [
			{
				x: ((x0 + 1) * width * 0.5 + 0.5) | 0,
				y: ((1 - y0) * height * 0.5 + 0.5) | 0,
			},
			{
				x: ((x1 + 1) * width * 0.5 + 0.5) | 0,
				y: ((1 - y1) * height * 0.5 + 0.5) | 0,
			},
			{
				x: ((x2 + 1) * width * 0.5 + 0.5) | 0,
				y: ((1 - y2) * height * 0.5 + 0.5) | 0,
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
	 * @param {Float32Array} worldNormals Stride-3 flat buffer
	 * @param {number} i0
	 * @param {number} i1
	 * @param {number} i2
	 * @returns {Vec3}
	 */
	#avgNormal(worldNormals, i0, i1, i2) {
		if (worldNormals.length === 0) return { x: 0, y: 1, z: 0 };
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
