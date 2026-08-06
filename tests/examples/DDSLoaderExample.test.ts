import { describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";

describe("DDS loader example", () => {
  it("mounts and cleans the CPU DDS texture route", async () => {
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
        "../../www/examples/canvas/loader/canvas_loader_texture_dds.js";
      const example = await import(modulePath);
      const canvas = dom.window.document.createElement("canvas");
      Object.defineProperty(canvas, "getContext", {
        configurable: true,
        value: () => null,
      });
      const instance = example.setup(canvas);
      expect(example.meta.id).toBe("webgl_loader_texture_dds");
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
