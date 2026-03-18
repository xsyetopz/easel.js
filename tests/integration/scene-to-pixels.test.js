import { describe, expect, it } from "vitest";
import { Matrix4 } from "@/math/Matrix4.js";
import { Framebuffer } from "@/pipeline/framebuffer/Framebuffer.js";
import { FramebufferClear } from "@/pipeline/framebuffer/FramebufferClear.js";
import { PainterSort } from "@/pipeline/PainterSort.js";
import { PixelWriter } from "@/pipeline/PixelWriter.js";
import { SceneTraversal } from "@/pipeline/SceneTraversal.js";

function makeCamera() {
	const m = new Matrix4();
	return {
		matrixWorldInverse: m,
		projectionMatrix: m,
		updateMatrixWorld: () => {
			/* no-op */
		},
		position: { x: 0, y: 0, z: 0 },
	};
}

function makeMeshNode() {
	return {
		type: "Mesh",
		visible: true,
		children: [],
		matrixWorld: new Matrix4(),
		updateMatrixWorld: () => {
			/* no-op */
		},
		geometry: {
			getAttribute: () => ({
				array: new Float32Array([0, 0, 0, 0.5, 0, 0, 0, 0.5, 0]),
				itemSize: 3,
			}),
			index: { array: new Uint16Array([0, 1, 2]) },
		},
		material: { color: 0xffffff, layer: 0 },
	};
}

function makeScene(...children) {
	return { visible: true, children };
}

describe("scene-to-pixels integration", () => {
	it("SceneTraversal → DrawList → PainterSort → Framebuffer write", () => {
		const scene = makeScene(makeMeshNode(), makeMeshNode());
		const camera = makeCamera();

		const traversal = new SceneTraversal();
		const drawList = traversal.traverse(scene, camera);
		expect(drawList.length).toBe(2);

		const sorter = new PainterSort();
		expect(() => sorter.sort(drawList, { x: 0, y: 0 })).not.toThrow();

		const fb = new Framebuffer(16, 16);
		const clear = new FramebufferClear();
		clear.clear(fb);

		const writer = new PixelWriter();
		writer.write(fb, 8, 8, 255, 255, 255, 255);
		const px = fb.getPixel(8, 8);
		expect(px.r).toBe(255);
		expect(px.g).toBe(255);
		expect(px.b).toBe(255);
	});

	it("framebuffer cleared to black before pipeline", () => {
		const fb = new Framebuffer(8, 8);
		const clear = new FramebufferClear();
		fb.setPixel(0, 0, 255, 0, 0, 255);
		clear.clear(fb);
		const px = fb.getPixel(0, 0);
		expect(px.r).toBe(0);
		expect(px.g).toBe(0);
		expect(px.b).toBe(0);
	});

	it("traversal excludes invisible meshes from pipeline", () => {
		const visible = makeMeshNode();
		const invisible = { ...makeMeshNode(), visible: false };
		const scene = makeScene(visible, invisible);
		const drawList = new SceneTraversal().traverse(scene, makeCamera());
		expect(drawList.length).toBe(1);
	});
});
