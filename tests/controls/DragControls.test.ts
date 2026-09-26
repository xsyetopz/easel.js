import { afterEach, describe, expect, it } from "bun:test";
import {
  BasicMaterial,
  BoxGeometry,
  DragControls,
  Group,
  Mesh,
  MOUSE,
  type Node,
  OrthographicCamera,
  PerspectiveCamera,
  Scene,
  TOUCH,
} from "@/index.js";
import { FakeElement, mouse, touch } from "../_helpers/control-dom.ts";
import {
  loadThreeControl,
  THREE,
  type ThreeCamera,
  type ThreeDragControls,
  type ThreeObject3D,
} from "../_helpers/three-controls.ts";

const ThreeDrag =
  await loadThreeControl<
    new (
      objects: ThreeObject3D[],
      camera: ThreeCamera,
      element?: EventTarget,
    ) => ThreeDragControls
  >("DragControls");

/**
 * Largest absolute difference allowed between EASEL and three.js results.
 * EASEL stores matrices in `Float32Array`, so world positions and inverse
 * parent matrices differ from three.js near 1e-7.
 */
const EPSILON = 1e-6;

type Side = {
  camera: PerspectiveCamera | OrthographicCamera | ThreeCamera;
  box: Node | ThreeObject3D;
  group: Node | ThreeObject3D;
  child: Node | ThreeObject3D;
  dom: FakeElement;
  events: string[];
};

function buildEasel(orthographic: boolean) {
  const camera = orthographic
    ? new OrthographicCamera({
        left: -8,
        right: 8,
        top: 6,
        bottom: -6,
        near: 0.1,
        far: 100,
      })
    : new PerspectiveCamera({
        fov: 50,
        aspect: 800 / 600,
        near: 0.1,
        far: 100,
      });
  camera.position.set(0, 0, 10);
  camera.updateMatrixWorld();
  const box = new Mesh(new BoxGeometry(1, 1, 1), new BasicMaterial());
  const group = new Group();
  group.position.set(3, 1, 0);
  const child = new Mesh(new BoxGeometry(1, 1, 1), new BasicMaterial());
  child.position.set(0, -1, 0);
  group.add(child);
  const scene = new Scene();
  scene.add(box, group);
  scene.updateMatrixWorld();
  return { camera, box, group, child };
}

function buildThree(orthographic: boolean) {
  const camera = orthographic
    ? new THREE.OrthographicCamera(-8, 8, 6, -6, 0.1, 100)
    : new THREE.PerspectiveCamera(50, 800 / 600, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.updateMatrixWorld();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial(),
  );
  const group = new THREE.Group();
  group.position.set(3, 1, 0);
  const child = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial(),
  );
  child.position.set(0, -1, 0);
  group.add(child);
  const scene = new THREE.Scene();
  scene.add(box, group);
  scene.updateMatrixWorld();
  return { camera, box, group, child };
}

const live: ThreeDragControls[] = [];

function pair(orthographic = false) {
  const e = buildEasel(orthographic);
  const t = buildThree(orthographic);
  const easelDom = new FakeElement();
  const threeDom = new FakeElement();
  const easel = new DragControls([e.box, e.group], e.camera, easelDom);
  const three = new ThreeDrag([t.box, t.group], t.camera, threeDom);
  live.push(three);
  const easelSide: Side = { ...e, dom: easelDom, events: [] };
  const threeSide: Side = { ...t, dom: threeDom, events: [] };
  for (const type of ["hoveron", "hoveroff", "dragstart", "drag", "dragend"]) {
    easel.addEventListener(type, (event) => {
      const object = (event as unknown as { object: Node }).object;
      easelSide.events.push(`${type}:${name(e, object)}`);
    });
    three.addEventListener(type, (event) => {
      const object = event["object"] as ThreeObject3D;
      threeSide.events.push(`${type}:${name(t, object)}`);
    });
  }
  const fire = (type: string, fields: Record<string, unknown>): void => {
    easelDom.fire(type, fields);
    threeDom.fire(type, fields);
  };
  return { easel, three, e: easelSide, t: threeSide, fire };
}

function name(
  scene: { box: unknown; group: unknown; child: unknown },
  object: unknown,
): string {
  if (object === scene.box) return "box";
  if (object === scene.group) return "group";
  if (object === scene.child) return "child";
  return "other";
}

