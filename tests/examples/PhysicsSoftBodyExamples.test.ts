import { describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";

const routes = [
  [
    "../../www/examples/physics/canvas_physics_ammo_break.js",
    "physics_ammo_break",
  ],
  [
    "../../www/examples/physics/canvas_physics_ammo_cloth.js",
    "physics_ammo_cloth",
  ],
  [
    "../../www/examples/physics/canvas_physics_ammo_rope.js",
    "physics_ammo_rope",
  ],
  [
    "../../www/examples/physics/canvas_physics_ammo_volume.js",
    "physics_ammo_volume",
  ],
] as const;

describe("CPU Ammo soft-body examples", () => {
  it("mounts, updates, and cleans every exact route without Ammo WASM", async () => {
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
      for (const [modulePath, expectedId] of routes) {
        const example = await import(modulePath);
        const canvas = dom.window.document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 360;
        Object.defineProperty(canvas, "getContext", {
          configurable: true,
          value: () => null,
        });
        const instance = example.setup(canvas);
        expect(example.meta.id).toBe(expectedId);
        expect(example.easelSource).toContain("@xsyetopz/easel");
        expect(example.threeSource).toContain('from "three"');
        instance?.update?.({ reset: 1, break: 1, arm: 0 });
        instance?.cleanup?.();
      }
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
