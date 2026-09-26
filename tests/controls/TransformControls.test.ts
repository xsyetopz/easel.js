import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
  BasicMaterial,
  BoxGeometry,
  Group,
  Mesh,
  type Node,
  OrthographicCamera,
  PerspectiveCamera,
  Scene,
  type TransformAxis,
  TransformControls,
  type TransformMode,
  type TransformSpace,
  Vector3,
} from "@/index.js";
import { FakeElement, mouse, touch } from "../_helpers/control-dom.ts";
import {
  loadThreeControl,
  THREE,
  type ThreeCamera,
  type ThreeObject3D,
  type ThreeTransformControls,
} from "../_helpers/three-controls.ts";

const ThreeTransform =
  await loadThreeControl<
    new (
      camera: ThreeCamera,
      element?: EventTarget,
    ) => ThreeTransformControls
  >("TransformControls");

/**
 * Largest absolute difference allowed between EASEL and three.js results.
 * EASEL stores matrices in `Float32Array`; drag-plane hits several units from
 * the camera therefore differ from three.js near 1e-6.
 */
const EPSILON = 1e-4;

// three.js reads the global `document.pointerLockElement` on pointerdown.
const globals = globalThis as { document?: unknown };
const previousDocument = globals.document;
beforeAll(() => {
  globals.document = { pointerLockElement: null };
});
afterAll(() => {
  globals.document = previousDocument;
});

type Options = { orthographic?: boolean; up?: [number, number, number] };

function build(options: Options) {
  const easelCamera = options.orthographic
    ? new OrthographicCamera({
        left: -4,
        right: 4,
        top: 3,
        bottom: -3,
        near: 0.1,
        far: 100,
      })
    : new PerspectiveCamera({
        fov: 50,
        aspect: 800 / 600,
        near: 0.1,
        far: 100,
      });
  const threeCamera = options.orthographic
    ? new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 100)
    : new THREE.PerspectiveCamera(50, 800 / 600, 0.1, 100);
  const up = options.up ?? [0, 1, 0];
  for (const camera of [easelCamera, threeCamera]) {
    camera.up.set(up[0], up[1], up[2]);
    camera.position.set(5, 2.5, 5);
    // EASEL `Node.lookAt()` reads the prepared world matrix, so refresh it.
    camera.updateMatrixWorld();
    camera.lookAt(0.2, 0.1, -0.1);
  }

  const easelScene = new Scene();
  const easelParent = new Group();
  const easelBox = new Mesh(new BoxGeometry(1, 1, 1), new BasicMaterial());
  const threeScene = new THREE.Scene();
  const threeParent = new THREE.Group();
  const threeBox = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial(),
  );
  const pairs: Array<[Node, ThreeObject3D]> = [
    [easelParent, threeParent],
    [easelBox, threeBox],
  ];
  for (const [e, t] of pairs) {
    const isParent = e === easelParent;
    const p = isParent ? [0.3, -0.2, 0.1] : [0.4, 0.3, -0.5];
    const q = isParent ? [0.1, 0.2, -0.05, 0.97] : [-0.12, 0.31, 0.08, 0.94];
    const length = Math.hypot(q[0], q[1], q[2], q[3]);
    const s = isParent ? [1.2, 1.2, 1.2] : [1, 1.3, 0.8];
    e.position.set(p[0], p[1], p[2]);
    t.position.set(p[0], p[1], p[2]);
    e.quaternion.set(
      q[0] / length,
      q[1] / length,
      q[2] / length,
      q[3] / length,
    );
    t.quaternion.set(
      q[0] / length,
      q[1] / length,
      q[2] / length,
      q[3] / length,
    );
    e.scale.set(s[0], s[1], s[2]);
    t.scale.set(s[0], s[1], s[2]);
  }
  easelParent.add(easelBox);
  easelScene.add(easelParent);
  threeParent.add(threeBox);
  threeScene.add(threeParent);

  const easelDom = new FakeElement();
  const threeDom = new FakeElement();
  const easel = new TransformControls(easelCamera, easelDom);
  const three = new ThreeTransform(threeCamera, threeDom);
  easelScene.add(easel.helper);
  threeScene.add(three.getHelper());

  const events = { easel: [] as string[], three: [] as string[] };
  const types = [
    "change",
    "objectChange",
    "mouseDown",
    "mouseUp",
    "object-changed",
    "axis-changed",
    "mode-changed",
    "space-changed",
    "dragging-changed",
    "rotationAngle-changed",
    "translationSnap-changed",
  ];
  for (const type of types) {
    easel.addEventListener(type, (event) =>
      events.easel.push(describeEvent(type, event, easelBox)),
    );
    three.addEventListener(type, (event) =>
      events.three.push(describeEvent(type, event, threeBox)),
    );
  }

  const render = (): void => {
    easelScene.updateMatrixWorld(false, true, true);
    threeScene.updateMatrixWorld(true);
  };
  const fire = (type: string, fields: Record<string, unknown>): void => {
    easelDom.fire(type, fields);
    threeDom.fire(type, fields);
  };
  const screen = (offset: Vector3): [number, number] => {
    const world = new THREE.Vector3(
      easel.worldPosition.x + offset.x,
      easel.worldPosition.y + offset.y,
      easel.worldPosition.z + offset.z,
    );
    threeCamera.updateMatrixWorld();
    world.project(threeCamera);
    return [(world.x + 1) * 400, (1 - world.y) * 300];
  };
  return {
    easel,
    three,
    easelBox,
    threeBox,
    easelCamera,
    threeCamera,
    events,
    render,
    fire,
    screen,
  };
}

