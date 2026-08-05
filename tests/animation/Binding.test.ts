import { describe, expect, it } from "bun:test";
import { Binding, parseBindingPath } from "@/animation/Binding.js";
import { Node } from "@/core/Node.js";

describe("Binding", () => {
  it("stores root and path", () => {
    const root = new Node();
    const b = new Binding(root, "position.x");
    expect(b.root).toBe(root);
    expect(b.path).toBe("position.x");
    expect(b.isBound).toBe(false);
  });

  it("resolveNode returns root when no nodeName in path", () => {
    const root = new Node();
    const b = new Binding(root, "position.x");
    expect(b.resolveNode()).toBe(root);
  });

  it("resolveNode finds named child", () => {
    const root = new Node();
    const child = new Node();
    child.name = "hip";
    root.add(child);
    const b = new Binding(root, "hip.position");
    expect(b.resolveNode()).toBe(child);
  });

  it("resolveNode returns undefined for unknown name", () => {
    const root = new Node();
    const b = new Binding(root, "unknown.position");
    expect(b.resolveNode()).toBeUndefined();
  });

  it("getValue reads Vector3 position into array", () => {
    const root = new Node();
    root.position.set(1, 2, 3);
    const b = new Binding(root, "position").bind();
    const arr = new Array(3);
    b.getValue(arr, 0);
    expect(arr[0]).toBeCloseTo(1);
    expect(arr[1]).toBeCloseTo(2);
    expect(arr[2]).toBeCloseTo(3);
  });

  it("setValue writes Vector3 component via indexed path", () => {
    const root = new Node();
    const b = new Binding(root, "position.y").bind();
    b.setValue([42], 0);
    expect(root.position.y).toBeCloseTo(42);
  });

  it("getValue reads scalar property into array", () => {
    const root = new Node();
    root.scale.set(2, 2, 2);
    const b = new Binding(root, "scale.x").bind();
    const arr = [0];
    b.getValue(arr, 0);
    expect(arr[0]).toBeCloseTo(2);
  });

  it("setValue writes scalar into property index", () => {
    const root = new Node();
    const b = new Binding(root, "scale.x").bind();
    b.setValue([5], 0);
    expect(root.scale.x).toBeCloseTo(5);
  });

  it("requires explicit bind before property access and supports unbind", () => {
    const root = new Node();
    const b = new Binding(root, "position.x");
    expect(() => b.getValue([0], 0)).toThrow("explicitly bound");
    b.bind();
    expect(b.isBound).toBe(true);
    expect(b.getValue([0], 0)).toBeUndefined();
    b.unbind();
    expect(b.isBound).toBe(false);
    expect(() => b.setValue([1], 0)).toThrow("explicitly bound");
  });

  it("parses strict hierarchy, material, bone, and indexed paths", () => {
    expect(parseBindingPath("position.x")).toEqual({
      nodeName: undefined,
      objectName: undefined,
      objectIndex: undefined,
      propertyName: "position",
      propertyIndex: "x",
    });
    expect(parseBindingPath("mesh.material.opacity")).toEqual({
      nodeName: "mesh",
      objectName: "material",
      objectIndex: undefined,
      propertyName: "opacity",
      propertyIndex: undefined,
    });
    expect(parseBindingPath("mesh.bones[2].position.x")).toEqual({
      nodeName: "mesh",
      objectName: "bones",
      objectIndex: 2,
      propertyName: "position",
      propertyIndex: "x",
    });
    expect(parseBindingPath("parent/child.position[1]")).toEqual({
      nodeName: "parent/child",
      objectName: undefined,
      objectIndex: undefined,
      propertyName: "position",
      propertyIndex: 1,
    });
    expect(() => parseBindingPath(".position[x]")).toThrow(SyntaxError);
    expect(() => parseBindingPath("mesh.materials[0].opacity")).toThrow(
      "unsupported capability",
    );
    expect(() => parseBindingPath("mesh.__proto__.x")).toThrow("reserved");
  });

  it("validates an optional parsed path against the configured grammar", () => {
    const target = { value: 1 };
    const parsed = parseBindingPath("value");
    expect(new Binding(target, "value", parsed).parsedPath).toEqual(parsed);
    expect(
      () =>
        new Binding(target, "value", {
          ...parsed,
          propertyName: "other",
        }),
    ).toThrow("must match");
  });

  it("binds material and bone targets without implicit traversal", () => {
    const bone = { name: "hand", position: { x: 1, y: 2, z: 3 } };
    const target = {
      name: "mesh",
      material: { opacity: 0 },
      skeleton: { bones: [bone] },
    };
    const materialBinding = new Binding(target, "mesh.material.opacity").bind();
    materialBinding.setValue([4], 0);
    expect(target.material.opacity).toBe(4);

    const boneBinding = new Binding(
      target,
      "mesh.bones[hand].position.x",
    ).bind();
    boneBinding.setValue([9], 0);
    expect(bone.position.x).toBe(9);
  });

  it("supports hierarchy and numeric property arrays", () => {
    const child = new Node();
    child.name = "child";
    const parent = new Node();
    parent.name = "parent";
    parent.add(child);
    const binding = new Binding(parent, "parent/child.position.x").bind();
    binding.setValue([8], 0);
    expect(child.position.x).toBe(8);

    const target = { weights: new Float32Array([1, 2, 3]) };
    const indexed = new Binding(target, "weights[1]").bind();
    const output = [0];
    indexed.getValue(output, 0);
    expect(output).toEqual([2]);
    indexed.setValue([7], 0);
    expect(target.weights[1]).toBe(7);
  });

  it("rejects missing and unsupported properties instead of no-oping", () => {
    const target = { value: {}, nested: { value: 1 } };
    expect(() => new Binding(target, "missing").bind()).toThrow(ReferenceError);
    expect(() => new Binding(target, "value").bind()).toThrow(TypeError);
  });
});
