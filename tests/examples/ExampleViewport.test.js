import { describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";
import {
  EXAMPLE_ASPECT_RATIO,
  getExampleViewportSize,
  resizeExampleCanvas,
} from "../../www/runtime/example-viewport.ts";

describe("example viewport", () => {
  it("sizes a normal stage to the stable 16:9 ratio", () => {
    expect(EXAMPLE_ASPECT_RATIO).toBe(16 / 9);
    expect(getExampleViewportSize({ clientWidth: 640 })).toEqual({
      width: 640,
      height: 360,
    });
  });

  it("sizes a narrow stage without dropping below one pixel", () => {
    expect(getExampleViewportSize({ clientWidth: 320 })).toEqual({
      width: 320,
      height: 180,
    });
  });

  it("clamps a zero or missing container to a safe size", () => {
    expect(getExampleViewportSize({ clientWidth: 0 })).toEqual({
      width: 1,
      height: 1,
    });
    expect(getExampleViewportSize(undefined)).toEqual({
      width: 1,
      height: 1,
    });
  });

  it("resizes a canvas and reports when its size is unchanged", () => {
    const dom = new JSDOM("<!doctype html><body></body>");
    try {
      const container = dom.window.document.createElement("div");
      const canvas = dom.window.document.createElement("canvas");
      Object.defineProperty(container, "clientWidth", {
        configurable: true,
        value: 640,
      });
      container.append(canvas);

      expect(resizeExampleCanvas(canvas)).toBe(true);
      expect(canvas.width).toBe(640);
      expect(canvas.height).toBe(360);
      expect(resizeExampleCanvas(canvas)).toBe(false);
      expect(resizeExampleCanvas(undefined)).toBe(false);
    } finally {
      dom.window.close();
    }
  });
});
