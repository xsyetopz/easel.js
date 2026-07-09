import { describe, expect, it } from "bun:test";
import { Matrix4 } from "@/math/Matrix4.js";
import { Bone } from "@/objects/Bone.ts";
import { Skeleton } from "@/objects/Skeleton.js";

describe("Skeleton", () => {
	function makeBone(name: string) {
		const b = new Bone();
		b.name = name;
		return b;
	}

	it("stores bones array", () => {
		const b = makeBone("hip");
		const sk = new Skeleton([b]);
		expect(sk.bones).toHaveLength(1);
		expect(sk.bones[0].name).toBe("hip");
	});

	it("allocates boneMatrices Float32Array sized bones*16", () => {
		const sk = new Skeleton([makeBone("a"), makeBone("b")]);
		expect(sk.boneMatrices).toBeInstanceOf(Float32Array);
		expect(sk.boneMatrices.length).toBe(32);
	});

	it("calculateInverses populates boneInverses", () => {
		const b = makeBone("hip");
		const sk = new Skeleton([b]);
		sk.calculateInverses();
		expect(sk.boneInverses).toHaveLength(1);
		expect(sk.boneInverses[0]).toBeInstanceOf(Matrix4);
	});

	it("getBoneByName returns matching bone", () => {
		const b1 = makeBone("hip");
		const b2 = makeBone("spine");
		const sk = new Skeleton([b1, b2]);
		expect(sk.getBoneByName("spine")).toBe(b2);
	});

	it("getBoneByName returns undefined for unknown name", () => {
		const sk = new Skeleton([makeBone("hip")]);
		expect(sk.getBoneByName("unknown")).toBeUndefined();
	});

	it("update writes bone matrices from matrixWorld * boneInverse", () => {
		const b = makeBone("hip");
		b.matrixWorld.identity();
		const inv = new Matrix4().identity();
		const sk = new Skeleton([b], [inv]);
		sk.update();
		// identity * identity = identity, first element should be 1
		expect(sk.boneMatrices[0]).toBeCloseTo(1);
	});

	it("dispose clears internal arrays", () => {
		const sk = new Skeleton([makeBone("hip")]);
		sk.dispose();
		expect(sk.bones).toEqual([]);
		expect(sk.boneInverses).toEqual([]);
		expect(sk.boneMatrices).toEqual(new Float32Array(0));
	});
});
