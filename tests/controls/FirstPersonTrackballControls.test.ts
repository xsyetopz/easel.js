import { describe, expect, it, vi } from "bun:test";
import { PerspectiveCamera } from "@/cameras/PerspectiveCamera.js";
import { FirstPersonControls } from "@/controls/FirstPersonControls.js";
import { TrackballControls } from "@/controls/TrackballControls.js";

type Listener = (event: Event & Record<string, unknown>) => void;

function element() {
  const listeners = new Map<string, Listener[]>();
  return {
    clientWidth: 800,
    clientHeight: 600,
    style: {},
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
    fire(type: string, event: Record<string, unknown>) {
      for (const listener of listeners.get(type) ?? [])
        listener({ type, ...event } as Event & Record<string, unknown>);
    },
    count(type: string) {
      return (listeners.get(type) ?? []).length;
    },
  };
}

describe("FirstPersonControls", () => {
  it("moves with keyboard input and removes listeners on dispose", () => {
    const camera = new PerspectiveCamera();
    const target = element();
    const controls = new FirstPersonControls(camera, target);
    controls.movementSpeed = 2;
    target.fire("keydown", { code: "KeyW" });
    controls.update(0.5);
    expect(camera.position.z).toBeLessThan(0);
    target.fire("keyup", { code: "KeyW" });
    controls.dispose();
    expect(target.count("keydown")).toBe(0);
  });

  it("accumulates pointer look and reports movement", () => {
    const camera = new PerspectiveCamera();
    const target = element();
    const controls = new FirstPersonControls(camera, target);
    target.fire("pointermove", { movementX: 20, movementY: -10 });
    expect(controls.update(0)).toBe(true);
    expect(camera.rotation.y).not.toBe(0);
  });
});

describe("TrackballControls", () => {
  it("orbits around target and clamps distance", () => {
    const camera = new PerspectiveCamera();
    camera.position.z = 5;
    const target = element();
    const controls = new TrackballControls(camera, target);
    controls.minDistance = 4;
    target.fire("pointerdown", {
      pointerId: 1,
      button: 0,
      clientX: 0,
      clientY: 0,
    });
    target.fire("pointermove", { pointerId: 1, clientX: 100, clientY: 0 });
    expect(controls.update()).toBe(true);
    expect(camera.position.distanceTo(controls.target)).toBeGreaterThanOrEqual(
      4,
    );
    target.fire("pointerup", { pointerId: 1 });
    controls.dispose();
    expect(target.count("pointerdown")).toBe(0);
  });
});
