import { describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";
import * as THREE from "three";
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
  pixelRatio = undefined;
  size = undefined;
  scene = undefined;
  camera = undefined;

  constructor(_options) {
    MockRenderer.instances.push(this);
  }

  setPixelRatio(ratio) {
    this.pixelRatio = ratio;
  }

  setSize(width, height, _updateStyle) {
    this.size = { width, height };
  }
  setScissorTest(_enabled) {}
  setClearColor(_color, _alpha) {}
  setScissor(_x, _y, _width, _height) {}
  setViewport(_x, _y, _width, _height) {}
  render(scene, camera) {
    this.renders += 1;
    this.scene = scene;
    this.camera = camera;
  }
  dispose() {
    this.disposed += 1;
  }
}

class MockControls {
  static instances = [];
  disposed = 0;
  updates = [];
  target = {
    x: 0,
    y: 0,
    z: 0,
    set: (x, y, z) => Object.assign(this.target, { x, y, z }),
  };
  enableDamping = false;
  enableRotate = true;
  enablePan = true;
  enabled = true;
  isLocked = false;
  lockCalls = 0;
  moved = [];
  eventHandlers = new Map();

  constructor(...args) {
    this.args = args;
    MockControls.instances.push(this);
  }

  update(...args) {
    this.updates.push(args);
  }
  setGizmosVisible(value) {
    this.gizmosVisible = value;
  }
  attach(object) {
    this.attached = object;
  }
  getHelper() {
    return new THREE.Object3D();
  }
  setMode(mode) {
    this.mode = mode;
  }
  lock() {
    this.isLocked = true;
    this.lockCalls += 1;
  }
  moveForward(distance) {
    this.moved.push(distance);
  }
  addEventListener(type, handler) {
    this.eventHandlers.set(type, handler);
  }
  removeEventListener(type, handler) {
    if (this.eventHandlers.get(type) === handler)
      this.eventHandlers.delete(type);
  }
  dispose() {
    this.disposed += 1;
  }
}

class MockAnimationClip {
  static instances = [];

  constructor(name, duration, tracks) {
    this.name = name;
    this.duration = duration;
    this.tracks = tracks;
    MockAnimationClip.instances.push(this);
  }
}

class MockNumberKeyframeTrack {
  constructor(name, times, values) {
    this.name = name;
    this.times = times;
    this.values = values;
  }
}

class MockAnimationMixer {
  static instances = [];

  constructor(root) {
    this.root = root;
    this.clips = [];
    this.time = undefined;
    MockAnimationMixer.instances.push(this);
  }

  clipAction(clip) {
    this.clips.push(clip);
    const action = {
      setLoop: () => action,
      play: () => action,
    };
    return action;
  }

  setTime(time) {
    this.time = time;
  }
}

const CONTROL_RUNTIME_OVERRIDES = {
  OrbitControls: MockControls,
  ArcballControls: MockControls,
  DragControls: MockControls,
  FlyControls: MockControls,
  MapControls: MockControls,
  PointerLockControls: MockControls,
  TrackballControls: MockControls,
  TransformControls: MockControls,
};

function positionOf(object) {
  return object.position.toArray().map((value) => {
    const rounded = Number(value.toFixed(6));
    return Object.is(rounded, -0) ? 0 : rounded;
  });
}

function meshesOf(scene) {
  return scene.children.filter((object) => object.isMesh);
}

function lightsOf(scene) {
  return scene.children.filter((object) => object.isLight);
}