function describeEvent(
  type: string,
  event: Record<string, unknown>,
  box: unknown,
): string {
  if (type === "mouseDown" || type === "mouseUp")
    return `${type}:${String(event["mode"])}`;
  if (!type.endsWith("-changed")) return type;
  const value = event["value"];
  if (type === "object-changed") return `${type}:${value === box}`;
  if (type === "rotationAngle-changed") return type;
  return `${type}:${value === null ? "undefined" : String(value)}`;
}

type Rig = ReturnType<typeof build>;

function transformError(s: Rig): number {
  const e = s.easelBox;
  const t = s.threeBox;
  return Math.max(
    Math.abs(e.position.x - t.position.x),
    Math.abs(e.position.y - t.position.y),
    Math.abs(e.position.z - t.position.z),
    Math.abs(e.quaternion.x - t.quaternion.x),
    Math.abs(e.quaternion.y - t.quaternion.y),
    Math.abs(e.quaternion.z - t.quaternion.z),
    Math.abs(e.quaternion.w - t.quaternion.w),
    Math.abs(e.scale.x - t.scale.x),
    Math.abs(e.scale.y - t.scale.y),
    Math.abs(e.scale.z - t.scale.z),
  );
}

/** Handle offset from the object in gizmo units, before the screen-size scale. */
function handleOffset(
  s: Rig,
  mode: TransformMode,
  axis: TransformAxis,
  space: TransformSpace,
): Vector3 {
  const offsets: Record<string, [number, number, number]> =
    mode === "rotate"
      ? {
          X: [0, 0.3536, 0.3536],
          Y: [0.3536, 0, 0.3536],
          Z: [0.3536, 0.3536, 0],
          XYZE: [0, 0, 0],
        }
      : {
          X: [0.35, 0, 0],
          Y: [0, 0.35, 0],
          Z: [0, 0, 0.35],
          XY: [0.15, 0.15, 0],
          YZ: [0, 0.15, 0.15],
          XZ: [0.15, 0, 0.15],
          // Off-center so the uniform-scale ratio is well conditioned.
          XYZ: mode === "scale" ? [0.07, 0.07, 0] : [0, 0, 0],
        };
  const offset = new Vector3(...(offsets[axis] ?? [0, 0, 0]));
  const local = mode === "scale" || (space === "local" && axis !== "XYZE");
  if (local) offset.applyQuaternion(s.easel.worldQuaternion);
  if (axis === "E") {
    offset
      .set(s.easel.eye.x, s.easel.eye.y, s.easel.eye.z)
      .cross(new Vector3(0, 1, 0))
      .normalize()
      .multiplyScalar(0.75);
  }
  const camera = s.easelCamera;
  const factor =
    camera instanceof OrthographicCamera
      ? (camera.top - camera.bottom) / camera.zoom
      : s.easel.worldPosition.distanceTo(s.easel.cameraPosition) *
        Math.min(
          (1.9 * Math.tan((Math.PI * camera.fov) / 360)) / camera.zoom,
          7,
        );
  return offset.multiplyScalar((factor * s.easel.size) / 4);
}

function drag(
  s: Rig,
  mode: TransformMode,
  axis: TransformAxis,
  space: TransformSpace,
  renderBetween = true,
): number {
  let worst = 0;
  const [x, y] = s.screen(handleOffset(s, mode, axis, space));
  s.fire("pointermove", mouse(x, y, -1));
  // Handles overlap in some views; both sides must pick the same one.
  expect(s.easel.axis).toBeDefined();
  expect(s.easel.axis).toBe((s.three.axis ?? undefined) as TransformAxis);
  if (renderBetween) s.render();
  s.fire("pointerdown", mouse(x, y, 0));
  for (const [dx, dy] of [
    [25, -10],
    [60, 35],
    [-40, 70],
  ]) {
    s.fire("pointermove", mouse(x + dx, y + dy, -1));
    worst = Math.max(worst, transformError(s));
    expect(transformError(s)).toBeLessThan(EPSILON);
    s.render();
  }
  s.fire("pointerup", mouse(x - 40, y + 70, 0));
  s.render();
  return worst;
}

