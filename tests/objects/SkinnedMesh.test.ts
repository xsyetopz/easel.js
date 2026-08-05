import { describe, expect, it } from "bun:test";
import { BindMode } from "@/core/Constants.ts";
import { Matrix4 } from "@/math/Matrix4.js";
import { Bone } from "@/objects/Bone.ts";
import { Mesh } from "@/objects/Mesh.js";
import { Skeleton } from "@/objects/Skeleton.js";
import { SkinnedMesh } from "@/objects/SkinnedMesh.js";

describe("SkinnedMesh", () => {
  it("has type='SkinnedMesh'", () => {
    expect(new SkinnedMesh().type).toBe("SkinnedMesh");
  });

  it("inherits from Mesh", () => {
    expect(new SkinnedMesh()).toBeInstanceOf(Mesh);
  });

  it("bindMode defaults to BindMode.Attached", () => {
    expect(new SkinnedMesh().bindMode).toBe(BindMode.Attached);
  });

  it("bind stores skeleton reference", () => {
    const mesh = new SkinnedMesh();
    const bone = new Bone();
    const sk = new Skeleton([bone]);
    mesh.bind(sk);
    expect(mesh.skeleton).toBe(sk);
  });

  it("bind sets bindMatrixInverse as inverse of bindMatrix", () => {
    const mesh = new SkinnedMesh();
    const bone = new Bone();
    const sk = new Skeleton([bone]);
    const bm = new Matrix4().identity();
    mesh.bind(sk, bm);
    // inverse of identity is identity
    expect(mesh.bindMatrixInverse.elements[0]).toBeCloseTo(1);
    expect(mesh.bindMatrixInverse.elements[15]).toBeCloseTo(1);
  });

  it("copy preserves bindMode and skeleton ref", () => {
    const src = new SkinnedMesh();
    const bone = new Bone();
    const sk = new Skeleton([bone]);
    src.bind(sk);
    src.bindMode = BindMode.Detached;
    const dest = new SkinnedMesh();
    dest.copy(src);
    expect(dest.bindMode).toBe(BindMode.Detached);
    expect(dest.skeleton).toBe(sk);
  });

  it("clone returns SkinnedMesh", () => {
    const c = new SkinnedMesh().clone();
    expect(c).toBeInstanceOf(SkinnedMesh);
  });
});
