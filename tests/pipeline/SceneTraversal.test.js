import { describe, expect, it } from "vitest";
import { Matrix4 } from "@/math/Matrix4.js";
import { DrawList } from "@/pipeline/DrawList.js";
import { SceneTraversal } from "@/pipeline/SceneTraversal.js";

function makeCamera() {
	const m = new Matrix4();
	return {
		matrixWorldInverse: m,
		projectionMatrix: m,
		updateMatrixWorld: () => {
			/* no-op */
		},
	};
}

function makeMeshNode(visible = true) {
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

function makeScene(...children) {
	return { visible: true, children };
}

describe("SceneTraversal", () => {
	const traversal = new SceneTraversal();

	it("returns a DrawList", () => {
		const result = traversal.traverse(makeScene(), makeCamera());
		expect(result).toBeInstanceOf(DrawList);
	});

	it("empty scene produces empty DrawList", () => {
		const result = traversal.traverse(makeScene(), makeCamera());
		expect(result.length).toBe(0);
	});

	it("scene with 2 visible meshes produces 2 draw calls", () => {
		const scene = makeScene(makeMeshNode(), makeMeshNode());
		const result = traversal.traverse(scene, makeCamera());
		expect(result.length).toBe(2);
	});

	it("invisible mesh is excluded", () => {
		const scene = makeScene(makeMeshNode(true), makeMeshNode(false));
		const result = traversal.traverse(scene, makeCamera());
		expect(result.length).toBe(1);
	});

	it("nested visible mesh is included", () => {
		const inner = makeMeshNode();
		const outer = { ...makeMeshNode(true), children: [inner] };
		const scene = makeScene(outer);
		const result = traversal.traverse(scene, makeCamera());
		expect(result.length).toBe(2);
	});
});
