import { Matrix4 } from "@/math/Matrix4.js";
import type { SceneTraversal } from "@/pipeline/SceneTraversal.js";
import type { TriangleBuffer } from "@/pipeline/TriangleBuffer.js";
import { defined } from "./defined.js";

type TraversalScene = Parameters<SceneTraversal["traverse"]>[0];
type TraversalCamera = Parameters<SceneTraversal["traverse"]>[1];

export function makeTraversalCamera(): TraversalCamera {
	const matrix = new Matrix4();
	return {
		matrixWorldInverse: matrix,
		projectionMatrix: matrix,
		updateMatrixWorld: () => {
			/* no-op */
		},
		position: { x: 0, y: 0, z: 0 },
	} as unknown as TraversalCamera;
}

export function makeTraversalMeshNode(visible = true) {
	return {
		type: "Mesh",
		visible,
		children: [],
		matrixWorld: new Matrix4(),
		updateMatrixWorld: () => {
			/* no-op */
		},
		geometry: {
			getAttribute: () => ({
				array: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
				itemSize: 3,
			}),
			index: undefined,
		},
		material: { color: 0xffffff },
	};
}

export function makeTraversalScene(...children: unknown[]): TraversalScene {
	return { visible: true, children } as unknown as TraversalScene;
}

export function getFirstTriangleBufferLength(
	result: ReturnType<SceneTraversal["traverse"]>,
): number {
	return (defined(result.calls[0]).triangles as TriangleBuffer).length;
}
