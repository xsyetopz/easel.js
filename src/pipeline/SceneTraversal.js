import { Matrix4 } from "../math/Matrix4.js";
import { Vector3 } from "../math/Vector3.js";
import { DrawCall } from "./DrawCall.js";
import { DrawList } from "./DrawList.js";

const _mvp = new Matrix4();
const _worldPos = new Vector3();

export class SceneTraversal {
	/**
	 * Walks the scene graph and builds a DrawList of visible meshes with
	 * projected vertices.
	 * @param {{ children: *, visible: boolean, fog?: * }} scene
	 * @param {{ matrixWorldInverse: Matrix4, projectionMatrix: Matrix4, updateMatrixWorld: () => void }} camera
	 * @returns {DrawList}
	 */
	traverse(scene, camera) {
		camera.updateMatrixWorld();
		const drawList = new DrawList();
		this.#walk(/** @type {*} */ (scene), drawList, camera);
		return drawList;
	}

	/**
	 * Recursively walks visible nodes and adds draw calls for meshes.
	 * @param {{ type?: string, visible: boolean, children: *, geometry?: *, material?: *, matrixWorld: Matrix4, updateMatrixWorld: (p: boolean, c: boolean) => void }} node
	 * @param {DrawList} drawList
	 * @param {{ matrixWorldInverse: Matrix4, projectionMatrix: Matrix4 }} camera
	 * @returns {void}
	 */
	#walk(node, drawList, camera) {
		if (!node.visible) return;

		if (node.type === "Mesh" && node.geometry && node.material) {
			node.updateMatrixWorld(false, false);

			const drawCall = new DrawCall(
				/** @type {import('../objects/Mesh.js').Mesh} */ (
					/** @type {unknown} */ (node)
				),
				node.material,
			);

			// Build MVP: projection * view * world
			_mvp
				.copy(camera.projectionMatrix)
				.mul(camera.matrixWorldInverse)
				.mul(node.matrixWorld);

			const posAttr = node.geometry.getAttribute("position");
			const index = node.geometry.index;

			if (posAttr) {
				const arr = posAttr.array;
				const itemSize = posAttr.itemSize ?? 3;
				const count = arr.length / itemSize;
				drawCall.projectedVerts = new Array(count);

				for (let i = 0; i < count; i++) {
					const ox = arr[i * itemSize];
					const oy = arr[i * itemSize + 1];
					const oz = arr[i * itemSize + 2];

					_worldPos.set(ox, oy, oz).applyMatrix4(_mvp);
					drawCall.projectedVerts[i] = {
						x: _worldPos.x,
						y: _worldPos.y,
						z: _worldPos.z,
					};
				}
			}

			if (index) {
				drawCall.faceIndices = Array.from(index.array ?? index);
			}

			drawList.add(drawCall);
		}

		for (const child of node.children) {
			this.#walk(child, drawList, camera);
		}
	}
}
