import { describe, expect, it, vi } from "bun:test";
import {
  BoxGeometry,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  TransformControls,
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

function scene() {
  const camera = new PerspectiveCamera({ aspect: 800 / 600 });
  camera.position.set(0, 0, 6);
  camera.lookAt(new Vector3());
  camera.updateMatrixWorld(false, true);
  const mesh = new Mesh(new BoxGeometry(1, 1, 1), new LambertMaterial());
  mesh.updateMatrixWorld(false, true);
  return { camera, mesh };
}

describe("TransformControls", () => {
  it("builds a visible CPU gizmo and picks an axis handle", () => {
    const { camera, mesh } = scene();
    const target = element();
    const controls = new TransformControls(camera, target).attach(mesh);
    expect(controls.helper.visible).toBe(true);
    expect(controls.helper.children.length).toBe(12);
    controls.setMode("rotate");
    expect(
      controls.helper.getObjectByName("TransformControls-RX")?.visible,
    ).toBe(true);
    expect(
      controls.helper.getObjectByName("TransformControls-X")?.visible,
    ).toBe(false);
    controls.setMode("translate");
    target.fire("pointerdown", {
      pointerId: 7,
      button: 0,
      clientX: 580,
      clientY: 300,
    });
    target.fire("pointermove", {
      pointerId: 7,
      clientX: 640,
      clientY: 300,
    });
    target.fire("pointerup", { pointerId: 7 });
    expect(mesh.position.x).toBeGreaterThan(0);
    controls.dispose();
    expect(controls.helper.visible).toBe(false);
  });

  it("translates an attached node along an axis with pointer rays", () => {
    const { camera, mesh } = scene();
    const target = element();
    const controls = new TransformControls(camera, target);
    controls.axis = "X";
    controls.attach(mesh);
    let changed = 0;
    controls.addEventListener("objectChange", () => changed++);
    target.fire("pointerdown", {
      pointerId: 1,
      button: 0,
      clientX: 400,
      clientY: 300,
    });
    target.fire("pointermove", {
      pointerId: 1,
      clientX: 500,
      clientY: 300,
    });
    target.fire("pointerup", { pointerId: 1 });
    expect(mesh.position.x).toBeGreaterThan(0);
    expect(changed).toBe(1);
    expect(controls.dragging).toBe(false);
    controls.dispose();
    expect(target.count("pointerdown")).toBe(0);
  });

  it("supports rotation and scale modes with snapping", () => {
    const { camera, mesh } = scene();
    const target = element();
    const controls = new TransformControls(camera, target);
    controls.attach(mesh).setAxis("Y").setMode("rotate");
    controls.rotationSnap = Math.PI / 2;
    target.fire("pointerdown", {
      pointerId: 2,
      button: 0,
      clientX: 400,
      clientY: 300,
    });
    target.fire("pointermove", {
      pointerId: 2,
      clientX: 500,
      clientY: 300,
    });
    target.fire("pointerup", { pointerId: 2 });
    expect(Math.abs(mesh.rotation.y)).toBeCloseTo(Math.PI / 2, 5);

    controls.setAxis("XYZ").setMode("scale");
    controls.scaleSnap = 0.5;
    target.fire("pointerdown", {
      pointerId: 3,
      button: 0,
      clientX: 400,
      clientY: 300,
    });
    target.fire("pointermove", {
      pointerId: 3,
      clientX: 600,
      clientY: 300,
    });
    target.fire("pointerup", { pointerId: 3 });
    expect(mesh.scale.x).toBeGreaterThan(1);
    controls.dispose();
  });
});
