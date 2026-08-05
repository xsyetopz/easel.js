import { describe, expect, it } from "bun:test";
import { PerspectiveCamera } from "@/cameras/PerspectiveCamera.ts";
import { Node } from "@/core/Node.ts";
import { LOD } from "@/objects/LOD.ts";

describe("LOD", () => {
  it("uses accessors and explicit updates instead of THREE.js compatibility controls", () => {
    const lod = new LOD() as LOD & Record<string, unknown>;
    expect(lod.currentLevel).toBe(0);
    expect(lod["getCurrentLevel"]).toBeUndefined();
    expect(lod["autoUpdate"]).toBeUndefined();
  });

  it("sorts levels by normalized distance and owns their nodes", () => {
    const lod = new LOD();
    const near = new Node();
    const far = new Node();

    expect(lod.addLevel(far, 20).addLevel(near, -5)).toBe(lod);
    expect(lod.levels.map((level) => level.distance)).toEqual([5, 20]);
    expect(lod.children).toEqual([far, near]);
    expect(near.parent).toBe(lod);
    expect(far.parent).toBe(lod);
  });

  it("selects one visible level from prepared world matrices", () => {
    const lod = new LOD();
    const near = new Node();
    const middle = new Node();
    const far = new Node();
    lod.addLevel(near).addLevel(middle, 10).addLevel(far, 20);
    lod.matrixWorld.makeTranslation(0, 0, 0);

    const camera = new PerspectiveCamera();
    camera.matrixWorld.makeTranslation(0, 0, 15);
    expect(lod.update(camera)).toBe(lod);
    expect(lod.currentLevel).toBe(1);
    expect([near.visible, middle.visible, far.visible]).toEqual([
      false,
      true,
      false,
    ]);
  });

  it("does not update matrices implicitly", () => {
    const lod = new LOD();
    lod.addLevel(new Node()).addLevel(new Node(), 10);
    lod.position.set(100, 0, 0);

    const camera = new PerspectiveCamera();
    camera.position.set(100, 0, 0);
    camera.matrixWorld.makeTranslation(0, 0, 20);
    lod.matrixWorld.identity();
    lod.update(camera);

    expect(lod.currentLevel).toBe(1);
    expect(lod.matrixWorld.elements[12]).toBe(0);
    expect(camera.matrixWorld.elements[12]).toBe(0);
  });

  it("uses hysteresis only for the currently visible farther level", () => {
    const lod = new LOD();
    const near = new Node();
    const far = new Node();
    lod.addLevel(near).addLevel(far, 10, 0.1);
    lod.matrixWorld.identity();
    const camera = new PerspectiveCamera();

    camera.matrixWorld.makeTranslation(0, 0, 11);
    lod.update(camera);
    expect(lod.currentLevel).toBe(1);

    camera.matrixWorld.makeTranslation(0, 0, 9.5);
    lod.update(camera);
    expect(lod.currentLevel).toBe(1);

    camera.matrixWorld.makeTranslation(0, 0, 8.9);
    lod.update(camera);
    expect(lod.currentLevel).toBe(0);
  });

  it("returns the selected object without changing visibility", () => {
    const lod = new LOD();
    const near = new Node();
    const far = new Node();
    lod.addLevel(near).addLevel(far, 10);
    near.visible = true;
    far.visible = false;

    expect(lod.getObjectForDistance(12)).toBe(far);
    expect([near.visible, far.visible]).toEqual([true, false]);
    expect(new LOD().getObjectForDistance(0)).toBeUndefined();
  });

  it("removes normalized distances and their child nodes", () => {
    const lod = new LOD();
    const level = new Node();
    lod.addLevel(level, 10);

    expect(lod.removeLevel(-10)).toBe(true);
    expect(lod.levels).toEqual([]);
    expect(level.parent).toBeUndefined();
    expect(lod.removeLevel(10)).toBe(false);
  });

  it("rejects invalid level thresholds", () => {
    const lod = new LOD();
    expect(() => lod.addLevel(new Node(), Number.POSITIVE_INFINITY)).toThrow(
      RangeError,
    );
    expect(() => lod.addLevel(new Node(), 1, -0.1)).toThrow(RangeError);
    expect(() => lod.addLevel(new Node(), 1, 1.1)).toThrow(RangeError);
  });

  it("clones levels without sharing their nodes", () => {
    const lod = new LOD();
    const level = new Node();
    level.name = "near";
    lod.addLevel(level, 2, 0.25);

    const clone = lod.clone();
    expect(clone).toBeInstanceOf(LOD);
    expect(clone.levels).toHaveLength(1);
    expect(clone.levels[0]).toMatchObject({ distance: 2, hysteresis: 0.25 });
    expect(clone.levels[0].object).not.toBe(level);
    expect(clone.levels[0].object.name).toBe("near");
  });
});
