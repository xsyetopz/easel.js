import { describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";

describe("games_fps website example", () => {
  it("mounts and cleans up the CPU pointer-lock scene", async () => {
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
      const example = await import("../../www/examples/games/games_fps.js");
      const canvas = dom.window.document.createElement("canvas");
      Object.defineProperty(canvas, "getContext", {
        configurable: true,
        value: () => null,
      });
      dom.window.document.body.append(canvas);
      const instance = example.setup(canvas);
      expect(example.meta.id).toBe("games_fps");
      expect(instance).toBeDefined();
      instance?.cleanup();
      expect(canvas.parentElement).not.toBeNull();
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
