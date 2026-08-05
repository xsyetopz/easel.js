import { describe, expect, it } from "bun:test";
import { OrthographicCamera } from "@/cameras/OrthographicCamera.js";
import { Node } from "@/core/Node.js";
import { Scene } from "@/core/Scene.js";
import { SkeletonHelper } from "@/helpers/SkeletonHelper.js";
import { LineMaterial } from "@/materials/LineMaterial.js";
import { Bone } from "@/objects/Bone.js";
import { Skeleton } from "@/objects/Skeleton.js";
import { Renderer } from "@/renderers/Renderer.js";

interface CapturedImage {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

function makeChain(): { root: Bone; child: Bone; tip: Bone } {
  const root = new Bone();
  const child = new Bone();
  const tip = new Bone();
  root.add(child);
  child.add(tip);
  return { root, child, tip };
}

function positionValues(helper: SkeletonHelper): Float32Array {
  const position = helper.geometry?.getAttribute("position")?.array;
  if (!(position instanceof Float32Array)) {
    throw new Error("SkeletonHelper position storage is unavailable.");
  }
  return position;
}

function colorValues(helper: SkeletonHelper): Float32Array {
  const color = helper.geometry?.getAttribute("color")?.array;
  if (!(color instanceof Float32Array)) {
    throw new Error("SkeletonHelper color storage is unavailable.");
  }
  return color;
}

describe("SkeletonHelper", () => {
  it("snapshots explicit bones and direct Bone-parent topology", () => {
    const { root, child, tip } = makeChain();
    const helper = new SkeletonHelper([root, child, tip]);

    expect(helper.bones).toEqual([root, child, tip]);
    expect(Object.isFrozen(helper.bones)).toBe(true);
    expect(helper.geometry?.getAttribute("position")?.count).toBe(4);
    expect(positionValues(helper)).toEqual(new Float32Array(12));
    expect(helper.material).toBeInstanceOf(LineMaterial);
    expect((helper as unknown as { root?: unknown }).root).toBeUndefined();
  });

  it("omits parentless and non-Bone-parent entries without recursive discovery", () => {
    const root = new Bone();
    const child = new Bone();
    root.add(child);
    expect(
      new SkeletonHelper([root]).geometry?.getAttribute("position")?.count,
    ).toBe(0);

    const nonBoneParent = new Node();
    nonBoneParent.add(child);
    expect(
      new SkeletonHelper([child]).geometry?.getAttribute("position")?.count,
    ).toBe(0);
  });

  it("rejects non-Bone and duplicate inputs at the public boundary", () => {
    expect(() => new SkeletonHelper([new Node() as unknown as Bone])).toThrow(
      "only Bone objects",
    );

    const bone = new Bone();
    expect(() => new SkeletonHelper([bone, bone])).toThrow("duplicate");
    expect(
      () => new SkeletonHelper(null as unknown as readonly Bone[]),
    ).toThrow("array of Bone");
  });

  it("composes with a Skeleton made from Bone instances", () => {
    const { root, child } = makeChain();
    const skeleton = new Skeleton([root, child]);
    const helper = new SkeletonHelper(skeleton.bones);

    expect(helper.bones).toEqual([root, child]);
    expect(helper.geometry?.getAttribute("position")?.count).toBe(2);
  });

  it("reads prepared world matrices only and reuses typed storage", () => {
    const { root, child } = makeChain();
    root.position.set(2, 3, -4);
    child.position.set(0, 5, 0);
    const helper = new SkeletonHelper([root, child]);
    const storage = positionValues(helper);
    const attribute = helper.geometry?.getAttribute("position");

    expect(root.matrixWorld.elements[12]).toBe(0);
    expect(child.matrixWorld.elements[13]).toBe(0);
    helper.update();
    expect(Array.from(storage)).toEqual(new Array(6).fill(0));

    root.updateMatrix();
    root.updateMatrixWorld(false, true);
    expect(helper.update()).toBe(helper);
    expect(Array.from(storage)).toEqual([2, 8, -4, 2, 3, -4]);
    expect(positionValues(helper)).toBe(storage);
    expect(helper.geometry?.getAttribute("position")).toBe(attribute);
    expect(root.matrixWorld.elements[12]).toBe(2);
    expect(child.matrixWorld.elements[13]).toBe(8);

    child.position.y = 7;
    expect(child.matrixWorld.elements[13]).toBe(8);
    helper.update();
    expect(Array.from(storage)).toEqual([2, 8, -4, 2, 3, -4]);
  });

  it("freezes topology at construction", () => {
    const { root, child, tip } = makeChain();
    const helper = new SkeletonHelper([root, child, tip]);
    const replacement = new Bone();
    replacement.position.set(10, 0, 0);
    replacement.updateMatrix();
    replacement.updateMatrixWorld(false);
    replacement.add(child);

    root.updateMatrixWorld(false, true);
    replacement.updateMatrixWorld(false, true);
    helper.update();

    expect(helper.geometry?.getAttribute("position")?.count).toBe(4);
    expect(Array.from(positionValues(helper).slice(0, 6))).toEqual([
      10, 0, 0, 0, 0, 0,
    ]);
  });

  it("keeps color assignment inert until explicit publication", () => {
    const { root, child } = makeChain();
    const helper = new SkeletonHelper([root, child]);
    const storage = colorValues(helper);

    helper.colors = { bone: 0xffffff, parent: "#000000" };
    expect(Array.from(storage)).toEqual([0, 0, 1, 0, 1, 0]);
    expect(helper.updateColors()).toBe(helper);
    expect(colorValues(helper)).toBe(storage);
    expect(Array.from(storage)).toEqual([1, 1, 1, 0, 0, 0]);

    helper.colors.bone.set(0xff0000);
    helper.colors.parent.set(0x0000ff);
    expect(Array.from(storage)).toEqual([1, 1, 1, 0, 0, 0]);
    helper.updateColors();
    expect(Array.from(storage)).toEqual([1, 0, 0, 0, 0, 1]);
  });

  it("renders world-space bones through the CPU line path", () => {
    const { root, child } = makeChain();
    root.position.set(0, -0.4, -1);
    child.position.set(0, 0.8, 0);
    root.updateMatrix();
    root.updateMatrixWorld(false, true);

    const helper = new SkeletonHelper([root, child]);
    helper.update();

    let captured: CapturedImage | undefined;
    const canvas = {
      width: 32,
      height: 32,
      getContext: () => ({
        imageSmoothingEnabled: false,
        putImageData(image: CapturedImage): void {
          captured = image;
        },
      }),
    } as unknown as HTMLCanvasElement;
    const renderer = new Renderer({ canvas, width: 32, height: 32 });
    const scene = new Scene();
    scene.add(helper);
    const camera = new OrthographicCamera({
      left: -1,
      right: 1,
      top: 1,
      bottom: -1,
      near: 0.1,
      far: 10,
    });

    renderer.prepare(scene, camera);
    renderer.render(scene, camera);

    if (!captured) throw new Error("Renderer did not upload ImageData.");
    let visiblePixels = 0;
    for (let i = 0; i < captured.data.length; i += 4) {
      if (captured.data[i] || captured.data[i + 1] || captured.data[i + 2]) {
        visiblePixels++;
      }
    }
    expect(visiblePixels).toBeGreaterThan(0);
  });
});
