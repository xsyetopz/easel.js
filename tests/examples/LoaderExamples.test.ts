import { describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";

describe("CPU website examples", () => {
  it("mounts and cleans up Canvas2D loader, exporter, and controls routes", async () => {
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
      for (const [modulePath, expectedId] of [
        [
          "../../www/examples/canvas/loader/canvas_loader_bvh.js",
          "webgl_loader_bvh",
        ],
        [
          "../../www/examples/canvas/loader/canvas_loader_imagebitmap.js",
          "webgl_loader_imagebitmap",
        ],
        [
          "../../www/examples/canvas/loader/canvas_loader_gltf.js",
          "webgl_loader_gltf",
        ],
        [
          "../../www/examples/canvas/loader/canvas_loader_gltf_instancing.js",
          "webgl_loader_gltf_instancing",
        ],
        [
          "../../www/examples/canvas/loader/canvas_loader_gltf_progressive_lod.js",
          "webgl_loader_gltf_progressive_lod",
        ],
        [
          "../../www/examples/canvas/loader/canvas_loader_gltf_variants.js",
          "webgl_loader_gltf_variants",
        ],
        [
          "../../www/examples/canvas/loader/canvas_loader_nrrd.js",
          "webgl_loader_nrrd",
        ],
        [
          "../../www/examples/canvas/loader/canvas_loader_texture_tga.js",
          "webgl_loader_texture_tga",
        ],
        [
          "../../www/examples/canvas/loader/canvas_loader_vox.js",
          "webgl_loader_vox",
        ],
        [
          "../../www/examples/canvas/loader/canvas_loader_svg.js",
          "webgl_loader_svg",
        ],
        [
          "../../www/examples/physics/canvas_physics_rapier_character_controller.js",
          "physics_rapier_character_controller",
        ],
        [
          "../../www/examples/physics/canvas_physics_rapier_joints.js",
          "physics_rapier_joints",
        ],
        ["../../www/examples/misc/misc_exporter_gltf.js", "misc_exporter_gltf"],
        [
          "../../www/examples/misc/misc_controls_transform.js",
          "misc_controls_transform",
        ],
      ] as const) {
        const example = await import(modulePath);
        const canvas = dom.window.document.createElement("canvas");
        Object.defineProperty(canvas, "getContext", {
          configurable: true,
          value: () => null,
        });
        const instance = example.setup(canvas);
        expect(example.meta.id).toBe(expectedId);
        expect(instance).toBeDefined();
        instance?.cleanup();
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
