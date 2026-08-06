import { describe, expect, it } from "bun:test";
import { Animator } from "@/animation/Animator.js";
import { BVHLoader } from "@/loaders/BVHLoader.js";

const FIXTURE = `HIERARCHY
ROOT Hips
{
  OFFSET 0 1 0
  CHANNELS 6 Xposition Yposition Zposition Zrotation Xrotation Yrotation
  JOINT Chest
  {
    OFFSET 0 1 0
    CHANNELS 3 Xrotation Yrotation Zrotation
    End Site
    {
      OFFSET 0 1 0
    }
  }
}
MOTION
Frames: 2
Frame Time: 0.5
0 0 0 0 0 0 0 0 0
1 2 3 90 0 0 0 45 0`;

describe("BVHLoader", () => {
  it("builds an EASEL skeleton and THREE-compatible animation tracks", () => {
    const result = new BVHLoader().parse(FIXTURE);

    expect(result.frameCount).toBe(2);
    expect(result.frameTime).toBe(0.5);
    expect(result.root.name).toBe("Hips");
    expect(result.bones.map((bone) => bone.name)).toEqual([
      "Hips",
      "Chest",
      "ENDSITE",
    ]);
    expect(result.root.position.toArray()).toEqual([0, 1, 0]);
    expect(result.root.children[0]?.position.toArray()).toEqual([0, 1, 0]);
    expect(result.skeleton.bones).toHaveLength(3);
    expect(result.skeleton.boneMatrices).toHaveLength(48);
    expect(result.clip.name).toBe("animation");
    expect(result.clip.tracks.map((track) => track.name)).toEqual([
      "Hips.position",
      "Hips.quaternion",
      "Chest.position",
      "Chest.quaternion",
    ]);
    expect(Array.from(result.clip.tracks[0]?.values ?? [])).toEqual([
      0, 1, 0, 1, 3, 3,
    ]);
    expect(Array.from(result.clip.tracks[1]?.values ?? [])).toEqual([
      0,
      0,
      0,
      1,
      0,
      0,
      Math.fround(Math.SQRT1_2),
      Math.fround(Math.SQRT1_2),
    ]);
  });

  it("plays parsed motion through Animator and updates bone properties", () => {
    const result = new BVHLoader().parse(FIXTURE);
    const animator = new Animator(result.root);
    animator.clipAction(result.clip).play();
    animator.update(0.25);

    expect(result.root.position.x).toBeCloseTo(0.5);
    expect(result.root.position.y).toBeCloseTo(2);
    expect(result.root.position.z).toBeCloseTo(1.5);
    expect(result.root.quaternion.z).toBeCloseTo(Math.sin(Math.PI / 8));
    expect(result.bones[1]?.quaternion.y).toBeCloseTo(Math.sin(Math.PI / 16));
    result.root.updateMatrixWorld(false, true);
    result.skeleton.update();
    expect(result.skeleton.boneMatrices).toHaveLength(48);
  });

  it("supports disabling position or rotation track generation", () => {
    const positionsOnly = new BVHLoader(undefined, {
      animateBoneRotations: false,
    }).parse(FIXTURE);
    expect(positionsOnly.clip.tracks.map((track) => track.name)).toEqual([
      "Hips.position",
      "Chest.position",
    ]);

    const rotationsOnly = new BVHLoader(undefined, {
      animateBonePositions: false,
    }).parse(FIXTURE);
    expect(rotationsOnly.clip.tracks.map((track) => track.name)).toEqual([
      "Hips.quaternion",
      "Chest.quaternion",
    ]);
  });

  it("rejects malformed hierarchy and motion values", () => {
    expect(() =>
      new BVHLoader().parse(FIXTURE.replace("HIERARCHY", "BVH")),
    ).toThrow(/HIERARCHY/u);
    expect(() =>
      new BVHLoader().parse(FIXTURE.replace("Frames: 2", "Frames: 3")),
    ).toThrow(/motion values/u);
    expect(() =>
      new BVHLoader().parse(FIXTURE.replace("Xposition", "Qposition")),
    ).toThrow(/unsupported channel/u);
  });
});
