import { afterEach, describe, expect, it } from "bun:test";

import { TransformControls } from "@/index.js";
import { examples } from "../../www/examples/registry.ts";
import { createClickActivatedControls } from "../../www/runtime/canvas-input-focus.ts";
import {
  countVisiblePixels,
  createAnimationScheduler,
  createExampleCanvas,
  installGlobalEventHarness,
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
      value: scheduler.request,
    });
    Object.defineProperty(globalThis, "cancelAnimationFrame", {
      configurable: true,
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
        pixels: countVisiblePixels(canvas),
      });
      instance?.cleanup?.();
    }

    expect(modules.length).toBeGreaterThan(0);
    expect(modules.some((module) => module.changed)).toBe(true);
    expect(modules.every((module) => module.pixels > 0)).toBe(true);
    expect(modules.every((module) => module.listeners.length > 0)).toBe(true);
  });

  it("places a visible terrain marker after a valid click", async () => {
    scheduler = createAnimationScheduler();
    Object.defineProperty(globalThis, "requestAnimationFrame", {
      configurable: true,
      value: scheduler.request,
    });
    Object.defineProperty(globalThis, "cancelAnimationFrame", {
      configurable: true,
      value: scheduler.cancel,
    });
    const entry = examples.find(
      (candidate) => candidate.meta.id === "terrain-placement",
    );
    const module = await entry.load();
    const canvas = createExampleCanvas();
    const instance = module.setup(canvas, {});
    const before = canvas.frame.slice();
    canvas.dispatchEvent(interactionEvent("click", 320, 180));
    scheduler.step(32);
    const changed = before.some(
      (value, index) => value !== canvas.frame[index],
    );
    expect(changed).toBe(true);
    expect(countVisiblePixels(canvas)).toBeGreaterThan(0);
    instance?.cleanup?.();
  });

  it("captures pointer lock only after activation and releases it safely", () => {
    const globalEvents = installGlobalEventHarness();
    try {
      const canvas = createExampleCanvas();
      const instances = [];
      const input = createClickActivatedControls(canvas, () => {
        const controls = {
          enabled: true,
          disposed: false,
          dispose() {
            controls.disposed = true;
          },
        };
        instances.push(controls);
        return controls;
      });

      expect(input.active).toBe(false);
      expect(input.controls.enabled).toBe(false);
      expect(canvas.ownerDocument.pointerLockElement).toBeUndefined();

      canvas.dispatchEvent(interactionEvent("click"));
      expect(input.active).toBe(true);
      expect(input.controls.enabled).toBe(true);
      expect(canvas.ownerDocument.pointerLockElement).toBe(canvas);
      expect(instances[0].disposed).toBe(true);

      globalEvents.dispatch({
        ...interactionEvent("keydown"),
        code: "Escape",
        key: "Escape",
      });
      expect(input.active).toBe(false);
      expect(input.controls.enabled).toBe(false);
      expect(canvas.ownerDocument.pointerLockElement).toBeUndefined();

      canvas.dispatchEvent(interactionEvent("click"));
      expect(canvas.ownerDocument.pointerLockElement).toBe(canvas);
      input.dispose();
      expect(canvas.ownerDocument.pointerLockElement).toBeUndefined();
      expect(canvas.listenerTypes).not.toContain("click");
      expect(canvas["data-input-active"]).toBeUndefined();
    } finally {
      globalEvents.cleanup();
    }
  });

  it("activates first-person input on click and exits on Escape", async () => {
    scheduler = createAnimationScheduler();
    Object.defineProperty(globalThis, "requestAnimationFrame", {
      configurable: true,
      value: scheduler.request,
    });
    Object.defineProperty(globalThis, "cancelAnimationFrame", {
      configurable: true,
      value: scheduler.cancel,
    });
    const globalEvents = installGlobalEventHarness();
    try {
      const entry = examples.find(
        (candidate) => candidate.meta.id === "first-person-walkthrough",
      );
      const module = await entry.load();
      const canvas = createExampleCanvas();
      const instance = module.setup(canvas, {});
      scheduler.step(32);
      const before = canvas.frame.slice();

      globalEvents.dispatch(interactionEvent("keydown"));
      scheduler.step(48);
      expect(canvas.frame).toEqual(before);

      canvas.dispatchEvent(interactionEvent("click"));
      expect(canvas.focused).toBe(true);
      expect(canvas.ownerDocument.pointerLockElement).toBe(canvas);
      canvas.dispatchEvent({
        ...interactionEvent("pointermove"),
        movementX: 2_000,
        movementY: -250,
      });
      scheduler.step(64);
      const changed = before.some(
        (value, index) => value !== canvas.frame[index],
      );
      expect(changed).toBe(true);

      globalEvents.dispatch({
        ...interactionEvent("keydown"),
        code: "Escape",
        key: "Escape",
      });
      expect(canvas.focused).toBe(false);
      expect(canvas.ownerDocument.pointerLockElement).toBeUndefined();
      canvas.dispatchEvent({
        ...interactionEvent("pointermove"),
        movementX: 2_000,
        movementY: 0,
      });
      instance?.cleanup?.();
    } finally {
      globalEvents.cleanup();
    }
  });

  it("updates a texture-picking marker after a pointer move", async () => {
    scheduler = createAnimationScheduler();
    Object.defineProperty(globalThis, "requestAnimationFrame", {
      configurable: true,
      value: scheduler.request,
    });
    Object.defineProperty(globalThis, "cancelAnimationFrame", {
      configurable: true,
      value: scheduler.cancel,
    });
    const entry = examples.find(
      (candidate) => candidate.meta.id === "texture-picking",
    );
    const module = await entry.load();
    const canvas = createExampleCanvas();
    const instance = module.setup(canvas, {});
    scheduler.step(32);
    const before = canvas.frame.slice();
    canvas.dispatchEvent(interactionEvent("pointermove", 500, 220));
    scheduler.step(48);
    const changed = before.some(
      (value, index) => value !== canvas.frame[index],
    );
    expect(changed).toBe(true);
    instance?.cleanup?.();
  });

  it("applies a lighting-rig selector update to the rendered scene", async () => {
    scheduler = createAnimationScheduler();
    globalThis.requestAnimationFrame = scheduler.request;
    globalThis.cancelAnimationFrame = scheduler.cancel;
    const entry = examples.find(
      (candidate) => candidate.meta.id === "lighting-bench",
    );
    const module = await entry.load();
    const canvas = createExampleCanvas();
    const instance = module.setup(canvas, { rig: "daylight" });
    const before = canvas.frame.slice();
    instance?.update?.({ rig: "studio" });
    scheduler.step(32);
    const changed = before.some(
      (value, index) => value !== canvas.frame[index],
    );
    expect(changed).toBe(true);
    instance?.cleanup?.();
  });

  it("routes each Scene Transform mode to its live gizmo", async () => {
    scheduler = createAnimationScheduler();
    Object.defineProperty(globalThis, "requestAnimationFrame", {
      configurable: true,
      value: scheduler.request,
    });
    Object.defineProperty(globalThis, "cancelAnimationFrame", {
      configurable: true,
      value: scheduler.cancel,
    });

    const entry = examples.find(
      (candidate) => candidate.meta.id === "scene-transform",
    );
    const module = await entry.load();
    const modeControl = module.controls?.find(
      (control) => control.key === "mode",
    );
    expect(modeControl).toMatchObject({
      type: "select",
      options: ["translate", "rotate", "scale"],
      default: "translate",
    });

    const modes = [];
    const originalSetMode = TransformControls.prototype.setMode;
    TransformControls.prototype.setMode = function (mode) {
      modes.push(mode);
      return originalSetMode.call(this, mode);
    };

    try {
      const canvas = createExampleCanvas();
      const instance = module.setup(canvas, { mode: "translate" });
      const changedFrames = [];
      const visiblePixels = [];
      for (const mode of ["rotate", "scale", "translate"]) {
        const before = canvas.frame.slice();
        instance?.update?.({ mode });
        scheduler.step(32);
        changedFrames.push(
          before.some((value, index) => value !== canvas.frame[index]),
        );
        visiblePixels.push(countVisiblePixels(canvas));
        scheduler.step(48);
        visiblePixels.push(countVisiblePixels(canvas));
      }
      expect(modes).toEqual(["translate", "rotate", "scale", "translate"]);
      expect(changedFrames).toEqual([true, true, true]);
      expect(visiblePixels.every((count) => count > 0)).toBe(true);
      instance?.cleanup?.();
    } finally {
      TransformControls.prototype.setMode = originalSetMode;
    }
  });
});