function setupTestDom() {
  const dom = new JSDOM("<!doctype html><body></body>");
  const previousDocument = globalThis.document;
  const previousRequestAnimationFrame = globalThis.requestAnimationFrame;
  const previousCancelAnimationFrame = globalThis.cancelAnimationFrame;
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
  return {
    dom,
    restore() {
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
    },
  };
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

  it("preserves matched adapter metadata and authored camera settings", () => {
    const expected = {
      misc_animation_groups: {
        kind: "animation",
        match: "animation-groups",
        camera: { fov: 45, near: 0.1, far: 100, position: [0, 1, 7] },
      },
      webgl_animation_keyframes: {
        kind: "animation",
        match: "animation-keyframes",
        camera: { fov: 45, near: 0.1, far: 100, position: [0, 1.2, 6.5] },
      },
      webgl_animation_multiple: {
        kind: "animation",
        match: "animation-multiple",
        camera: { fov: 45, near: 0.1, far: 100, position: [0, 1.1, 7.5] },
      },
      webgl_geometries: {
        kind: "geometry",
        match: "geometry-gallery",
        camera: { fov: 42, near: 0.1, far: 100, position: [0, 0, 11] },
      },
      webgl_helpers: {
        kind: "geometry",
        match: "helpers",
        camera: { fov: 42, near: 0.1, far: 50, position: [3, 3, 5] },
      },
      camera_perspective_projection: {
        kind: "camera",
        match: "perspective-projection",
        camera: { fov: 45, near: 0.1, far: 100, position: [10, 0, 10] },
      },
    };

    expect(Object.keys(expected)).toHaveLength(6);
    for (const [id, contract] of Object.entries(expected)) {
      const adapter = getThreeComparisonAdapter(id);
      expect(adapter).toBeDefined();
      expect({
        id: adapter?.id,
        kind: adapter?.kind,
        match: adapter?.match,
        camera: adapter?.camera,
      }).toEqual({ id, ...contract });
    }
  });

  it("matches authored animation and control scenes", () => {
    const expectedMetadata = {
      misc_animation_keys: {
        match: "animation-keys",
        camera: { position: [0, 1, 6], lookAt: [0, 0, 0] },
        lighting: {
          ambient: 0.3,
          directional: 0.9,
          position: [3, 4, 5],
        },
      },
      misc_controls_orbit: {
        match: "controls-orbit",
        camera: { position: [3, 2, 6], lookAt: [0, 0, 0] },
        lighting: {
          ambient: 0.35,
          directional: 0.9,
          position: [4, 5, 6],
        },
      },
      misc_controls_arcball: {
        match: "controls-arcball",
        camera: { position: [3, 2.5, 6], lookAt: [0, 0, 0] },
        lighting: {
          ambient: 0.35,
          directional: 0.95,
          position: [5, 7, 8],
          fill: { color: 0x6d9dff, intensity: 0.25, position: [-4, 2, -5] },
        },
      },
      misc_controls_drag: {
        match: "controls-drag",
        camera: { position: [0, 1, 8], lookAt: [0, 0.5, 0] },
        lighting: {
          ambient: 0.35,
          directional: 0.95,
          position: [5, 7, 8],
          fill: { color: 0x6d9dff, intensity: 0.25, position: [-4, 2, -5] },
        },
      },
      misc_controls_fly: {
        match: "controls-fly",
        camera: { position: [0, 2, 8], lookAt: [0, 1, 0] },
        lighting: {
          ambient: 0.35,
          directional: 0.95,
          position: [5, 7, 8],
          fill: { color: 0x6d9dff, intensity: 0.25, position: [-4, 2, -5] },
        },
      },
      misc_controls_map: {
        match: "controls-map",
        camera: { position: [5, 6, 8], lookAt: [0, 0, 0] },
        lighting: {
          ambient: 0.35,
          directional: 0.95,
          position: [5, 7, 8],
          fill: { color: 0x6d9dff, intensity: 0.25, position: [-4, 2, -5] },
        },
      },
      misc_controls_pointerlock: {
        match: "controls-pointerlock",
        camera: { position: [0, 1.5, 8], lookAt: [0, 1, 0] },
        lighting: {
          ambient: 0.35,
          directional: 0.95,
          position: [5, 7, 8],
          fill: { color: 0x6d9dff, intensity: 0.25, position: [-4, 2, -5] },
        },
      },
      misc_controls_trackball: {
        match: "controls-trackball",
        camera: { position: [4, 3, 7], lookAt: [0, 0, 0] },
        lighting: {
          ambient: 0.35,
          directional: 0.95,
          position: [5, 7, 8],
          fill: { color: 0x6d9dff, intensity: 0.25, position: [-4, 2, -5] },
        },
      },
      misc_controls_transform: {
        match: "controls-transform",
        camera: { position: [3, 2, 6], lookAt: [0, 0, 0] },
        lighting: {
          ambient: 0.4,
          directional: 0.9,
          position: [4, 5, 6],
        },
      },
    };
    const environment = setupTestDom();
    MockRenderer.instances = [];
    MockControls.instances = [];
    MockAnimationClip.instances = [];
    MockAnimationMixer.instances = [];
    try {
      for (const [id, expected] of Object.entries(expectedMetadata)) {
        const canvas = environment.dom.window.document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 360;
        const controlsBeforeMount = MockControls.instances.length;
        const instance = setupThreeComparison(canvas, id, {
          ...CONTROL_RUNTIME_OVERRIDES,
          AnimationClip: MockAnimationClip,
          AnimationMixer: MockAnimationMixer,
          NumberKeyframeTrack: MockNumberKeyframeTrack,
          WebGLRenderer: MockRenderer,
        });
        const renderer = MockRenderer.instances.at(-1);
        const scene = renderer.scene;
        const camera = renderer.camera;
        expect(getThreeComparisonAdapter(id)).toMatchObject({
          id,
          match: expected.match,
          camera: expected.camera,
        });
        expect(positionOf(camera)).toEqual(expected.camera.position);
        const expectedDirection = new THREE.Vector3(...expected.camera.lookAt)
          .sub(camera.position)
          .normalize();
        expect(
          camera
            .getWorldDirection(new THREE.Vector3())
            .distanceTo(expectedDirection),
        ).toBeLessThan(1e-6);
        const lights = lightsOf(scene);
        const ambient = lights.find((light) => light.isAmbientLight);
        const directional = lights.find(
          (light) =>
            light.isDirectionalLight &&
            light.intensity === (expected.lighting?.directional ?? 0.9),
        );
        expect(ambient?.intensity).toBe(expected.lighting?.ambient ?? 0.35);
        if (expected.lighting) {
          expect(positionOf(directional)).toEqual(expected.lighting.position);
          expect(directional?.intensity).toBe(expected.lighting.directional);
          if (expected.lighting.fill) {
            const fill = lights.at(-1);
            expect(fill?.color.getHex()).toBe(expected.lighting.fill.color);
            expect(fill?.intensity).toBe(expected.lighting.fill.intensity);
            expect(positionOf(fill)).toEqual(expected.lighting.fill.position);
          }
        }

        const meshes = meshesOf(scene);
        if (id === "misc_animation_keys") {
          expect(meshes).toHaveLength(1);
          expect(meshes[0].geometry.parameters).toMatchObject({
            radius: 1,
            tube: 0.32,
            tubularSegments: 48,
            radialSegments: 10,
          });
          expect(meshes[0].material.color.getHex()).toBe(0x67c5a4);
          const clip = MockAnimationClip.instances.at(-1);
          expect(clip).toMatchObject({ name: "keys", duration: 2 });
          expect(clip.tracks).toEqual([
            expect.objectContaining({
              name: ".position[y]",
              times: [0, 1, 2],
              values: [0, 1.2, 0],
            }),
            expect.objectContaining({
              name: ".rotation[y]",
              times: [0, 2],
              values: [0, Math.PI * 2],
            }),
          ]);
        } else if (id === "misc_controls_orbit") {
          expect(meshes).toHaveLength(1);
          expect(meshes[0].geometry.parameters).toMatchObject({
            radius: 1,
            tube: 0.3,
            tubularSegments: 48,
            radialSegments: 10,
          });
          expect(meshes[0].material.color.getHex()).toBe(0x588fd4);
          const control = MockControls.instances.at(-1);
          expect(control.enableDamping).toBe(true);
          expect(control.target).toMatchObject({ x: 0, y: 0, z: 0 });
        } else if (id === "misc_controls_arcball") {
          expect(meshes).toHaveLength(1);
          expect(meshes[0].geometry.parameters).toMatchObject({
            width: 2,
            height: 2,
            depth: 2,
          });
          expect(meshes[0].material.color.getHex()).toBe(0x5b9fe0);
          const control = MockControls.instances.at(-1);
          expect(control.gizmosVisible).toBe(true);
          expect(control.target).toMatchObject({ x: 0, y: 0, z: 0 });
          expect(lights).toHaveLength(3);
          expect(lights.at(-1).intensity).toBe(0.25);
          expect(positionOf(lights.at(-1))).toEqual([-4, 2, -5]);
        } else if (id === "misc_controls_drag") {
          expect(meshes).toHaveLength(12);
          expect(meshes.map((mesh) => positionOf(mesh))).toEqual(
            Array.from({ length: 12 }, (_, index) => [
              (index % 4) - 1.5,
              Math.floor(index / 4) - 1,
              0,
            ]),
          );
          expect(meshes.map((mesh) => mesh.material.color.getHex())).toEqual(
            Array.from({ length: 12 }, (_, index) =>
              index % 2 ? 0x5b9fe0 : 0xe4b85f,
            ),
          );
          expect(MockControls.instances.at(-1).args[0]).toEqual(meshes);
        } else if (id === "misc_controls_fly") {
          expect(meshes).toHaveLength(24);
          expect(meshes.map((mesh) => positionOf(mesh))).toEqual(
            Array.from({ length: 24 }, (_, index) => [
              (index % 6) - 2.5,
              Number((Math.floor(index / 6) * 0.7).toFixed(6)),
              -Math.floor(index / 6) * 2 || 0,
            ]),
          );
          const control = MockControls.instances.at(-1);
          expect(control.movementSpeed).toBe(3);
          expect(control.rollSpeed).toBe(0.7);
        } else if (id === "misc_controls_map") {
          expect(meshes).toHaveLength(16);
          expect(meshes.map((mesh) => mesh.geometry.parameters.height)).toEqual(
            Array.from({ length: 16 }, (_, index) => 0.8 + (index % 3) * 0.4),
          );
          expect(meshes.map((mesh) => positionOf(mesh))).toEqual(
            Array.from({ length: 16 }, (_, index) => [
              (index % 4) - 1.5,
              0.4,
              Math.floor(index / 4) - 1.5,
            ]),
          );
          const control = MockControls.instances.at(-1);
          expect(control.enableDamping).toBe(true);
          expect(control.screenSpacePanning).toBe(false);
        } else if (id === "misc_controls_pointerlock") {
          expect(meshes).toHaveLength(40);
          expect(meshes.map((mesh) => positionOf(mesh))).toEqual(
            Array.from({ length: 40 }, (_, index) => [
              ((index * 17) % 11) - 5,
              Number(((index % 4) * 0.8).toFixed(6)),
              -Math.floor(index / 4) * 2 || 0,
            ]),
          );
          const control = MockControls.instances.at(-1);
          canvas.click();
          expect(control.lockCalls).toBe(1);
          instance.update();
          expect(control.moved.at(-1)).toBeGreaterThan(0);
          expect(meshes[0].rotation.y).toBeCloseTo(
            (control.moved.at(-1) / 3) * 0.4,
          );
        } else if (id === "misc_controls_trackball") {
          expect(meshes).toHaveLength(1);
          expect(meshes[0].geometry.parameters).toMatchObject({
            width: 2,
            height: 2,
            depth: 2,
          });
          expect(meshes[0].material.color.getHex()).toBe(0x5b9fe0);
          const control = MockControls.instances.at(-1);
          expect(control.staticMoving).toBe(false);
          expect(control.target).toMatchObject({ x: 0, y: 0, z: 0 });
        } else if (id === "misc_controls_transform") {
          expect(meshes).toHaveLength(1);
          expect(meshes[0].geometry.parameters).toMatchObject({
            width: 1.5,
            height: 1.5,
            depth: 1.5,
          });
          expect(meshes[0].material.color.getHex()).toBe(0x4d8fd6);
          const [transform, orbit] = MockControls.instances.slice(-2);
          expect(transform.attached).toBe(meshes[0]);
          expect(transform.mode).toBe("translate");
          expect(transform.axis).toBe("XYZ");
          expect(orbit.enableDamping).toBe(true);
        }
        const mountedControls =
          MockControls.instances.slice(controlsBeforeMount);
        expect(mountedControls).toHaveLength(
          id === "misc_animation_keys"
            ? 0
            : id === "misc_controls_transform"
              ? 2
              : 1,
        );
        if (mountedControls.length > 0)
          expect(
            mountedControls.some((control) => control.updates.length > 0),
          ).toBe(true);
        instance.cleanup();
        expect(mountedControls.every((control) => control.disposed === 1)).toBe(
          true,
        );
      }
    } finally {
      environment.restore();
    }
  });

  it("gives every adapter a nonempty comparison boundary", () => {
    for (const adapter of THREE_ADAPTERS.values())
      expect(adapter.boundary.trim()).not.toBe("");
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

  it("uses CSS dimensions for the renderer while preserving the canvas backing size", () => {
    const previousDocument = globalThis.document;
    const dom = new JSDOM("<!doctype html><body></body>");
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: dom.window.document,
    });
    try {
      const canvas = dom.window.document.createElement("canvas");
      canvas.width = 2076;
      canvas.height = 1600;
      let clientWidth = 519;
      let clientHeight = 400;
      Object.defineProperties(canvas, {
        clientWidth: {
          configurable: true,
          get: () => clientWidth,
        },
        clientHeight: {
          configurable: true,
          get: () => clientHeight,
        },
      });
      MockRenderer.instances = [];
      const instance = setupThreeComparison(canvas, "misc_animation_groups", {
        WebGLRenderer: MockRenderer,
        OrbitControls: MockControls,
      });
      expect(MockRenderer.instances[0]?.size).toEqual({
        width: 519,
        height: 400,
      });
      expect(MockRenderer.instances[0]?.pixelRatio).toBe(1);

      clientWidth = 640;
      clientHeight = 360;
      instance?.update?.();

      expect(MockRenderer.instances[0]?.size).toEqual({
        width: 640,
        height: 360,
      });
      expect(canvas.width).toBe(2076);
      expect(canvas.height).toBe(1600);
      expect(MockRenderer.instances[0]?.renders).toBe(2);
      instance?.cleanup?.();
    } finally {
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: previousDocument,
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
