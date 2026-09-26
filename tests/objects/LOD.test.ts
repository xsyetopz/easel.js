import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { PerspectiveCamera } from "@/cameras/PerspectiveCamera.ts";
import { Node } from "@/core/Node.ts";
import { Scene } from "@/core/Scene.ts";
import { LOD } from "@/objects/LOD.ts";
import { Renderer } from "@/renderers/Renderer.ts";

describe("LOD", () => {
  // The old test pinned `autoUpdate` as undefined because EASEL only updated
  // LODs explicitly. r186 has `autoUpdate = true` and its renderer updates
  // each LOD once per frame, so that assertion now compares with three.js.
  it("uses a currentLevel accessor and three.js's autoUpdate default", () => {
    const lod = new LOD();
    const compatibilitySurface = lod as unknown as {
      getCurrentLevel?: unknown;
    };
    expect(lod.currentLevel).toBe(0);
    expect(compatibilitySurface.getCurrentLevel).toBeUndefined();
    expect(lod.autoUpdate).toBe(new THREE.LOD().autoUpdate);
    expect(lod.autoUpdate).toBe(true);
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

  it("copies autoUpdate", () => {
    const lod = new LOD();
    lod.autoUpdate = false;
    expect(lod.clone().autoUpdate).toBe(false);
  });
});

/** Builds matching three-level LODs in EASEL and three.js. */
function lodPair(hysteresis = 0) {
  const lod = new LOD();
  const threeLod = new THREE.LOD();
  for (const distance of [0, 10, 20]) {
    lod.addLevel(new Node(), distance, hysteresis);
    threeLod.addLevel(new THREE.Object3D(), distance, hysteresis);
  }
  return { lod, threeLod };
}

function visibility(levels: readonly { object: { visible: boolean } }[]) {
  return levels.map((level) => level.object.visible);
}

describe("LOD auto-update vs THREE.LOD", () => {
  // three.js r186's WebGLRenderer calls `lod.update(camera)` for every
  // visible LOD with `autoUpdate` while projecting the scene; EASEL does it
  // in Renderer.prepare, reusing the scene matrix pass.
  it("Renderer.prepare updates LODs once per frame as three.js's renderer does", () => {
    const renderer = new Renderer({ width: 4, height: 4 });
    const { lod, threeLod } = lodPair(0.2);
    const scene = new Scene();
    scene.add(lod);
    const camera = new PerspectiveCamera();
    const threeCamera = new THREE.PerspectiveCamera();

    for (const z of [25, 18, 15, 5, 9, 11]) {
      camera.position.set(0, 0, z);
      renderer.prepare(scene, camera);
      threeCamera.position.set(0, 0, z);
      threeCamera.updateMatrixWorld(true);
      threeLod.updateMatrixWorld(true);
      threeLod.update(threeCamera);

      expect(visibility(lod.levels)).toEqual(visibility(threeLod.levels));
      expect(lod.currentLevel).toBe(threeLod.getCurrentLevel());
    }
  });

  it("skips LODs that three.js's renderer would not reach", () => {
    const renderer = new Renderer({ width: 4, height: 4 });
    const camera = new PerspectiveCamera();
    camera.position.set(0, 0, 25);

    const manual = lodPair().lod;
    manual.autoUpdate = false;
    const hiddenParent = new Node();
    hiddenParent.visible = false;
    const underHidden = lodPair().lod;
    hiddenParent.add(underHidden);
    const otherLayer = lodPair().lod;
    otherLayer.layers.set(3);

    const scene = new Scene();
    scene.add(manual, hiddenParent, otherLayer);
    renderer.prepare(scene, camera);

    for (const lod of [manual, underHidden, otherLayer]) {
      expect(lod.currentLevel).toBe(0);
      expect(visibility(lod.levels)).toEqual([true, true, true]);
    }
  });

  it("updates an outer LOD before deciding whether an inner one is reached", () => {
    const renderer = new Renderer({ width: 4, height: 4 });
    const outer = new LOD();
    const nearLevel = new Node();
    const farLevel = new Node();
    outer.addLevel(nearLevel, 0).addLevel(farLevel, 10);
    const inner = lodPair().lod;
    nearLevel.add(inner);
    const scene = new Scene();
    scene.add(outer);
    const camera = new PerspectiveCamera();
    camera.position.set(0, 0, 25);

    renderer.prepare(scene, camera);

    expect([nearLevel.visible, farLevel.visible]).toEqual([false, true]);
    expect(visibility(inner.levels)).toEqual([true, true, true]);
  });

  it("leaves a single level untouched, as three.js does", () => {
    const lod = new LOD();
    const only = new Node();
    only.visible = false;
    lod.addLevel(only);
    const threeLod = new THREE.LOD();
    const threeOnly = new THREE.Object3D();
    threeOnly.visible = false;
    threeLod.addLevel(threeOnly);

    lod.update(new PerspectiveCamera());
    threeLod.update(new THREE.PerspectiveCamera());

    expect(only.visible).toBe(threeOnly.visible);
  });
});
