import { describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";

const routes = [
  ["../../www/examples/misc/misc_exporter_exr.js", "misc_exporter_exr"],
  [
    "../../www/examples/misc/misc_exporter_gltf_normals.js",
    "misc_exporter_gltf_normals",
  ],
] as const;

describe("advanced CPU exporter examples", () => {
  it("mounts and cleans EXR and glTF normals routes", async () => {
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
      const modules = await Promise.all(
        routes.map(([modulePath]) => import(modulePath)),
      );
      for (let index = 0; index < routes.length; index++) {
        const expectedId = routes[index][1];
        const example = modules[index];
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
