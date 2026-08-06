import { describe, expect, it, vi } from "bun:test";
import { PerspectiveCamera } from "@/cameras/PerspectiveCamera.js";
import { FlyControls } from "@/controls/FlyControls.js";
import { PointerLockControls } from "@/controls/PointerLockControls.js";

type Listener = (event: Event & Record<string, unknown>) => void;
type Target = {
  clientWidth: number;
  clientHeight: number;
  style: Record<string, string>;
  pointerLockElement: unknown;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
  dispatchEvent: ReturnType<typeof vi.fn>;
  fire: (type: string, event?: Record<string, unknown>) => void;
  count: (type: string) => number;
};

function target(): Target {
  const listeners = new Map<string, Listener[]>();
  return {
    clientWidth: 800,
    clientHeight: 600,
    style: {},
    pointerLockElement: undefined as unknown,
    addEventListener(type: string, listener: EventListener): void {
      const entries = listeners.get(type) ?? [];
      listeners.set(type, [...entries, listener as Listener]);
    },
    removeEventListener(type: string, listener: EventListener): void {
      listeners.set(
        type,
        (listeners.get(type) ?? []).filter((entry) => entry !== listener),
      );
    },
    dispatchEvent: vi.fn(() => true),
    fire(type: string, event: Record<string, unknown> = {}): void {
      for (const listener of listeners.get(type) ?? [])
        listener({ type, ...event } as Event & Record<string, unknown>);
    },
    count(type: string): number {
      return (listeners.get(type) ?? []).length;
    },
  };
}

describe("FlyControls", () => {
  it("moves on pointer hold and disposes listeners", () => {
    const camera = new PerspectiveCamera();
    const dom = target();
    const controls = new FlyControls(camera, dom);
    controls.movementSpeed = 2;
    dom.fire("pointerdown", { button: 0 });
    expect(controls.update(0.5)).toBe(true);
    expect(camera.position.z).toBeLessThan(0);
    dom.fire("pointerup", { button: 0 });
    controls.dispose();
    expect(dom.count("pointerdown")).toBe(0);
  });
});

describe("PointerLockControls", () => {
  it("locks, turns from relative motion, and moves horizontally", () => {
    const camera = new PerspectiveCamera();
    const dom = target();
    const documentTarget = target();
    const controlsDom = {
      ...dom,
      ownerDocument: documentTarget,
      requestPointerLock(): void {
        documentTarget.pointerLockElement = controlsDom;
      },
    };
    const controls = new PointerLockControls(camera, controlsDom);
    controls.lock();
    documentTarget.fire("pointerlockchange");
    expect(controls.isLocked).toBe(true);
    documentTarget.fire("mousemove", { movementX: 24, movementY: -8 });
    expect(camera.rotation.y).not.toBe(0);
    controls.moveForward(1);
    expect(camera.position.z).toBeLessThan(0);
    controls.dispose();
    expect(controls.isLocked).toBe(false);
  });
});
