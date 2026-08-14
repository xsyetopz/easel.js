import { describe, expect, it } from "bun:test";

import { createExampleAnimationLoop } from "../../www/runtime/example-animation.ts";
import { mountExampleRuntime } from "../../www/runtime/example-viewport.ts";

describe("example animation lifecycle", () => {
  it("renders one frame, pauses, resumes, honors reduced motion, and cleans up", () => {
    const originalRequest = globalThis.requestAnimationFrame;
    const originalCancel = globalThis.cancelAnimationFrame;
    let nextHandle = 1;
    const callbacks = new Map();
    const cancelled = [];
    Object.defineProperty(globalThis, "requestAnimationFrame", {
      configurable: true,
      value(callback) {
        const handle = nextHandle++;
        callbacks.set(handle, callback);
        return handle;
      },
    });
    Object.defineProperty(globalThis, "cancelAnimationFrame", {
      configurable: true,
      value(handle) {
        cancelled.push(handle);
        callbacks.delete(handle);
      },
    });

    try {
      const timestamps = [];
      const loop = createExampleAnimationLoop((timestamp) => {
        timestamps.push(timestamp);
      });
      expect(timestamps).toHaveLength(1);
      expect(callbacks.size).toBe(1);

      loop.pause();
      expect(cancelled).toHaveLength(1);
      expect(callbacks.size).toBe(0);

      loop.resume();
      expect(timestamps).toHaveLength(2);
      expect(callbacks.size).toBe(1);

      loop.setReducedMotion(true);
      expect(cancelled).toHaveLength(2);
      expect(callbacks.size).toBe(0);

      loop.setReducedMotion(false);
      expect(timestamps).toHaveLength(3);
      expect(callbacks.size).toBe(1);

      loop.cleanup();
      expect(cancelled).toHaveLength(3);
      expect(callbacks.size).toBe(0);
      loop.resume();
      expect(timestamps).toHaveLength(3);
    } finally {
      if (originalRequest === undefined) {
        delete globalThis.requestAnimationFrame;
      } else {
        Object.defineProperty(globalThis, "requestAnimationFrame", {
          configurable: true,
          value: originalRequest,
        });
      }
      if (originalCancel === undefined) {
        delete globalThis.cancelAnimationFrame;
      } else {
        Object.defineProperty(globalThis, "cancelAnimationFrame", {
          configurable: true,
          value: originalCancel,
        });
      }
    }
  });

  it("forwards responsive runtime lifecycle to an animated module", () => {
    const originalMatchMedia = globalThis.matchMedia;
    const mediaListeners = new Set();
    Object.defineProperty(globalThis, "matchMedia", {
      configurable: true,
      value() {
        return {
          matches: true,
          addEventListener(_type, listener) {
            mediaListeners.add(listener);
          },
          removeEventListener(_type, listener) {
            mediaListeners.delete(listener);
          },
        };
      },
    });

    try {
      const canvas = {
        width: 16,
        height: 9,
        parentElement: { clientWidth: 640 },
        getContext() {
          return {};
        },
      };
      const states = [];
      const calls = [];
      const module = {
        meta: {
          id: "runtime-test",
          name: "Runtime test",
          category: "motion",
          animated: true,
          description: "Exercise the responsive example runtime lifecycle.",
        },
        controls: [],
        easelSource: 'import * as EASEL from "@xsyetopz/easel";',
        setup() {
          calls.push("setup");
          return {
            pause() {
              calls.push("pause");
            },
            resume() {
              calls.push("resume");
            },
            setReducedMotion(reduced) {
              calls.push(reduced ? "reduced" : "motion");
            },
            cleanup() {
              calls.push("cleanup");
            },
          };
        },
      };
      const controller = mountExampleRuntime({
        canvas,
        module,
        params: {},
        onState(state) {
          states.push(state);
        },
      });

      expect(states).toEqual(["loading", "ready"]);
      expect(calls).toEqual(["setup", "reduced"]);
      expect(controller.paused).toBe(true);
      controller.pause();
      controller.resume();
      expect(calls).toEqual(["setup", "reduced", "pause", "resume"]);
      controller.cleanup();
      expect(calls.at(-1)).toBe("cleanup");
      expect(mediaListeners.size).toBe(0);
    } finally {
      if (originalMatchMedia === undefined) {
        delete globalThis.matchMedia;
      } else {
        Object.defineProperty(globalThis, "matchMedia", {
          configurable: true,
          value: originalMatchMedia,
        });
      }
    }
  });
});
