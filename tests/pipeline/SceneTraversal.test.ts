import { describe, expect, it } from "bun:test";
import { Side } from "@/core/Constants.ts";
import { Matrix4 } from "@/math/Matrix4.js";
import { DrawList } from "@/pipeline/DrawList.js";
import { SceneTraversal } from "@/pipeline/SceneTraversal.js";
import type { TriangleBuffer } from "@/pipeline/TriangleBuffer.js";
import { defined } from "../_helpers/defined.js";
import {
	getFirstTriangleBufferLength,
	makeTraversalCamera as makeCamera,
	makeTraversalMeshNode as makeMeshNode,
	makeTraversalScene as makeScene,
} from "../_helpers/scene-traversal.js";

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

	it("calls scene.updateMatrixWorld with correct this binding", () => {
		const scene = {
			visible: true,
			children: [],
			updated: false,
			updateMatrixWorld(updateParents?: boolean, updateChildren?: boolean) {
				// will throw if called unbound (this === undefined)
				this.updated = updateParents === true && updateChildren === true;
			},
		};

		expect(() =>
			traversal.traverse(
				scene as unknown as Parameters<SceneTraversal["traverse"]>[0],
				makeCamera(),
			),
		).not.toThrow();
		expect(scene.updated).toBe(true);
	});

	it("scene with 2 visible meshes produces 2 draw calls", () => {
		const scene = makeScene(makeMeshNode(), makeMeshNode());
		const result = traversal.traverse(
			scene as unknown as Parameters<SceneTraversal["traverse"]>[0],
			makeCamera(),
		);
		expect(result.length).toBe(2);
	});

	it("reuses DrawCall instances across traverse calls", () => {
		const scene = makeScene(makeMeshNode());
		const cam = makeCamera();
		const first = traversal.traverse(scene, cam).calls[0];
		const second = traversal.traverse(scene, cam).calls[0];
		expect(second).toBe(first);
	});

	it("attaches a matching geometry color attribute without copying it", () => {
		const colors = new Float32Array([
			1, 0, 0,
			1, 0, 0,
			1, 0, 0,
		]);
		const attrs = new Map([
			[
				"position",
				{
					array: new Float32Array([0, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0]),
					itemSize: 3,
				},
			],
			["color", { array: colors, itemSize: 3 }],
		]);
		const node = {
			type: "Mesh",
			visible: true,
			children: [],
			matrixWorld: new Matrix4(),
			updateMatrixWorld: () => {
				/* no-op */
			},
			geometry: {
				getAttribute: (name: string) => attrs.get(name),
				index: { array: new Uint16Array([0, 1, 2]) },
			},
			material: { side: Side.Double, shading: 0 },
		};
		const result = traversal.traverse(makeScene(node), makeCamera(), 100, 100);
		const drawCall = defined(result.calls[0]);
		expect(drawCall.vertexColorData).toBe(colors);
		expect(drawCall.vertexColorItemSize).toBe(3);

		attrs.set("color", { array: new Float32Array(12), itemSize: 4 });
		const reusedResult = traversal.traverse(
			makeScene(node),
			makeCamera(),
			100,
			100,
		);
		const reusedDrawCall = defined(reusedResult.calls[0]);
		expect(reusedDrawCall).toBe(drawCall);
		expect(reusedDrawCall.vertexColorData.length).toBe(0);
		expect(reusedDrawCall.vertexColorItemSize).toBe(0);
	});

	it("invisible mesh is excluded", () => {
		const scene = makeScene(makeMeshNode(true), makeMeshNode(false));
		const result = traversal.traverse(
			scene as unknown as Parameters<SceneTraversal["traverse"]>[0],
			makeCamera(),
		);
		expect(result.length).toBe(1);
	});

	it("nested visible mesh is included", () => {
		const inner = makeMeshNode();
		const outer = { ...makeMeshNode(true), children: [inner] };
		const scene = makeScene(outer);
		const result = traversal.traverse(
			scene as unknown as Parameters<SceneTraversal["traverse"]>[0],
			makeCamera(),
		);
		expect(result.length).toBe(2);
	});

	// Backface culling tests
	// CCW triangle (v0 top, v1 bottom-left, v2 bottom-right) in NDC produces:
	//   with width=height=100: sx0=50,sy0=25, sx1=25,sy1=75, sx2=75,sy2=75
	//   cross = (25-50)*(75-25) - (75-25)*(75-50) = -2500 → negative → front-facing
	function makeMeshNodeWithSide(positions: ArrayLike<number>, side: number) {
		return {
			type: "Mesh",
			visible: true,
			children: [],
			matrixWorld: new Matrix4(),
			updateMatrixWorld: () => {
				/* no-op */
			},
			geometry: {
				getAttribute: (name: string) => {
					if (name === "position")
						return {
							array: new Float32Array(positions),
							itemSize: 3,
						};
					if (name === "normal")
						return {
							array: new Float32Array([0, 0, -1, 0, 0, -1, 0, 0, -1]),
							itemSize: 3,
						};
					return null;
				},
				index: { array: new Uint16Array([0, 1, 2]) },
			},
			material: { side, shading: 0 },
		};
	}

	// CCW positions → cross < 0 → front-facing in screen space
	const ccwPositions = [0, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0];
	// CW positions (v1/v2 swapped) → cross > 0 → back-facing in screen space
	const cwPositions = [0, 0.5, 0, 0.5, -0.5, 0, -0.5, -0.5, 0];

	it("Side.Front: CCW (front-facing) triangle is included in drawList", () => {
		const scene = makeScene(makeMeshNodeWithSide(ccwPositions, Side.Front));
		const result = traversal.traverse(scene, makeCamera(), 100, 100);
		expect(result.length).toBe(1);
		expect(getFirstTriangleBufferLength(result)).toBe(1);
	});

	it("Side.Front: CW (back-facing) triangle is culled - triangle buffer empty", () => {
		const scene = makeScene(makeMeshNodeWithSide(cwPositions, Side.Front));
		const result = traversal.traverse(scene, makeCamera(), 100, 100);
		// Draw call is still created (node is visible), but backface culled
		expect(result.length).toBe(1);
		expect(getFirstTriangleBufferLength(result)).toBe(0);
	});

	it("Side.Back: CW (back-facing) triangle is included", () => {
		const scene = makeScene(makeMeshNodeWithSide(cwPositions, Side.Back));
		const result = traversal.traverse(scene, makeCamera(), 100, 100);
		expect(result.length).toBe(1);
		expect(getFirstTriangleBufferLength(result)).toBe(1);
	});

	it("Side.Double: both CCW and CW triangles are included", () => {
		const sceneA = makeScene(makeMeshNodeWithSide(ccwPositions, Side.Double));
		const sceneB = makeScene(makeMeshNodeWithSide(cwPositions, Side.Double));
		const resultA = traversal.traverse(sceneA, makeCamera(), 100, 100);
		const resultB = traversal.traverse(sceneB, makeCamera(), 100, 100);
		expect(getFirstTriangleBufferLength(resultA)).toBe(1);
		expect(getFirstTriangleBufferLength(resultB)).toBe(1);
	});

	it("Points preserve every visible vertex without triangle culling", () => {
		const node = {
			type: "Points",
			visible: true,
			children: [],
			matrixWorld: new Matrix4(),
			updateMatrixWorld: () => {
				/* no-op */
			},
			geometry: {
				getAttribute: (name: string) => {
					if (name === "position") {
						return {
							array: new Float32Array([
								-0.75, -0.75, 0, 0.75, -0.75, 0, -0.75, 0.75, 0, 0.75, 0.75, 0,
							]),
							itemSize: 3,
						};
					}
					return undefined;
				},
				index: undefined,
			},
			material: { points: true, side: Side.Front, shading: 0 },
		};

		const scene = makeScene(node as unknown as ReturnType<typeof makeMeshNode>);
		const result = traversal.traverse(scene, makeCamera(), 100, 100);
		const triangles = defined(result.calls[0]).triangles as TriangleBuffer;
		expect(triangles.length).toBe(2);
		expect(Array.from(triangles.vertexIndex.slice(0, 6))).toEqual([
			0, 1, 2, 3, 3, 3,
		]);
	});

	// Near-plane clipping: w <= 0 causes triangle to be skipped
	// A perspective-style projection with me[11]=-1, me[15]=0 gives w = -z.
	// Vertices at z=1 → w=-1 ≤ 0 → all three vertices clipped → triangle skipped.
	function makePerspCamera() {
		const proj = new Matrix4();
		// Column-major layout: me[11] is row3/col2 → w += -1*z; me[15]=0 eliminates constant term
		proj.elements[10] = -1;
		proj.elements[11] = -1;
		proj.elements[14] = -1;
		proj.elements[15] = 0;
		const inv = new Matrix4();
		return {
			matrixWorldInverse: inv,
			projectionMatrix: proj,
			updateMatrixWorld: () => {
				/* no-op */
			},
			position: { x: 0, y: 0, z: 0 },
		};
	}

	it("near-plane clip: vertices with w <= 0 are excluded from triangle buffer", () => {
		// Positions at z=1 → with perspective camera w = -z = -1 ≤ 0 → clipped
		const node = makeMeshNodeWithSide(
			[0, 0.5, 1, -0.5, -0.5, 1, 0.5, -0.5, 1],
			Side.Double,
		);
		const scene = makeScene(node);
		const result = traversal.traverse(scene, makePerspCamera(), 100, 100);
		expect(result.length).toBe(1);
		expect(getFirstTriangleBufferLength(result)).toBe(0);
	});

	// Light collection tests
	it("AmbientLight is collected as type 'ambient' in drawList.lights", () => {
		const light = {
			type: "AmbientLight",
			visible: true,
			children: [],
			color: { r: 1, g: 1, b: 1 },
			intensity: 0.5,
		};
		const scene = makeScene(light);
		const result = traversal.traverse(
			scene as unknown as Parameters<SceneTraversal["traverse"]>[0],
			makeCamera(),
		);
		expect(result.lights).toHaveLength(1);
		expect(defined(result.lights[0])["type"]).toBe("ambient");
		expect(defined(result.lights[0])["intensity"]).toBe(0.5);
	});

	it("DirectionalLight is collected as type 'directional' in drawList.lights", () => {
		const light = {
			type: "DirectionalLight",
			visible: true,
			children: [],
			position: { x: 0, y: 1, z: 0 },
			color: { r: 1, g: 1, b: 1 },
			intensity: 1,
		};
		const scene = makeScene(light);
		const result = traversal.traverse(
			scene as unknown as Parameters<SceneTraversal["traverse"]>[0],
			makeCamera(),
		);
		expect(result.lights).toHaveLength(1);
		expect(defined(result.lights[0])["type"]).toBe("directional");
	});

	it("HemisphereLight is collected as type 'hemisphere' in drawList.lights", () => {
		const light = {
			type: "HemisphereLight",
			visible: true,
			children: [],
			position: { x: 0, y: 1, z: 0 },
			color: { r: 1, g: 1, b: 1 },
			groundColor: { r: 0.2, g: 0.2, b: 0.2 },
			intensity: 1,
		};
		const scene = makeScene(light);
		const result = traversal.traverse(
			scene as unknown as Parameters<SceneTraversal["traverse"]>[0],
			makeCamera(),
		);
		expect(result.lights).toHaveLength(1);
		expect(defined(result.lights[0])["type"]).toBe("hemisphere");
	});

	// Non-indexed geometry: sequential indices generated and cached on geometry
	it("non-indexed geometry generates _sequentialIndices on the geometry object", () => {
		const geometry = {
			getAttribute: (name: string) => {
				if (name === "position")
					return {
						array: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
						itemSize: 3,
					};
				return null;
			},
			index: undefined,
		};
		const node = {
			type: "Mesh",
			visible: true,
			children: [],
			matrixWorld: new Matrix4(),
			updateMatrixWorld: () => {
				/* no-op */
			},
			geometry,
			material: { side: Side.Double, shading: 0 },
		};
		const scene = makeScene(node);
		traversal.traverse(scene, makeCamera(), 100, 100);
		expect(
			(geometry as unknown as { _sequentialIndices: Uint32Array })
				._sequentialIndices,
		).toBeInstanceOf(Uint32Array);
		expect(
			(geometry as unknown as { _sequentialIndices: Uint32Array })
				._sequentialIndices.length,
		).toBe(3);
		expect(
			Array.from(
				(geometry as unknown as { _sequentialIndices: Uint32Array })
					._sequentialIndices,
			),
		).toEqual([0, 1, 2]);
	});

	it("scene.autoUpdate calls updateMatrixWorld on visible meshes", () => {
		let called = false;
		const mesh = makeMeshNode();
		mesh.updateMatrixWorld = () => {
			called = true;
		};
		const scene = makeScene(mesh);
		scene.autoUpdate = true;
		traversal.traverse(
			scene as unknown as Parameters<SceneTraversal["traverse"]>[0],
			makeCamera(),
		);
		expect(called).toBe(true);
	});

	it("scene.autoUpdate=false skips mesh updateMatrixWorld", () => {
		let called = false;
		const mesh = makeMeshNode();
		mesh.updateMatrixWorld = () => {
			called = true;
		};
		const scene = makeScene(mesh);
		scene.autoUpdate = false;
		traversal.traverse(
			scene as unknown as Parameters<SceneTraversal["traverse"]>[0],
			makeCamera(),
		);
		expect(called).toBe(false);
	});

	// UV caching: _uvCache is built on first traversal and reused on second
	it("second traversal reuses _uvCache - same Float32Array reference", () => {
		const geometry = {
			getAttribute: (name: string) => {
				if (name === "position")
					return {
						array: new Float32Array(ccwPositions),
						itemSize: 3,
					};
				if (name === "uv")
					return {
						array: new Float32Array([0, 0, 1, 0, 0.5, 1]),
						itemSize: 2,
					};
				return null;
			},
			index: { array: new Uint16Array([0, 1, 2]) },
		};
		const node = {
			type: "Mesh",
			visible: true,
			children: [],
			matrixWorld: new Matrix4(),
			updateMatrixWorld: () => {
				/* no-op */
			},
			geometry,
			material: {
				side: Side.Double,
				shading: 0,
				map: { data: { data: new Uint8Array([0]), width: 1, height: 1 } },
			},
		};
		const scene = makeScene(node);
		traversal.traverse(scene, makeCamera(), 100, 100);
		const cacheAfterFirst = (geometry as unknown as { _uvCache: Float32Array })
			._uvCache;
		expect(cacheAfterFirst).toBeInstanceOf(Float32Array);

		traversal.traverse(scene, makeCamera(), 100, 100);
		expect((geometry as unknown as { _uvCache: Float32Array })._uvCache).toBe(
			cacheAfterFirst,
		);
	});
});
