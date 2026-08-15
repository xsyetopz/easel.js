import { describe, expect, it, vi } from "bun:test";
import {
  BasicMaterial,
  BoxGeometry,
  LambertMaterial,
  Layer,
  type LineLoop,
  LineMaterial,
  Mesh,
  PerspectiveCamera,
  TransformControls,
  Vector3,
} from "@/index.js";

type Listener = (event: Event & Record<string, unknown>) => void;

function element(rect = { left: 0, top: 0, width: 800, height: 600 }) {
  const listeners = new Map<string, Listener[]>();
  return {
    clientWidth: rect.width,
    clientHeight: rect.height,
    tabIndex: -1,
    style: {} as CSSStyleDeclaration,
    focus: vi.fn(),
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
    getBoundingClientRect: () => rect,
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
  camera.updateViewMatrix(false, true, true);
  const mesh = new Mesh(new BoxGeometry(1, 1, 1), new LambertMaterial());
  mesh.updateMatrixWorld(false, true);
  return { camera, mesh };
}

function screenPoint(
  camera: PerspectiveCamera,
  point: Vector3,
  rect = { left: 0, top: 0, width: 800, height: 600 },
) {
  const projected = point.clone().project(camera);
  return {
    clientX: rect.left + (projected.x + 1) * 0.5 * rect.width,
    clientY: rect.top + (1 - projected.y) * 0.5 * rect.height,
  };
}

function pointerEvent(
  point: { clientX: number; clientY: number },
  pointerId: number,
) {
  return { pointerId, button: 0, ...point };
}

describe("TransformControls", () => {
  it("builds a visible CPU gizmo and picks an axis handle", () => {
    const { camera, mesh } = scene();
    const target = element();
    const controls = new TransformControls(camera, target).attach(mesh);
    expect(controls.helper.visible).toBe(true);
    expect(controls.helper.children.length).toBe(12);
    let overlayMaterials = 0;
    controls.helper.traverse((node) => {
      const material = (node as Mesh).material;
      if (!material) return;
      overlayMaterials++;
      expect(material.layer).toBe(Layer.OVERLAY);
      expect(material.depthTest).toBe(false);
      expect(material.depthWrite).toBe(false);
    });
    expect(overlayMaterials).toBeGreaterThan(0);
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

  it("selects offset arrow and plane handles before dragging", () => {
    const rect = { left: 100, top: 50, width: 800, height: 600 };
    const { camera, mesh } = scene();
    const target = element(rect);
    const controls = new TransformControls(camera, target).attach(mesh);
    const arrow = controls.helper.getObjectByName("TransformControls-X");
    const arrowMaterial = (arrow?.children[1] as Mesh | undefined)?.material;
    if (!(arrowMaterial instanceof BasicMaterial))
      throw new Error("missing X arrow material");

    const arrowPoint = screenPoint(camera, new Vector3(1.35, 0, 0), rect);
    target.fire("pointermove", pointerEvent(arrowPoint, 10));
    expect(arrowMaterial.color.hex).toBe(0xffff00);

    target.fire(
      "pointerdown",
      pointerEvent({ clientX: rect.left + 20, clientY: rect.top + 20 }, 11),
    );
    expect(target.setPointerCapture).not.toHaveBeenCalled();
    expect(controls.dragging).toBe(false);

    target.fire("pointerdown", pointerEvent(arrowPoint, 12));
    target.fire(
      "pointermove",
      pointerEvent(
        { clientX: arrowPoint.clientX + 50, clientY: arrowPoint.clientY },
        12,
      ),
    );
    expect(mesh.position.x).toBeGreaterThan(0);
    expect(mesh.position.y).toBeCloseTo(0, 8);
    target.fire("pointerup", pointerEvent(arrowPoint, 12));

    mesh.position.set(0, 0, 0);
    mesh.updateMatrixWorld(false, true);
    controls.update();
    const plane = controls.helper.getObjectByName("TransformControls-XY") as
      | Mesh
      | undefined;
    if (!(plane?.material instanceof BasicMaterial))
      throw new Error("missing XY plane material");
    const planePoint = screenPoint(camera, new Vector3(0.42, 0.42, 0), rect);
    target.fire("pointermove", pointerEvent(planePoint, 13));
    expect(plane.material.color.hex).toBe(0xffff00);
    target.fire("pointerdown", pointerEvent(planePoint, 13));
    target.fire(
      "pointermove",
      pointerEvent(
        { clientX: planePoint.clientX + 40, clientY: planePoint.clientY - 40 },
        13,
      ),
    );
    expect(mesh.position.x).toBeGreaterThan(0);
    expect(mesh.position.y).toBeGreaterThan(0);
    target.fire("pointerup", pointerEvent(planePoint, 13));
    controls.dispose();
  });

  it("picks every rotation ring and applies its single-axis drag", () => {
    const { camera, mesh } = scene();
    const target = element();
    const controls = new TransformControls(camera, target)
      .attach(mesh)
      .setMode("rotate");
    const cases = [
      { axis: "X", start: new Vector3(0, 1.05, 0), delta: [8, 0] },
      { axis: "Y", start: new Vector3(1.05, 0, 0), delta: [0, 8] },
      {
        axis: "Z",
        start: new Vector3(0.742462, 0.742462, 0),
        delta: [8, 0],
      },
    ] as const;

    for (const [index, { axis, start, delta }] of cases.entries()) {
      mesh.quaternion.identity();
      mesh.rotation.set(0, 0, 0);
      mesh.updateMatrixWorld(false, true);
      controls.update();
      const startPoint = screenPoint(camera, start);
      const ring = controls.helper.getObjectByName(
        `TransformControls-R${axis}`,
      ) as LineLoop | undefined;
      if (!(ring?.material instanceof LineMaterial))
        throw new Error(`missing ${axis} ring material`);
      target.fire("pointermove", pointerEvent(startPoint, index + 20));
      expect(ring.material.color.hex).toBe(0xffff00);

      target.fire("pointerdown", pointerEvent(startPoint, index + 30));
      target.fire("pointerup", pointerEvent(startPoint, index + 30));
      expect(mesh.rotation.x).toBeCloseTo(0, 8);
      expect(mesh.rotation.y).toBeCloseTo(0, 8);
      expect(mesh.rotation.z).toBeCloseTo(0, 8);

      const endPoint = {
        clientX: startPoint.clientX + delta[0],
        clientY: startPoint.clientY + delta[1],
      };
      target.fire("pointerdown", pointerEvent(startPoint, index + 40));
      target.fire("pointermove", pointerEvent(endPoint, index + 40));
      const values = {
        X: mesh.rotation.x,
        Y: mesh.rotation.y,
        Z: mesh.rotation.z,
      };
      expect(Math.abs(values[axis])).toBeGreaterThan(0.01);
      for (const other of ["X", "Y", "Z"] as const)
        if (other !== axis) expect(Math.abs(values[other])).toBeLessThan(1e-8);
      target.fire("pointerup", pointerEvent(endPoint, index + 40));
    }
    controls.dispose();
  });

  it("picks each scale handle and changes only its axis", () => {
    for (const [index, axis] of (["X", "Y", "Z"] as const).entries()) {
      const { camera, mesh } = scene();
      if (axis === "Z") {
        camera.position.set(3, 2, 6);
        camera.updateMatrixWorld(false, true, true);
        camera.lookAt(new Vector3());
        camera.updateViewMatrix(false, true, true);
      }
      const target = element();
      const controls = new TransformControls(camera, target)
        .attach(mesh)
        .setMode("scale");
      const worldPoint =
        axis === "X"
          ? new Vector3(1.12, 0, 0)
          : axis === "Y"
            ? new Vector3(0, 1.12, 0)
            : new Vector3(0, 0, 1.12);
      const originPoint = screenPoint(camera, new Vector3());
      const startPoint = screenPoint(camera, worldPoint);
      const screenX = startPoint.clientX - originPoint.clientX;
      const screenY = startPoint.clientY - originPoint.clientY;
      const screenLength = Math.hypot(screenX, screenY);
      const endPoint = {
        clientX: startPoint.clientX + (screenX / screenLength) * 30,
        clientY: startPoint.clientY + (screenY / screenLength) * 30,
      };
      target.fire("pointermove", pointerEvent(startPoint, index + 50));
      const handle = controls.helper.getObjectByName(
        `TransformControls-S${axis}`,
      ) as Mesh | undefined;
      if (!(handle?.material instanceof BasicMaterial))
        throw new Error(`missing ${axis} scale material`);
      expect(handle.material.color.hex).toBe(0xffff00);
      target.fire("pointerdown", pointerEvent(startPoint, index + 60));
      target.fire("pointermove", pointerEvent(endPoint, index + 60));
      const values = { X: mesh.scale.x, Y: mesh.scale.y, Z: mesh.scale.z };
      expect(Math.abs(values[axis] - 1)).toBeGreaterThan(0.01);
      for (const other of ["X", "Y", "Z"] as const)
        if (other !== axis) expect(values[other]).toBeCloseTo(1, 8);
      target.fire("pointerup", pointerEvent(endPoint, index + 60));
      controls.dispose();
    }
  });
});
