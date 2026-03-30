import { describe, expect, it } from "vitest";
import { LambertMaterial } from "@/materials/LambertMaterial.js";
import { Matrix4 } from "@/math/Matrix4.js";
import { DrawList } from "@/pipeline/DrawList.js";
import { buildInstancedDrawCalls } from "@/pipeline/InstancedMeshBuilder.js";
import type { TriangleBuffer } from "@/pipeline/TriangleBuffer.js";

function makeCamera() {
	const m = new Matrix4();
	return {
		matrixWorldInverse: m,
		projectionMatrix: m,
	};
}

describe("InstancedMeshBuilder", () => {
	it("reuses per-instance DrawCall + material + color objects", () => {
		const material = new LambertMaterial({ color: 0xffffff });

		const node = {
			matrixWorld: new Matrix4(),
			geometry: {
				getAttribute: (name: string) => {
					if (name === "position") {
						return {
							array: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
							itemSize: 3,
						};
					}
					if (name === "normal") {
						return {
							array: new Float32Array([0, 0, -1, 0, 0, -1, 0, 0, -1]),
							itemSize: 3,
						};
					}
					return undefined;
				},
				index: { array: new Uint16Array([0, 1, 2]) },
			},
			material,
			instanceMatrix: new Float32Array([
				1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
			]),
			instanceColor: new Float32Array([0.5, 0.25, 0.75]),
			count: 1,
			frustumCulled: false,
		};

		const fogState = { hasFog: false, fogFar: 0 };
		const frustum = { intersectsSphere: () => true };
		const assembleTrianglesFn = (
			_indices: ArrayLike<number>,
			_verts: Float32Array,
			_worldNormals: Float32Array,
			_uvs: Float32Array,
			_width: number,
			_height: number,
			_material: unknown,
			tmp: { _triangleBuffer?: TriangleBuffer },
		) => tmp._triangleBuffer as TriangleBuffer;
		const buildUvsFn = () => new Float32Array(0);

		const dl1 = new DrawList();
		buildInstancedDrawCalls(
			node as never,
			makeCamera() as never,
			frustum as never,
			64,
			64,
			dl1,
			fogState,
			assembleTrianglesFn as never,
			buildUvsFn as never,
		);
		expect(dl1.calls).toHaveLength(1);
		const dc1 = dl1.calls[0];
		const mat1 = dc1.material as unknown as { color?: unknown };
		const col1 = mat1.color as { r: number; g: number; b: number };
		expect(col1.r).toBeCloseTo(0.5);
		expect(col1.g).toBeCloseTo(0.25);
		expect(col1.b).toBeCloseTo(0.75);

		// Mutate instanceColor to ensure the cached color object is updated, not replaced.
		(node.instanceColor as Float32Array)[0] = 0.2;

		const dl2 = new DrawList();
		buildInstancedDrawCalls(
			node as never,
			makeCamera() as never,
			frustum as never,
			64,
			64,
			dl2,
			fogState,
			assembleTrianglesFn as never,
			buildUvsFn as never,
		);
		expect(dl2.calls).toHaveLength(1);
		const dc2 = dl2.calls[0];
		const mat2 = dc2.material as unknown as { color?: unknown };
		const col2 = mat2.color as { r: number; g: number; b: number };

		expect(dc2).toBe(dc1);
		expect(mat2).toBe(mat1);
		expect(col2).toBe(col1);
		expect(col2.r).toBeCloseTo(0.2);
	});
});
