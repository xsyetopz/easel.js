import { describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";

describe("EASEL.js example routes", () => {
  it("mounts and cleans up representative asset, world, and tool routes", async () => {
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
          "../../www/examples/canvas/loader/character-motion-review.js",
          "character-motion-review",
        ],
        [
          "../../www/examples/canvas/loader/product-model-viewer.js",
          "product-model-viewer",
        ],
        [
          "../../www/examples/canvas/loader/instanced-asset-review.js",
          "instanced-asset-review",
        ],
        [
          "../../www/examples/canvas/loader/volume-slice-review.js",
          "volume-slice-review",
        ],
        [
          "../../www/examples/canvas/loader/obj-model-review.js",
          "obj-model-review",
        ],
        [
          "../../www/examples/canvas/loader/point-cloud-review.js",
          "point-cloud-review",
        ],
        [
          "../../www/examples/canvas/loader/voxel-asset-review.js",
          "voxel-asset-review",
        ],
        ["../../www/examples/misc/gltf-export-check.js", "gltf-export-check"],
        ["../../www/examples/misc/scene-transform.js", "scene-transform"],
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
