import { describe, expect, it } from "bun:test";
import { Binding } from "@/animation/Binding.js";
import { PropertyMixer } from "@/animation/PropertyMixer.js";
import { Node } from "@/core/Node.js";

describe("PropertyMixer", () => {
  function makeScalarBinding(value = 0.5) {
    const root = new Node() as Node & { opacity: number };
    root.opacity = value;
    return { binding: new Binding(root, "opacity").bind(), root };
  }

  function makeVec3Binding() {
    const root = new Node();
    root.position.set(0, 0, 0);
    return { binding: new Binding(root, "position").bind(), root };
  }

  it("constructs with binding and itemSize", () => {
    const { binding } = makeScalarBinding();
    const mixer = new PropertyMixer(binding, 1);
    expect(mixer.binding).toBe(binding);
    expect(mixer.itemSize).toBe(1);
    expect(mixer.valueType).toBe("number");
    expect(mixer.cumulativeWeight).toBe(0);
    expect(mixer.cumulativeAdditiveWeight).toBe(0);
  });

  it("requires an explicit original-state save before applying", () => {
    const { binding } = makeScalarBinding();
    const mixer = new PropertyMixer(binding, 1);
    mixer.accumulate(0, 1, [1]);
    expect(() => mixer.apply(0)).toThrow("original state");
  });

  it("accumulates weighted numeric values and preserves the original remainder", () => {
    const { binding, root } = makeScalarBinding(2);
    const mixer = new PropertyMixer(binding, 1);
    mixer.saveOriginalState();
    mixer.accumulate(0, 0.25, [6]);
    mixer.accumulate(0, 0.25, [10]);
    expect(mixer.cumulativeWeight).toBeCloseTo(0.5);
    mixer.apply(0);
    expect(root.opacity).toBeCloseTo(5);
    expect(mixer.cumulativeWeight).toBe(0);
  });

  it("applies a full-weight scalar and resets the frame", () => {
    const { binding, root } = makeScalarBinding(1);
    const mixer = new PropertyMixer(binding, 1);
    mixer.saveOriginalState();
    mixer.accumulate(0, 1, [4]);
    mixer.apply(0);
    expect(root.opacity).toBeCloseTo(4);
    root.opacity = 5;
    mixer.apply(0);
    expect(root.opacity).toBeCloseTo(5);
  });

  it("accumulate with weight zero does not change property", () => {
    const { binding, root } = makeVec3Binding();
    root.position.set(3, 0, 0);
    const mixer = new PropertyMixer(binding, 3);
    mixer.saveOriginalState();
    mixer.accumulate(0, 0, [7, 7, 7]);
    mixer.apply(0);
    expect(root.position.x).toBeCloseTo(3);
  });

  it("selects the highest weighted discrete value with deterministic ties", () => {
    const target = { state: "original" };
    const binding = new Binding(target, "state").bind();
    const mixer = new PropertyMixer(binding, 1, "string");
    mixer.saveOriginalState();
    mixer.accumulate(0, 0.25, ["zulu"]);
    mixer.accumulate(0, 0.75, ["alpha"]);
    mixer.apply(0);
    expect(target.state).toBe("alpha");

    mixer.accumulate(0, 0.5, ["zulu"]);
    mixer.accumulate(0, 0.5, ["alpha"]);
    mixer.apply(0);
    expect(target.state).toBe("alpha");
  });

  it("rejects additive mixing for discrete values", () => {
    const target = { state: "original" };
    const mixer = new PropertyMixer(
      new Binding(target, "state").bind(),
      1,
      "string",
    );
    expect(() =>
      mixer.accumulateAdditive(1, ["next"] as unknown as readonly number[]),
    ).toThrow("not supported");
  });

  it("applies additive numeric values to the saved original", () => {
    const { binding, root } = makeScalarBinding(2);
    const mixer = new PropertyMixer(binding, 1);
    mixer.saveOriginalState();
    mixer.accumulateAdditive(0.5, [4]);
    expect(mixer.cumulativeAdditiveWeight).toBeCloseTo(0.5);
    mixer.apply(0);
    expect(root.opacity).toBeCloseTo(4);
    expect(mixer.cumulativeAdditiveWeight).toBe(0);
  });

  it("blends and adds normalized quaternions explicitly", () => {
    const root = new Node();
    const binding = new Binding(root, "quaternion").bind();
    const mixer = new PropertyMixer(binding, 4, "quaternion");
    mixer.saveOriginalState();
    mixer.accumulate(0, 0.5, [0, 0, 0, 1]);
    mixer.accumulate(0, 0.5, [0, 1, 0, 0]);
    mixer.accumulateAdditive(0.5, [0, 0, 1, 0]);
    mixer.apply(0);
    const length = Math.hypot(
      root.quaternion.x,
      root.quaternion.y,
      root.quaternion.z,
      root.quaternion.w,
    );
    expect(length).toBeCloseTo(1);
    expect(root.quaternion.z).not.toBe(0);
  });

  it("validates item sizes, weights, and value types", () => {
    const { binding } = makeScalarBinding();
    expect(() => new PropertyMixer(binding, 0)).toThrow(RangeError);
    expect(() => new PropertyMixer(binding, 1.5)).toThrow(RangeError);
    expect(() => new PropertyMixer(binding, 3, "quaternion")).toThrow(
      RangeError,
    );
    const mixer = new PropertyMixer(binding, 1);
    expect(() => mixer.accumulate(0, -1, [1])).toThrow(RangeError);
    expect(() => mixer.accumulate(0, 1, ["wrong"])).toThrow(TypeError);
    expect(() => mixer.accumulate(2 as unknown as 0 | 1, 1, [1])).toThrow(
      RangeError,
    );
  });

  it("restores original state and supports rebinding", () => {
    const { binding, root } = makeScalarBinding(3);
    const mixer = new PropertyMixer(binding, 1);
    mixer.saveOriginalState();
    mixer.accumulate(0, 1, [8]);
    mixer.apply(0);
    expect(root.opacity).toBe(8);
    mixer.restoreOriginalState();
    expect(root.opacity).toBe(3);
    binding.unbind();
    expect(() => mixer.saveOriginalState()).toThrow("explicitly bound");
    binding.bind();
    mixer.saveOriginalState();
  });
});
