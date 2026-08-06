import { describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";

describe("TIFF loader example", () => {
  it("keeps the exact THREE route and cleans CPU TIFF textures", async () => {
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
      const modulePath: string =
        "../../www/examples/canvas/loader/canvas_loader_texture_tiff.js";
      const example = await import(modulePath);
      const canvas = dom.window.document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      Object.defineProperty(canvas, "getContext", {
        configurable: true,
        value: () => null,
      });

      expect(example.meta.id).toBe("webgl_loader_texture_tiff");
      expect(example.threeSource).toContain("TIFFLoader");
      expect(example.threeSource).toContain("crate_lzw.tif");
      const instance = example.setup(canvas);
      expect(instance).toBeDefined();
      instance?.cleanup();
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
