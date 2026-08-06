import { describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";

const exampleNames = [
  "orthographic",
  "periodictable",
  "sprites",
  "youtube",
  "molecules",
] as const;

describe("CSS3D website examples", () => {
  it("mounts and cleans up every non-GPU CSS3D example", async () => {
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
      for (const name of exampleNames) {
        const example = await import(`../../www/examples/css/css3d_${name}.js`);
        const stage = document.createElement("div");
        const canvas = document.createElement("canvas");
        Object.defineProperty(canvas, "getContext", {
          configurable: true,
          value: () => null,
        });
        stage.append(canvas);
        document.body.append(stage);
        const instance = example.setup(canvas);
        expect(example.meta.id).toBe(`css3d_${name}`);
        expect(instance).toBeDefined();
        instance?.cleanup();
        expect(stage.children).toHaveLength(1);
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
