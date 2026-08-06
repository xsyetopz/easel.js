import { describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";

describe("physics_rapier_instancing example", () => {
  it("mounts, shakes, and cleans up its CPU physics loop", async () => {
    const previousDocument = globalThis.document;
    const previousRequestAnimationFrame = globalThis.requestAnimationFrame;
    const previousCancelAnimationFrame = globalThis.cancelAnimationFrame;
    const dom = new JSDOM("<!doctype html><body></body>");
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: dom.window.document,
    });
    Object.defineProperty(globalThis, "requestAnimationFrame", {
      configurable: true,
      value: () => 1,
    });
    Object.defineProperty(globalThis, "cancelAnimationFrame", {
      configurable: true,
      value: () => undefined,
    });
    try {
      const modulePath =
        "../../www/examples/physics/canvas_physics_rapier_instancing.js";
      const example = await import(modulePath);
      const canvas = dom.window.document.createElement("canvas");
      Object.defineProperty(canvas, "getContext", {
        configurable: true,
        value: () => null,
      });
      const instance = example.setup(canvas);
      expect(example.meta.id).toBe("physics_rapier_instancing");
      expect(instance).toBeDefined();
      instance?.update?.({ shake: 1 });
      instance?.cleanup?.();
    } finally {
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: previousDocument,
      });
      Object.defineProperty(globalThis, "requestAnimationFrame", {
        configurable: true,
        value: previousRequestAnimationFrame,
      });
      Object.defineProperty(globalThis, "cancelAnimationFrame", {
        configurable: true,
        value: previousCancelAnimationFrame,
      });
      dom.window.close();
    }
  });
});
