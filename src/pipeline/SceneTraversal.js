import { Side } from "../core/Constants.js";
import { Matrix4 } from "../math/Matrix4.js";
import { Vector3 } from "../math/Vector3.js";
import { DrawCall } from "./DrawCall.js";
import { DrawList } from "./DrawList.js";

const _mvp = new Matrix4();
const _worldPos = new Vector3();

/** @typedef {{ x: number, y: number, z: number }} Vec3 */

export class SceneTraversal {
	/**
	 * @param {{ children: *, visible: boolean, fog?: * }} scene
	 * @param {{ matrixWorldInverse: Matrix4, projectionMatrix: Matrix4, updateMatrixWorld: () => void }} camera
	 * @param {number} [width]
	 * @param {number} [height]
	 * @returns {DrawList}
	 */
	traverse(scene, camera, width = 300, height = 150) {
		camera.updateMatrixWorld();
		const drawList = new DrawList();
		this.#walk(/** @type {*} */ (scene), drawList, camera, width, height);
		return drawList;
	}

	/**
	 * @param {{ type?: string, visible: boolean, children: *, geometry?: *, material?: *, matrixWorld: Matrix4, updateMatrixWorld: (p: boolean, c: boolean) => void }} node
	 * @param {DrawList} drawList
	 * @param {{ matrixWorldInverse: Matrix4, projectionMatrix: Matrix4 }} camera
	 * @param {number} width
	 * @param {number} height
	 * @returns {void}
	 */
	#walk(node, drawList, camera, width, height) {
		if (!node.visible) return;

		if (node.type === "Mesh" && node.geometry && node.material) {
			drawList.add(
				this.#buildDrawCall(
					/** @type {{ matrixWorld: Matrix4, geometry: *, material: *, updateMatrixWorld: (p: boolean, c: boolean) => void }} */ (
						/** @type {unknown} */ (node)
					),
					camera,
					width,
					height,
				),
			);
		} else if (typeof node.type === "string" && node.type.endsWith("Light")) {
			this.#collectLight(/** @type {any} */ (node), drawList);
		}

		for (const child of node.children) {
			this.#walk(child, drawList, camera, width, height);
		}
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
			drawCall.projectedVerts = new Array(count);
			for (let i = 0; i < count; i++) {
				_worldPos
					.set(arr[i * itemSize], arr[i * itemSize + 1], arr[i * itemSize + 2])
					.applyMatrix4(_mvp);
				drawCall.projectedVerts[i] = {
					x: _worldPos.x,
					y: _worldPos.y,
					z: _worldPos.z,
				};
			}
		}

		const index = node.geometry.index;
		if (index) {
			drawCall.faceIndices = Array.from(index.array ?? index);
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
	 * Reads the geometry uv attribute into a flat array of {u, v} per vertex.
	 * Returns an empty array if the geometry has no uv attribute.
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
	 * @param {Array<Vec3>} verts Projected (NDC) vertices with x, y, z
	 * @param {Array<Vec3>} worldNormals
	 * @param {Array<{ u: number, v: number }>} uvs
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
			const v0 = verts[i0];
			const v1 = verts[i1];
			const v2 = verts[i2];

			const sx0 = Math.trunc(((v0.x + 1) * width) / 2);
			const sy0 = Math.trunc(((1 - v0.y) * height) / 2);
			const sx1 = Math.trunc(((v1.x + 1) * width) / 2);
			const sy1 = Math.trunc(((1 - v1.y) * height) / 2);
			const sx2 = Math.trunc(((v2.x + 1) * width) / 2);
			const sy2 = Math.trunc(((1 - v2.y) * height) / 2);

			// Screen-space signed area (2D cross product).
			// Positive = front-facing (CCW with Y-down screen coords).
			const cross = (sx1 - sx0) * (sy2 - sy0) - (sy1 - sy0) * (sx2 - sx0);
			if (this.#isCulled(cross, side)) continue;

			const screenVerts = [
				{ x: sx0, y: sy0 },
				{ x: sx1, y: sy1 },
				{ x: sx2, y: sy2 },
			];

			const faceNormal = this.#avgNormal(worldNormals, i0, i1, i2);

			/** @type {import('./DrawCall.js').DrawCall['triangles'][0]} */
			const tri = {
				screenVerts,
				normal: faceNormal,
				vertices: [
					{ normal: worldNormals[i0] ?? faceNormal },
					{ normal: worldNormals[i1] ?? faceNormal },
					{ normal: worldNormals[i2] ?? faceNormal },
				],
				centroidZ: (v0.z + v1.z + v2.z) / 3,
			};

			if (uvs.length > 0) {
				tri.uvs = [
					uvs[i0] ?? { u: 0, v: 0 },
					uvs[i1] ?? { u: 0, v: 0 },
					uvs[i2] ?? { u: 0, v: 0 },
				];
			}

			triangles.push(tri);
		}

		return triangles;
	}

	/**
	 * Returns true if a triangle should be culled based on its screen-space
	 * signed area and the material's side setting.
	 * @param {number} cross Screen-space signed area (positive = front-facing)
	 * @param {number} side Material.side value (Side.Front, Side.Back, Side.Double)
	 * @returns {boolean}
	 */
	#isCulled(cross, side) {
		if (cross === 0) return true;
		if (side === Side.Front) return cross < 0;
		if (side === Side.Back) return cross > 0;
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
	 * @param {{ position?: *, color?: *, intensity?: number }} light
	 * @param {DrawList} drawList
	 * @returns {void}
	 */
	#collectLight(light, drawList) {
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
			direction: { x: pos.x / len, y: pos.y / len, z: pos.z / len },
			color: light.color,
			intensity: light.intensity,
		});
	}
}
