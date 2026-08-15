import { afterEach, describe, expect, it } from "bun:test";

import { example } from "../../www/examples/canvas/scene/vertex-color-review.js";
import {
  countVisiblePixels,
  createAnimationScheduler,
  createExampleCanvas,
} from "./example-canvas-harness.js";

function countVisibleColors(canvas) {
  const data = canvas.frame;
  const background = `${data[0]},${data[1]},${data[2]}`;
  const colors = new Set();
  for (let offset = 0; offset < data.length; offset += 4) {
    const color = `${data[offset]},${data[offset + 1]},${data[offset + 2]}`;
    if (color !== background) colors.add(color);
  }
  return colors.size;
}

describe("Vertex Color Review", () => {
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

  afterEach(() => {
    if (originalRequestAnimationFrame === undefined) {
      delete globalThis.requestAnimationFrame;
    } else {
      globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    }
    if (originalCancelAnimationFrame === undefined) {
      delete globalThis.cancelAnimationFrame;
    } else {
      globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
    }
  });

  it("keeps an interpolated vertex-colored surface visible while rotating", () => {
    const scheduler = createAnimationScheduler();
    Object.defineProperty(globalThis, "requestAnimationFrame", {
      configurable: true,
      value: scheduler.request,
    });
    Object.defineProperty(globalThis, "cancelAnimationFrame", {
      configurable: true,
      value: scheduler.cancel,
    });

    const canvas = createExampleCanvas(160, 90);
    const instance = example.setup(canvas);
    const start = performance.now();
    const visiblePixels = [countVisiblePixels(canvas)];
    const visibleColors = [countVisibleColors(canvas)];

    for (let frame = 1; frame <= 50; frame++) {
      scheduler.step(start + frame * 400);
      visiblePixels.push(countVisiblePixels(canvas));
      visibleColors.push(countVisibleColors(canvas));
    }

    expect(Math.min(...visiblePixels)).toBeGreaterThan(visiblePixels[0] * 0.55);
    expect(Math.min(...visibleColors)).toBeGreaterThan(24);

    instance.cleanup();
    expect(scheduler.size).toBe(0);
  });
});