type Transform = {
  position: { x: number; y: number; z: number };
  quaternion: { x: number; y: number; z: number; w: number };
};

function transformError(a: Transform, b: Transform): number {
  return Math.max(
    Math.abs(a.position.x - b.position.x),
    Math.abs(a.position.y - b.position.y),
    Math.abs(a.position.z - b.position.z),
    Math.abs(a.quaternion.x - b.quaternion.x),
    Math.abs(a.quaternion.y - b.quaternion.y),
    Math.abs(a.quaternion.z - b.quaternion.z),
    Math.abs(a.quaternion.w - b.quaternion.w),
  );
}

function sceneError(s: ReturnType<typeof pair>): number {
  return Math.max(
    transformError(s.e.box as Transform, s.t.box as Transform),
    transformError(s.e.group as Transform, s.t.group as Transform),
    transformError(s.e.child as Transform, s.t.child as Transform),
  );
}

function updateWorld(s: ReturnType<typeof pair>): void {
  for (const side of [s.e, s.t]) {
    (side.box as { updateMatrixWorld(): void }).updateMatrixWorld();
    (side.group as { updateMatrixWorld(): void }).updateMatrixWorld();
  }
}

// three.js keeps the hovered object in module scope; park the pointer on
// empty space so one test's hover state cannot leak into the next.
afterEach(() => {
  for (const controls of live.splice(0)) {
    controls.enabled = true;
    const dom = new FakeElement();
    controls.connect(dom);
    dom.fire("pointermove", mouse(2, 2));
    dom.fire("pointerup", mouse(2, 2));
    controls.dispose();
  }
});

