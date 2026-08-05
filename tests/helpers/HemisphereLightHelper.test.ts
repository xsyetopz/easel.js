import { describe, expect, it } from "bun:test";
import { OrthographicCamera } from "@/cameras/OrthographicCamera.js";
import { Node } from "@/core/Node.js";
import { Scene } from "@/core/Scene.js";
import { HemisphereLightHelper } from "@/helpers/HemisphereLightHelper.js";
import { HemisphereLight } from "@/lights/HemisphereLight.js";
import type { LineMaterial } from "@/materials/LineMaterial.js";
import { Vector3 } from "@/math/Vector3.js";
import { Renderer } from "@/renderers/Renderer.js";

function attributeArray(
  helper: HemisphereLightHelper,
  name: string,
): Float32Array {
  const array = helper.geometry?.getAttribute(name)?.array;
  if (!(array instanceof Float32Array)) throw new Error(`${name} is missing`);
  return array;
}

describe("HemisphereLightHelper", () => {
  it("constructs an inert fixed-size CPU line helper", () => {
    const light = new HemisphereLight(0xff0000, 0x0000ff);
    light.updateMatrixWorld = () => {
      throw new Error("constructor must not prepare the light");
    };
    const helper = new HemisphereLightHelper(light, 2);
    const positions = attributeArray(helper, "position");
    const colors = attributeArray(helper, "color");

    expect(helper.type).toBe("HemisphereLightHelper");
    expect(helper).toBeInstanceOf(HemisphereLightHelper);
    expect(helper.position.equals(new Vector3())).toBe(true);
    expect(positions).toHaveLength(72);
    expect(colors).toHaveLength(72);
    expect(new Set(positions)).toContain(2);
    expect(new Set(positions)).toContain(-2);
    expect(Array.from(colors).every((value) => value === 0)).toBe(true);
    expect((helper.material as LineMaterial).color.hex).toBe(0xffffff);
    expect(() => new HemisphereLightHelper(light, 0)).toThrow(
      "positive and finite",
    );
  });

  it("uses the prepared world translation for direction and pose", () => {
    const parent = new Node();
    parent.position.set(2, 3, 4);
    parent.rotateZ(Math.PI / 2);
    const light = new HemisphereLight();
    parent.add(light);
    parent.updateMatrixWorld(false, true);

    parent.updateMatrixWorld = () => {
      throw new Error("update must not prepare the parent");
    };
    light.updateMatrixWorld = () => {
      throw new Error("update must not prepare the light");
    };

    const helper = new HemisphereLightHelper(light);
    const positions = attributeArray(helper, "position");
    const world = new Vector3(
      light.matrixWorld.elements[12],
      light.matrixWorld.elements[13],
      light.matrixWorld.elements[14],
    );
    expect(helper.update()).toBe(helper);
    expect(helper.position.distanceTo(world)).toBeLessThan(1e-6);

    const expected = world.clone().normalize();
    const transformedUp = new Vector3(0, 1, 0).applyQuaternion(
      helper.quaternion,
    );
    expect(transformedUp.distanceTo(expected)).toBeLessThan(1e-6);
    expect(positions).toBe(attributeArray(helper, "position"));
  });

  it("publishes sky and ground colors into stable vertex storage", () => {
    const light = new HemisphereLight(0xff0000, 0x0000ff);
    const helper = new HemisphereLightHelper(light);
    const colors = attributeArray(helper, "color");
    const colorAttribute = helper.geometry?.getAttribute("color");
    if (!colorAttribute) throw new Error("color attribute is missing");

    helper.update();
    for (let index = 0; index < colors.length; index += 3) {
      const y = attributeArray(helper, "position")[index + 1];
      const expected = y >= 0 ? [1, 0, 0] : [0, 0, 1];
      expect(Array.from(colors.slice(index, index + 3))).toEqual(expected);
    }

    const snapshot = colors.slice();
    colorAttribute.needsUpdate = false;
    light.color.set(0x00ff00);
    light.groundColor.set(0xffff00);
    expect(Array.from(colors)).toEqual(Array.from(snapshot));
    expect(colorAttribute.needsUpdate).toBe(false);
    helper.update();
    expect(colorAttribute.needsUpdate).toBe(true);
    expect(Array.from(colors.slice(0, 3))).toEqual([0, 1, 0]);
  });

  it("publishes an override as white vertices and a material color", () => {
    const light = new HemisphereLight(0xff0000, 0x0000ff);
    const helper = new HemisphereLightHelper(light);
    const colors = attributeArray(helper, "color");
    const colorAttribute = helper.geometry?.getAttribute("color");
    if (!colorAttribute) throw new Error("color attribute is missing");

    helper.color = 0x123456;
    expect((helper.material as LineMaterial).color.hex).toBe(0xffffff);
    expect(Array.from(colors).every((value) => value === 0)).toBe(true);
    helper.update();
    expect((helper.material as LineMaterial).color.hex).toBe(0x123456);
    expect(Array.from(colors).every((value) => value === 1)).toBe(true);

    helper.color = undefined;
    expect((helper.material as LineMaterial).color.hex).toBe(0x123456);
    helper.update();
    expect((helper.material as LineMaterial).color.hex).toBe(0xffffff);
    expect(Array.from(colors).some((value) => value !== 1)).toBe(true);
    expect(colorAttribute.needsUpdate).toBe(true);
  });

  it("keeps source assignment explicit and disposes only CPU geometry", () => {
    const first = new HemisphereLight(0xff0000, 0x0000ff);
    const helper = new HemisphereLightHelper(first);
    const next = new HemisphereLight(0x00ff00, 0xffff00);
    next.position.set(4, 5, 6);
    next.updateMatrixWorld(false);
    const geometry = helper.geometry;
    const positions = attributeArray(helper, "position");

    helper.light = next;
    expect(helper.position.equals(new Vector3())).toBe(true);
    helper.update();
    expect(helper.position.equals(next.position)).toBe(true);
    expect(helper.geometry).toBe(geometry);
    expect(attributeArray(helper, "position")).toBe(positions);

    helper.dispose();
    expect(helper.geometry?.getAttribute("position")).toBeUndefined();
  });

  it("renders visible CPU line pixels after explicit source and scene preparation", () => {
    const light = new HemisphereLight(0xff0000, 0x0000ff);
    light.position.set(0, 0, -2);
    light.updateMatrix();
    light.updateMatrixWorld(false);
    const helper = new HemisphereLightHelper(light, 0.75);
    helper.update();

    let imageData: { data: Uint8ClampedArray } | undefined;
    const canvas = {
      width: 32,
      height: 32,
      getContext: () => ({
        imageSmoothingEnabled: false,
        putImageData: (value: unknown) => {
          imageData = value as typeof imageData;
        },
      }),
    } as unknown as HTMLCanvasElement;
    const renderer = new Renderer({ canvas, width: 32, height: 32 });
    const scene = new Scene();
    scene.add(helper);
    const camera = new OrthographicCamera({
      left: -2,
      right: 2,
      top: 2,
      bottom: -2,
      near: 0.1,
      far: 10,
    });

    renderer.prepare(scene, camera);
    renderer.render(scene, camera);

    if (!imageData) throw new Error("Renderer did not upload ImageData.");
    let visiblePixels = 0;
    for (let index = 0; index < imageData.data.length; index += 4) {
      if (
        imageData.data[index] ||
        imageData.data[index + 1] ||
        imageData.data[index + 2]
      ) {
        visiblePixels++;
      }
    }
    expect(visiblePixels).toBeGreaterThan(0);
  });
});
