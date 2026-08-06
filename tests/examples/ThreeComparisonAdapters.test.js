import { describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";
import {
  getThreeComparisonAdapter,
  setupThreeComparison,
  THREE_ADAPTERS,
  THREE_COMPARISON_ADAPTER_IDS,
} from "../../www/runtime/three-comparison.js";

class MockRenderer {
  static instances = [];
  disposed = 0;
  renders = 0;

  constructor(_options) {
    MockRenderer.instances.push(this);
  }

  setPixelRatio(_ratio) {}
  setSize(_width, _height, _updateStyle) {}
  setScissorTest(_enabled) {}
  setClearColor(_color, _alpha) {}
  setScissor(_x, _y, _width, _height) {}
  setViewport(_x, _y, _width, _height) {}
  render() {
    this.renders += 1;
  }
  dispose() {
    this.disposed += 1;
  }
}

class MockControls {
  static instances = [];
  disposed = 0;
  target = { set: (_x, _y, _z) => {} };
  enableDamping = false;
  enableRotate = true;
  enablePan = true;

  constructor(_camera, _element) {
    MockControls.instances.push(this);
  }

  update() {}
  dispose() {
    this.disposed += 1;
  }
}

describe("THREE comparison adapter registry", () => {
  it("covers every registered example with a documented adapter boundary", async () => {
    const { examples } = await import("../../www/examples/registry.ts");
    expect(THREE_COMPARISON_ADAPTER_IDS).toHaveLength(examples.length);
    expect(THREE_ADAPTERS.size).toBe(examples.length);
    for (const example of examples) {
      const adapter = getThreeComparisonAdapter(example.meta.id);
      expect(adapter?.id).toBe(example.meta.id);
      expect(adapter?.boundary.length).toBeGreaterThan(20);
    }
  });

  it("mounts, updates, and cleans every adapter with a mocked renderer", async () => {
    const { examples } = await import("../../www/examples/registry.ts");
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
    MockRenderer.instances = [];
    MockControls.instances = [];
    try {
      for (const example of examples) {
        const canvas = dom.window.document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 360;
        const instance = setupThreeComparison(canvas, example.meta.id, {
          WebGLRenderer: MockRenderer,
          OrbitControls: MockControls,
        });
        expect(instance).toBeDefined();
        instance?.update?.();
        instance?.cleanup?.();
        instance?.cleanup?.();
      }
      expect(MockRenderer.instances).toHaveLength(examples.length);
      expect(
        MockRenderer.instances.every((renderer) => renderer.disposed === 1),
      ).toBe(true);
      expect(
        MockRenderer.instances.every((renderer) => renderer.renders > 0),
      ).toBe(true);
      expect(
        MockControls.instances.every((controls) => controls.disposed === 1),
      ).toBe(true);
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

  it("keeps an explicit error for IDs outside the registry contract", () => {
    expect(() =>
      setupThreeComparison({ width: 640, height: 360 }, "unknown_example", {
        WebGLRenderer: MockRenderer,
        OrbitControls: MockControls,
      }),
    ).toThrow(
      "No paired THREE.js comparison adapter is registered for unknown_example.",
    );
  });
});
