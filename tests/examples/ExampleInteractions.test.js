import { afterEach, describe, expect, it } from "bun:test";

import { examples } from "../../www/examples/registry.ts";
import {
  createAnimationScheduler,
  createExampleCanvas,
  hasDrawnFrame,
  interactionEvent,
} from "./example-canvas-harness.js";

describe("example interactions", () => {
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

  it("keeps every input-bearing module wired to a live canvas", async () => {
    scheduler = createAnimationScheduler();
    Object.defineProperty(globalThis, "requestAnimationFrame", {
      configurable: true,
      writable: true,
      value: scheduler.request,
    });
    Object.defineProperty(globalThis, "cancelAnimationFrame", {
      configurable: true,
      writable: true,
      value: scheduler.cancel,
    });

    const modules = [];
    for (const entry of examples) {
      const module = await entry.load();
      const canvas = createExampleCanvas();
      const instance = module.setup(canvas, {});
      if (canvas.listenerTypes.length === 0) {
        instance?.cleanup?.();
        continue;
      }
      const before = canvas.frame.slice();
      for (const type of canvas.listenerTypes) {
        canvas.dispatchEvent(interactionEvent(type));
      }
      scheduler.step(32);
      modules.push({
        id: entry.meta.id,
        listeners: canvas.listenerTypes,
        changed: before.some((value, index) => value !== canvas.frame[index]),
        drawn: hasDrawnFrame(entry.meta.id, canvas),
      });
      instance?.cleanup?.();
    }

    expect(modules.length).toBeGreaterThan(0);
    expect(modules.some((module) => module.changed)).toBe(true);
    expect(modules.every((module) => module.drawn)).toBe(true);
    expect(modules.every((module) => module.listeners.length > 0)).toBe(true);
  });
});
