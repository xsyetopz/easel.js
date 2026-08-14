import { describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";

describe("font specimen example", () => {
  it("mounts and cleans the font outline scene", async () => {
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
        "../../www/examples/canvas/loader/font-specimen.js";
      const example = await import(modulePath);
      const canvas = dom.window.document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      Object.defineProperty(canvas, "getContext", {
        configurable: true,
        value: () => null,
      });

      expect(example.meta.id).toBe("font-specimen");
      expect(example.easelSource).toContain("TTFLoader");
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
