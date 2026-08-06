import { describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";
import { createXRInputPreview } from "../../www/examples/xr/xr_input_helpers.js";

const routes = [
  ["../../www/examples/xr/webxr_xr_cubes.js", "webxr_xr_cubes"],
  [
    "../../www/examples/xr/webxr_xr_controls_transform.js",
    "webxr_xr_controls_transform",
  ],
  ["../../www/examples/xr/webxr_xr_dragging.js", "webxr_xr_dragging"],
  ["../../www/examples/xr/webxr_xr_haptics.js", "webxr_xr_haptics"],
  ["../../www/examples/xr/webxr_vr_handinput.js", "webxr_vr_handinput"],
  [
    "../../www/examples/xr/webxr_vr_handinput_cubes.js",
    "webxr_vr_handinput_cubes",
  ],
  [
    "../../www/examples/xr/webxr_vr_handinput_pointerclick.js",
    "webxr_vr_handinput_pointerclick",
  ],
  [
    "../../www/examples/xr/webxr_vr_handinput_pointerdrag.js",
    "webxr_vr_handinput_pointerdrag",
  ],
  [
    "../../www/examples/xr/webxr_vr_handinput_pressbutton.js",
    "webxr_vr_handinput_pressbutton",
  ],
  [
    "../../www/examples/xr/webxr_vr_handinput_profiles.js",
    "webxr_vr_handinput_profiles",
  ],
];

describe("WebXR input website examples", () => {
  it("mounts every route with a desktop Canvas2D fallback and cleans it up", async () => {
    const previousDocument = globalThis.document;
    const previousNavigator = globalThis.navigator;
    const previousRequestAnimationFrame = globalThis.requestAnimationFrame;
    const previousCancelAnimationFrame = globalThis.cancelAnimationFrame;
    const dom = new JSDOM("<!doctype html><body></body>");
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: dom.window.document,
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: dom.window.navigator,
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
      for (const [modulePath, expectedId] of routes) {
        const example = await import(modulePath);
        const stage = dom.window.document.createElement("div");
        const canvas = dom.window.document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 360;
        Object.defineProperty(canvas, "getContext", {
          configurable: true,
          value: () => null,
        });
        stage.append(canvas);
        dom.window.document.body.append(stage);
        const instance = example.setup(canvas);
        expect(example.meta.id).toBe(expectedId);
        expect(example.easelSource).toContain("@xsyetopz/easel");
        expect(example.threeSource).toContain('from "three"');
        expect(instance).toBeDefined();
        expect(stage.querySelector("[data-xr-status]")?.textContent).toContain(
          "desktop Canvas2D",
        );
        expect(stage.querySelector("[data-xr-session-button]")).not.toBeNull();
        instance?.cleanup();
        expect(stage.querySelector("[data-xr-status]")).toBeNull();
        expect(stage.querySelector("[data-xr-session-button]")).toBeNull();
      }
    } finally {
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: previousDocument,
      });
      Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: previousNavigator,
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

  it("registers exact IDs and source pairs", async () => {
    const { examples } = await import("../../www/examples/registry.ts");
    for (const [, expectedId] of routes) {
      const example = examples.find((entry) => entry.meta.id === expectedId);
      expect(example).toBeDefined();
      expect(example?.meta.category).toBe("webxr");
      expect(example?.easelSource).toContain("@xsyetopz/easel");
      expect(example?.threeSource).toContain('from "three"');
    }
  });

  it("keeps hand-input routes deterministic on the desktop Canvas2D fallback", async () => {
    const previousDocument = globalThis.document;
    const previousNavigator = globalThis.navigator;
    const previousRequestAnimationFrame = globalThis.requestAnimationFrame;
    const previousCancelAnimationFrame = globalThis.cancelAnimationFrame;
    const dom = new JSDOM("<!doctype html><body></body>");
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: dom.window.document,
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: dom.window.navigator,
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
      const cases = [
        ["webxr_vr_handinput_cubes", "cubes", 24],
        ["webxr_vr_handinput_pointerclick", "buttons", 3],
        ["webxr_vr_handinput_pointerdrag", "blocks", 12],
        ["webxr_vr_handinput_pressbutton", "button", 1],
        ["webxr_vr_handinput_profiles", "profileCards", 4],
      ];
      for (const [expectedId, property, expectedLength] of cases) {
        const route = routes.find(([, id]) => id === expectedId);
        const example = await import(route[0]);
        const canvas = dom.window.document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 360;
        Object.defineProperty(canvas, "getContext", {
          configurable: true,
          value: () => null,
        });
        dom.window.document.body.append(canvas);
        const instance = example.setup(canvas);
        const value = instance[property];
        expect(Array.isArray(value) ? value.length : 1).toBe(expectedLength);
        instance.update?.({
          inputStates: [],
          desktop: { active: false, x: 0, y: 0, buttons: 0 },
          status: instance.status,
          pulseHaptic: instance.pulseHaptic,
        });
        expect(instance.status).toBeDefined();
        instance.cleanup();
      }
    } finally {
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: previousDocument,
      });
      Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: previousNavigator,
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

  it("uses XR sessions for input and haptics without taking over the Canvas2D frame", async () => {
    const previousDocument = globalThis.document;
    const previousNavigator = globalThis.navigator;
    const previousRequestAnimationFrame = globalThis.requestAnimationFrame;
    const previousCancelAnimationFrame = globalThis.cancelAnimationFrame;
    const dom = new JSDOM("<!doctype html><body></body>");
    const listeners = new Map();
    let frameCallback;
    let pulseCount = 0;
    let ended = 0;
    const source = {
      handedness: "left",
      targetRayMode: "tracked-pointer",
      targetRaySpace: {},
      gamepad: {
        hapticActuators: [
          {
            pulse() {
              pulseCount += 1;
              return Promise.resolve(true);
            },
          },
        ],
      },
    };
    const session = {
      inputSources: [source],
      addEventListener(type, listener) {
        listeners.set(type, listener);
      },
      removeEventListener(type) {
        listeners.delete(type);
      },
      requestReferenceSpace: async () => ({}),
      requestAnimationFrame(callback) {
        frameCallback = callback;
        return 1;
      },
      cancelAnimationFrame() {},
      async end() {
        ended += 1;
      },
    };
    const xr = {
      isSessionSupported: async () => true,
      requestSession: async () => session,
    };
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: dom.window.document,
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: Object.assign(dom.window.navigator, { xr }),
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
      const canvas = dom.window.document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      Object.defineProperty(canvas, "getContext", {
        configurable: true,
        value: () => null,
      });
      dom.window.document.body.append(canvas);
      const preview = createXRInputPreview(canvas);
      dom.window.document
        .querySelector("[data-xr-session-button]")
        ?.dispatchEvent(new dom.window.Event("click"));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      listeners.get("selectstart")?.({ inputSource: source });
      frameCallback?.(0, {
        session,
        getPose: () => ({
          transform: {
            position: { x: 0.2, y: 1.1, z: -0.5 },
            orientation: { x: 0, y: 0, z: 0, w: 1 },
          },
        }),
      });
      expect(preview.inputStates[0]?.selecting).toBe(true);
      expect(preview.inputStates[0]?.position.x).toBeCloseTo(0.2);
      expect(preview.pulseHaptic(preview.inputStates[0], 0.5, 50)).toBe(true);
      expect(pulseCount).toBe(1);
      preview.cleanup();
      expect(ended).toBe(1);
    } finally {
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: previousDocument,
      });
      Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: previousNavigator,
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