describe("TransformControls parity with three.js r186", () => {
  it("matches defaults and attach/detach events", () => {
    const s = build({});
    const e = s.easel;
    const t = s.three;
    expect(e.mode).toBe(t.mode as TransformMode);
    expect(e.space).toBe(t.space as TransformSpace);
    expect(e.size).toBe(t.size);
    expect(e.axis).toBeUndefined();
    expect(t.axis).toBeNull();
    expect(e.translationSnap).toBeUndefined();
    expect(t.translationSnap).toBeNull();
    expect(e.dragging).toBe(t.dragging);
    expect([e.showX, e.showY, e.showZ]).toEqual([t.showX, t.showY, t.showZ]);
    expect([e.minX, e.maxX, e.minY, e.maxY, e.minZ, e.maxZ]).toEqual([
      t.minX,
      t.maxX,
      t.minY,
      t.maxY,
      t.minZ,
      t.maxZ,
    ]);
    expect(e.helper.visible).toBe(false);
    e.attach(s.easelBox);
    t.attach(s.threeBox);
    expect(e.helper.visible).toBe(true);
    e.detach();
    t.detach();
    expect(e.helper.visible).toBe(false);
    expect(s.events.easel).toEqual(s.events.three);
    expect(s.events.easel).toEqual([
      "object-changed:true",
      "change",
      "object-changed:false",
      "change",
    ]);
  });

  const cases: Array<[TransformMode, TransformSpace, TransformAxis[]]> = [
    ["translate", "world", ["X", "Y", "Z", "XY", "YZ", "XZ", "XYZ"]],
    ["translate", "local", ["X", "Y", "Z", "XY", "YZ", "XZ", "XYZ"]],
    ["rotate", "world", ["X", "Y", "Z", "E", "XYZE"]],
    ["rotate", "local", ["X", "Y", "Z"]],
    ["scale", "world", ["X", "Y", "Z", "XY", "XYZ"]],
  ];
  for (const orthographic of [false, true]) {
    const camera = orthographic ? "orthographic" : "perspective";
    for (const [mode, space, axes] of cases) {
      for (const axis of axes) {
        it(`${mode} ${space} ${axis} (${camera})`, () => {
          const s = build({ orthographic });
          s.easel.mode = mode;
          s.three.mode = mode;
          s.easel.space = space;
          s.three.space = space;
          s.easel.attach(s.easelBox);
          s.three.attach(s.threeBox);
          s.render();
          drag(s, mode, axis, space);
          expect(s.events.easel).toEqual(s.events.three);
          expect(s.events.easel).toContain(`mouseDown:${mode}`);
          expect(s.events.easel).toContain("dragging-changed:true");
          expect(s.events.easel).toContain("objectChange");
          expect(s.easel.dragging).toBe(false);
          expect(s.easel.axis).toBeUndefined();
        });
      }
    }
  }

  it("snaps translation, rotation, and scale", () => {
    const s = build({});
    s.easel.attach(s.easelBox);
    s.three.attach(s.threeBox);
    s.easel.translationSnap = 0.25;
    s.three.translationSnap = 0.25;
    s.easel.rotationSnap = Math.PI / 12;
    s.three.rotationSnap = Math.PI / 12;
    s.easel.scaleSnap = 0.25;
    s.three.scaleSnap = 0.25;
    s.render();
    drag(s, "translate", "X", "world");
    for (const mode of ["rotate", "scale"] as const) {
      s.easel.mode = mode;
      s.three.mode = mode;
      s.render();
      drag(s, mode, "Z", "world");
    }
    s.easel.space = "local";
    s.three.space = "local";
    s.easel.mode = "translate";
    s.three.mode = "translate";
    s.render();
    drag(s, "translate", "XY", "local");
    expect(s.events.easel).toEqual(s.events.three);
  });

  it("clamps translation to min/max limits", () => {
    const s = build({});
    s.easel.attach(s.easelBox);
    s.three.attach(s.threeBox);
    for (const controls of [s.easel, s.three]) {
      controls.minX = 0.3;
      controls.maxX = 0.45;
      controls.minY = 0.2;
      controls.maxY = 0.35;
    }
    s.render();
    drag(s, "translate", "XYZ", "world");
    expect(s.easelBox.position.x).toBeLessThanOrEqual(0.45);
    expect(s.easelBox.position.y).toBeGreaterThanOrEqual(0.2);
  });

  it("works without a render between hover and pointerdown", () => {
    const s = build({});
    s.easel.attach(s.easelBox);
    s.three.attach(s.threeBox);
    s.render();
    drag(s, "translate", "Y", "world", false);
    expect(s.events.easel).toEqual(s.events.three);
  });

  it("keeps a camera up that is not +Y in step with three.js", () => {
    const s = build({ up: [0, 0, 1] });
    s.easel.mode = "rotate";
    s.three.mode = "rotate";
    s.easel.attach(s.easelBox);
    s.three.attach(s.threeBox);
    s.render();
    drag(s, "rotate", "Y", "world");
    expect(s.events.easel).toEqual(s.events.three);
  });

  it("keeps a constant screen size as the camera moves away", () => {
    const s = build({});
    s.easel.attach(s.easelBox);
    s.render();
    const near = s.screen(handleOffset(s, "translate", "X", "world"));
    s.easelCamera.position.multiplyScalar(3);
    s.threeCamera.position.set(15, 7.5, 15);
    s.render();
    const far = s.screen(handleOffset(s, "translate", "X", "world"));
    const origin = s.screen(new Vector3());
    s.easelCamera.position.multiplyScalar(1 / 3);
    s.threeCamera.position.set(5, 2.5, 5);
    s.render();
    const nearOrigin = s.screen(new Vector3());
    const nearLength = Math.hypot(
      near[0] - nearOrigin[0],
      near[1] - nearOrigin[1],
    );
    const farLength = Math.hypot(far[0] - origin[0], far[1] - origin[1]);
    // Off-axis perspective leaves a small residue; a world-sized gizmo would
    // shrink to a third.
    expect(farLength / nearLength).toBeGreaterThan(0.9);
    expect(farLength / nearLength).toBeLessThan(1.1);
  });

  it("resets to the drag-start transform only while dragging", () => {
    const s = build({});
    s.easel.attach(s.easelBox);
    s.three.attach(s.threeBox);
    s.render();
    const [x, y] = s.screen(handleOffset(s, "translate", "X", "world"));
    s.fire("pointermove", mouse(x, y, -1));
    s.fire("pointerdown", mouse(x, y, 0));
    s.fire("pointermove", mouse(x + 50, y, -1));
    s.easel.reset();
    s.three.reset();
    expect(transformError(s)).toBeLessThan(EPSILON);
    expect(s.easelBox.position.x).toBeCloseTo(0.4, 6);
    s.fire("pointerup", mouse(x + 50, y, 0));
    s.easel.reset();
    s.three.reset();
    expect(s.events.easel).toEqual(s.events.three);
  });

  it("ignores touch hover, other buttons, disabled input, and hidden axes", () => {
    const s = build({});
    s.easel.attach(s.easelBox);
    s.three.attach(s.threeBox);
    s.render();
    const [x, y] = s.screen(handleOffset(s, "translate", "X", "world"));
    s.fire("pointermove", touch(x, y, 3));
    expect(s.easel.axis).toBeUndefined();
    s.fire("pointerdown", mouse(x, y, 2));
    s.fire("pointerup", mouse(x, y, 2));
    s.easel.showX = false;
    s.three.showX = false;
    s.render();
    s.fire("pointermove", mouse(x, y, -1));
    expect(s.easel.axis).toBe(s.three.axis ?? undefined);
    s.easel.enabled = false;
    s.three.enabled = false;
    s.fire("pointerdown", mouse(x, y, 0));
    expect(s.easel.dragging).toBe(false);
    expect(s.events.easel).toEqual(s.events.three);
  });

  it("maps pointers through a viewport and disconnects on dispose", () => {
    const s = build({});
    s.easel.attach(s.easelBox);
    s.three.attach(s.threeBox);
    s.easel.viewport = { x: 100, y: 50, z: 600, w: 450 };
    (s.three as { viewport?: unknown }).viewport = new (
      THREE as unknown as {
        Vector4: new (x: number, y: number, z: number, w: number) => object;
      }
    ).Vector4(100, 50, 600, 450);
    s.render();
    for (const [x, y] of [
      [300, 200],
      [420, 260],
      [500, 330],
    ]) {
      s.fire("pointermove", mouse(x, y, -1));
      expect(s.easel.axis).toBe((s.three.axis ?? undefined) as TransformAxis);
    }
    const dom = s.easel.domElement as unknown as FakeElement;
    expect(dom.style["touchAction"]).toBe("none");
    s.easel.dispose();
    expect(dom.style["touchAction"]).toBe("");
  });

  it("exposes accessor and event parity for setColors, helper, and raycaster", () => {
    const s = build({});
    s.easel.setColors(0x112233, 0x445566, 0x778899, 0xaabbcc);
    expect(s.easel.raycaster).toBe(s.easel.raycaster);
    s.easel.mode = "scale";
    s.easel.mode = "scale";
    expect(s.events.easel).toEqual(["mode-changed:scale", "change"]);
  });
});
