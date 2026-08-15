import { afterEach, describe, expect, it } from "bun:test";

import { examples } from "../../www/examples/registry.ts";
import {
  countVisiblePixels,
  createAnimationScheduler,
  createExampleCanvas,
} from "./example-canvas-harness.js";

describe("example render output", () => {
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
  let scheduler;

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

  it("uploads a visible first frame for every catalog module", async () => {
    scheduler = createAnimationScheduler();
    Object.defineProperty(globalThis, "requestAnimationFrame", {
      configurable: true,
      value: scheduler.request,
    });
    Object.defineProperty(globalThis, "cancelAnimationFrame", {
      configurable: true,
      value: scheduler.cancel,
    });

    const blank = [];
    for (const entry of examples) {
      const module = await entry.load();
      const canvas = createExampleCanvas();
      const instance = module.setup(canvas, {});
      if (
        instance?.firstFrameRendered !== true ||
        countVisiblePixels(canvas) === 0
      ) {
        blank.push(entry.meta.id);
      }
      instance?.cleanup?.();
    }
    expect(blank).toEqual([]);
  });
});
