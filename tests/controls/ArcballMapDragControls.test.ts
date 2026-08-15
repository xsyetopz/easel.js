import { describe, expect, it, vi } from "bun:test";
import {
  ArcballControls,
  BoxGeometry,
  DragControls,
  LambertMaterial,
  MapControls,
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
  Vector3,
} from "@/index.js";

type Listener = (event: Event & Record<string, unknown>) => void;

function element() {
  const listeners = new Map<string, Listener[]>();
  return {
    clientWidth: 800,
    clientHeight: 600,
    style: {} as CSSStyleDeclaration,
    addEventListener(type: string, listener: EventListener) {
      const fn = listener as Listener;
      listeners.set(type, [...(listeners.get(type) ?? []), fn]);
    },
    removeEventListener(type: string, listener: EventListener) {
      listeners.set(
        type,
        (listeners.get(type) ?? []).filter((entry) => entry !== listener),
      );
    },
    dispatchEvent: vi.fn(() => true),
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    fire(type: string, event: Record<string, unknown>) {
      for (const listener of listeners.get(type) ?? [])
        listener({ type, ...event } as Event & Record<string, unknown>);
    },
    count(type: string) {
      return (listeners.get(type) ?? []).length;
    },
  };
}

describe("ArcballControls", () => {
  it("rotates around the target and restores saved state", () => {
    const camera = new PerspectiveCamera();
    camera.position.set(0, 0, 6);
    camera.lookAt(new Vector3());
    camera.updateMatrixWorld(false, true);
    const target = element();
    const controls = new ArcballControls(camera, target);
    controls.saveState();
    target.fire("pointerdown", {
      pointerId: 1,
      button: 0,
      clientX: 400,
      clientY: 300,
    });
    target.fire("pointermove", { pointerId: 1, clientX: 500, clientY: 300 });
    expect(camera.position.x).not.toBe(0);
    target.fire("pointerup", { pointerId: 1 });
    controls.reset();
    expect(camera.position.x).toBe(0);
    expect(camera.position.z).toBe(6);
    controls.dispose();
    expect(target.count("pointerdown")).toBe(0);
  });
});

describe("MapControls", () => {
  it("defaults to horizontal-plane panning", () => {
    const camera = new PerspectiveCamera();
    const controls = new MapControls(
      camera,
      element() as unknown as ConstructorParameters<typeof MapControls>[1],
    );
    expect(controls.primaryAction).toBe("pan");
    expect(controls.screenSpacePanning).toBe(false);
    controls.dispose();
  });

  it("pans a top-down orthographic camera on the ground plane and zooms", () => {
    const camera = new OrthographicCamera({
      left: -5,
      right: 5,
      top: 3,
      bottom: -3,
    });
    camera.position.set(0, 8, 0.01);
    camera.lookAt(new Vector3());
    camera.updateMatrixWorld(false, true);
    const target = element();
    const controls = new MapControls(camera, target);
    const initialY = camera.position.y;

    target.fire("wheel", { deltaY: -120, preventDefault: vi.fn() });
    expect(camera.zoom).toBeGreaterThan(1);

    target.fire("pointerdown", {
      pointerId: 1,
      button: 0,
      clientX: 400,
      clientY: 300,
    });
    target.fire("pointermove", {
      pointerId: 1,
      clientX: 460,
      clientY: 340,
    });
    target.fire("pointerup", { pointerId: 1 });
    controls.update();

    expect(camera.position.y).toBeCloseTo(initialY);
    expect(Math.hypot(controls.target.x, controls.target.z)).toBeGreaterThan(0);
    expect(controls.target.y).toBeCloseTo(0);
    controls.dispose();
  });

  it("maps pointer directions directly onto a top-down view", () => {
    const camera = new OrthographicCamera({
      left: -5,
      right: 5,
      top: 3,
      bottom: -3,
    });
    camera.position.set(0, 8, 0.01);
    camera.updateMatrixWorld(false, true);
    camera.lookAt(new Vector3());
    camera.updateMatrixWorld(true);
    const target = element();
    const controls = new MapControls(camera, target);

    target.fire("pointerdown", {
      pointerId: 2,
      button: 0,
      clientX: 400,
      clientY: 300,
    });
    target.fire("pointermove", {
      pointerId: 2,
      clientX: 460,
      clientY: 240,
    });
    target.fire("pointerup", { pointerId: 2 });
    controls.update();

    expect(controls.target.x).toBeGreaterThan(0);
    expect(controls.target.z).toBeLessThan(0);
    expect(controls.target.y).toBeCloseTo(0);
    controls.dispose();
  });

  it("does not rotate a top-down camera while damping a pan", () => {
    const camera = new OrthographicCamera({
      left: -5,
      right: 5,
      top: 3,
      bottom: -3,
    });
    camera.position.set(0, 8, 0.01);
    const target = element();
    const controls = new MapControls(camera, target);
    controls.enableDamping = true;
    controls.update();
    const initialOrientation = camera.quaternion.clone();

    target.fire("pointerdown", {
      pointerId: 1,
      button: 0,
      clientX: 400,
      clientY: 300,
    });
    target.fire("pointermove", {
      pointerId: 1,
      clientX: 460,
      clientY: 340,
    });
    target.fire("pointerup", { pointerId: 1 });

    for (let frame = 0; frame < 10; frame++) {
      controls.update();
      expect(camera.quaternion.angleTo(initialOrientation)).toBeLessThan(1e-6);
    }
    controls.dispose();
  });
});

describe("DragControls", () => {
  it("moves a picked mesh along the camera-facing drag plane", () => {
    const camera = new PerspectiveCamera({ aspect: 800 / 600 });
    camera.position.set(0, 0, 6);
    camera.lookAt(new Vector3());
    camera.updateMatrixWorld(false, true);
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), new LambertMaterial());
    mesh.updateMatrixWorld(false, true);
    const target = element();
    const controls = new DragControls([mesh], camera, target);
    let dragged = false;
    controls.addEventListener("drag", () => {
      dragged = true;
    });
    target.fire("pointerdown", {
      pointerId: 2,
      button: 0,
      clientX: 400,
      clientY: 300,
    });
    target.fire("pointermove", { pointerId: 2, clientX: 500, clientY: 300 });
    target.fire("pointerup", { pointerId: 2 });
    expect(dragged).toBe(true);
    expect(mesh.position.x).not.toBe(0);
    controls.dispose();
  });
});
