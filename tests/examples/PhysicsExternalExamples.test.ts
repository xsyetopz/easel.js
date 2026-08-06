import { describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";

describe("external physics website examples", () => {
  it("mounts and cleans terrain, vehicle, Ammo, and Jolt routes", async () => {
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
      const routes = [
        [
          "../../www/examples/physics/canvas_physics_rapier_terrain.js",
          "physics_rapier_terrain",
        ],
        [
          "../../www/examples/physics/canvas_physics_rapier_vehicle_controller.js",
          "physics_rapier_vehicle_controller",
        ],
        [
          "../../www/examples/physics/canvas_physics_ammo_instancing.js",
          "physics_ammo_instancing",
        ],
        [
          "../../www/examples/physics/canvas_physics_ammo_terrain.js",
          "physics_ammo_terrain",
        ],
        [
          "../../www/examples/physics/canvas_physics_jolt_instancing.js",
          "physics_jolt_instancing",
        ],
      ] as const;
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
        expect(instance).toBeDefined();
        instance?.update?.({ reset: 1 });
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