describe("DragControls parity with three.js r186", () => {
  it("matches defaults", () => {
    const s = pair();
    expect(s.easel.recursive).toBe(s.three.recursive);
    expect(s.easel.transformGroup).toBe(s.three.transformGroup);
    expect(s.easel.rotateSpeed).toBe(s.three.rotateSpeed);
    expect(s.easel.enabled).toBe(s.three.enabled);
    expect(s.easel.mouseButtons).toEqual({
      LEFT: MOUSE.PAN,
      MIDDLE: MOUSE.PAN,
      RIGHT: MOUSE.ROTATE,
    });
    expect(s.three.mouseButtons).toEqual({ LEFT: 2, MIDDLE: 2, RIGHT: 0 });
    expect(s.easel.touches).toEqual({ ONE: TOUCH.PAN });
    expect(s.three.touches).toEqual({ ONE: 1 });
    expect(s.e.dom.style["touchAction"]).toBe("none");
  });

  for (const orthographic of [false, true]) {
    const label = orthographic ? "orthographic" : "perspective";

    it(`hovers and pans with left and middle buttons (${label})`, () => {
      const s = pair(orthographic);
      s.fire("pointermove", mouse(20, 20));
      s.fire("pointermove", mouse(400, 300));
      s.fire("pointermove", mouse(410, 305));
      expect(s.e.dom.style["cursor"]).toBe(s.t.dom.style["cursor"]);
      s.fire("pointerdown", mouse(410, 305, 0));
      expect(s.e.dom.style["cursor"]).toBe("move");
      for (const [x, y] of [
        [450, 280],
        [520, 200],
        [300, 420],
      ]) {
        s.fire("pointermove", mouse(x, y, 0));
        expect(sceneError(s)).toBeLessThan(EPSILON);
      }
      s.fire("pointerup", mouse(300, 420, 0));
      updateWorld(s);
      s.fire("pointerdown", mouse(300, 420, 1));
      s.fire("pointermove", mouse(260, 400, 1));
      s.fire("pointerleave", mouse(260, 400, 1));
      expect(sceneError(s)).toBeLessThan(EPSILON);
      expect(s.e.events).toEqual(s.t.events);
      expect(s.e.events).toContain("hoveron:box");
      expect(s.e.events).toContain("dragend:box");
      expect(s.e.dom.style["cursor"]).toBe(s.t.dom.style["cursor"]);
    });

    it(`rotates with the right button and pans a group child (${label})`, () => {
      const s = pair(orthographic);
      s.fire("pointerdown", mouse(400, 300, 2));
      s.fire("pointermove", mouse(460, 250, 2));
      s.fire("pointermove", mouse(380, 330, 2));
      s.fire("pointerup", mouse(380, 330, 2));
      expect(sceneError(s)).toBeLessThan(EPSILON);
      const childX = orthographic ? 550 : 593;
      s.fire("pointerdown", mouse(childX, 300, 0));
      s.fire("pointermove", mouse(childX + 30, 340, 0));
      s.fire("pointerup", mouse(childX + 30, 340, 0));
      expect(sceneError(s)).toBeLessThan(EPSILON);
      expect(s.e.events).toEqual(s.t.events);
      expect(s.e.events).toContain("dragstart:child");
    });
  }

  it("moves the outermost group when transformGroup is set", () => {
    const s = pair();
    s.easel.transformGroup = true;
    s.three.transformGroup = true;
    s.fire("pointerdown", mouse(593, 300, 0));
    s.fire("pointermove", mouse(560, 260, 0));
    s.fire("pointerup", mouse(560, 260, 0));
    expect(sceneError(s)).toBeLessThan(EPSILON);
    expect(s.e.events).toEqual(s.t.events);
    expect(s.e.events).toEqual([
      "dragstart:group",
      "drag:group",
      "dragend:group",
    ]);
  });

  it("skips descendants when recursive is false", () => {
    const s = pair();
    s.easel.recursive = false;
    s.three.recursive = false;
    s.fire("pointerdown", mouse(593, 300, 0));
    s.fire("pointermove", mouse(560, 260, 0));
    s.fire("pointerup", mouse(560, 260, 0));
    expect(s.e.events).toEqual(s.t.events);
    expect(s.e.events).toEqual([]);
  });

  it("pans with one touch without hover events, and rotates when remapped", () => {
    const s = pair();
    s.fire("pointermove", touch(400, 300, 5));
    s.fire("pointerdown", touch(400, 300, 5));
    s.fire("pointermove", touch(430, 280, 5));
    s.fire("pointerup", touch(430, 280, 5));
    updateWorld(s);
    s.easel.touches.ONE = TOUCH.ROTATE;
    s.three.touches.ONE = 0;
    s.easel.rotateSpeed = 2;
    s.three.rotateSpeed = 2;
    s.fire("pointerdown", touch(430, 280, 6));
    s.fire("pointermove", touch(470, 260, 6));
    s.fire("pointerup", touch(470, 260, 6));
    expect(sceneError(s)).toBeLessThan(EPSILON);
    expect(s.e.events).toEqual(s.t.events);
    expect(s.e.events).toEqual([
      "dragstart:box",
      "drag:box",
      "dragend:box",
      "dragstart:box",
      "drag:box",
      "dragend:box",
    ]);
  });

  it("ignores unmapped buttons and disabled input", () => {
    const s = pair();
    s.easel.mouseButtons.LEFT = undefined;
    s.three.mouseButtons.LEFT = null;
    s.fire("pointerdown", mouse(400, 300, 0));
    s.fire("pointermove", mouse(430, 280, 0));
    s.fire("pointerup", mouse(430, 280, 0));
    s.easel.enabled = false;
    s.three.enabled = false;
    s.fire("pointerdown", mouse(400, 300, 1));
    s.fire("pointermove", mouse(430, 280, 1));
    const menu = s.e.dom.fire("contextmenu");
    expect(menu.defaultPrevented).toBe(false);
    expect(sceneError(s)).toBeLessThan(EPSILON);
    expect(s.e.events).toEqual(s.t.events);
    // three.js selects on every pointerdown hit, so an unmapped button still
    // ends with `dragend` although it never dispatched `dragstart`.
    expect(s.e.events).toEqual(["dragend:box"]);
  });

  it("uses the objects array by reference and restores the element on dispose", () => {
    const s = pair();
    const objects = s.easel.objects;
    objects.length = 0;
    s.fire("pointerdown", mouse(400, 300, 0));
    expect(s.e.events).toEqual([]);
    expect(s.e.dom.fire("contextmenu").defaultPrevented).toBe(true);
    s.easel.dispose();
    expect(s.e.dom.style["touchAction"]).toBe("");
    expect(s.e.dom.style["cursor"]).toBe("");
    expect(s.e.dom.fire("contextmenu").defaultPrevented).toBe(false);
  });

  it("constructs without an element and connects later", () => {
    const camera = new PerspectiveCamera();
    const controls = new DragControls([], camera);
    expect(controls.domElement).toBeUndefined();
    const dom = new FakeElement();
    controls.connect(dom);
    expect(dom.style["touchAction"]).toBe("none");
  });
});
