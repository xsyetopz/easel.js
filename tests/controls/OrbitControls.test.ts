import { afterAll, describe, expect, it } from "bun:test";
import { PerspectiveCamera } from "@/cameras/PerspectiveCamera.js";
import { OrbitControls } from "@/controls/OrbitControls.js";
import { MOUSE } from "@/core/Constants.js";
import {
  HEIGHT,
  type OrbitParityCamera,
  type OrbitParityOptions,
  OrbitParityRig,
  PARITY_EPSILON,
  WIDTH,
} from "../_helpers/orbit-parity.ts";

const LEFT = 0;
const MIDDLE = 1;
const RIGHT = 2;

const perspective: OrbitParityCamera = {
  kind: "perspective",
  position: [3, 2, 5],
};
const orthographic: OrbitParityCamera = {
  kind: "orthographic",
  position: [3, 2, 5],
};
const cameras = [perspective, orthographic];

const maxErrors = new Map<string, number>();

afterAll(() => {
  if (process.env["CONTROLS_PARITY_REPORT"])
    console.table(Object.fromEntries(maxErrors));
});

function parity(
  name: string,
  camera: OrbitParityCamera,
  run: (rig: OrbitParityRig) => void,
  options: OrbitParityOptions = {},
): void {
  it(`${name} (${camera.kind}) matches three.js`, () => {
    const rig = new OrbitParityRig("orbit", camera, options);
    run(rig);
    rig.dispose();
    maxErrors.set(`orbit ${name} ${camera.kind}`, rig.maxError);
    expect(rig.maxError).toBeLessThan(PARITY_EPSILON);
  });
}

describe("OrbitControls parity with three.js r186", () => {
  for (const camera of cameras) {
    parity("left drag rotates", camera, (rig) => {
      rig.drag(LEFT, [400, 300], [470, 250]).drag(LEFT, [200, 100], [150, 380]);
    });
    parity("middle drag dollies", camera, (rig) => {
      rig
        .drag(MIDDLE, [400, 300], [400, 380])
        .drag(MIDDLE, [400, 300], [400, 150]);
    });
    parity("right drag pans", camera, (rig) => {
      rig.drag(RIGHT, [400, 300], [460, 340]).drag(RIGHT, [100, 50], [20, 90]);
    });
    parity(
      "right drag pans in the up-orthogonal plane",
      camera,
      (rig) => rig.drag(RIGHT, [400, 300], [460, 340]),
      { screenSpacePanning: false },
    );
    parity(
      "modifier swaps left rotate to pan and right pan to rotate",
      camera,
      (rig) => {
        rig.drag(LEFT, [400, 300], [460, 340], 3, { shiftKey: true });
        rig.drag(RIGHT, [400, 300], [460, 340], 3, { ctrlKey: true });
        rig.drag(LEFT, [400, 300], [300, 200], 3, { metaKey: true });
      },
    );
    parity("wheel dollies in and out", camera, (rig) => {
      rig
        .wheel(-120)
        .wheel(-120)
        .wheel(300)
        .wheel(3, 400, 300, { deltaMode: 1 });
      rig
        .wheel(-1, 400, 300, { deltaMode: 2 })
        .wheel(-4, 400, 300, { ctrlKey: true });
    });
    parity(
      "damping decays pending rotation and pan",
      camera,
      (rig) => {
        rig.drag(LEFT, [400, 300], [480, 260]).update(30);
        rig.drag(RIGHT, [400, 300], [300, 350]).update(30);
        rig.wheel(-200).update(5);
      },
      { enableDamping: true, dampingFactor: 0.1 },
    );
    parity(
      "zoomToCursor with screen-space panning",
      camera,
      (rig) => {
        rig.wheel(-150, 120, 90).wheel(-150, 700, 500).wheel(200, 300, 400);
        rig.drag(MIDDLE, [250, 200], [250, 260]);
      },
      { zoomToCursor: true },
    );
    parity(
      "zoomToCursor with plane panning",
      camera,
      (rig) =>
        rig.wheel(-150, 120, 90).wheel(-150, 700, 500).wheel(200, 300, 400),
      { zoomToCursor: true, screenSpacePanning: false },
    );
    parity(
      "distance, zoom, polar, and azimuth limits",
      camera,
      (rig) => {
        rig
          .drag(LEFT, [400, 300], [700, 580])
          .drag(LEFT, [400, 300], [100, 20]);
        for (let i = 0; i < 8; i++) rig.wheel(-400);
        for (let i = 0; i < 8; i++) rig.wheel(400);
      },
      {
        minDistance: 4,
        maxDistance: 8,
        minZoom: 0.5,
        maxZoom: 2,
        minPolarAngle: 0.4,
        maxPolarAngle: 1.8,
        minAzimuthAngle: -0.3,
        maxAzimuthAngle: 0.9,
      },
    );
    parity(
      "wrapped azimuth limits",
      camera,
      (rig) =>
        rig
          .drag(LEFT, [400, 300], [900, 300])
          .drag(LEFT, [400, 300], [-300, 300]),
      { minAzimuthAngle: 2.5, maxAzimuthAngle: -2.5 + 2 * Math.PI },
    );
    parity(
      "target radius limits around the cursor",
      camera,
      (rig) =>
        rig
          .drag(RIGHT, [400, 300], [100, 50])
          .drag(RIGHT, [400, 300], [700, 550]),
      { minTargetRadius: 0.25, maxTargetRadius: 0.5 },
    );
    parity("one-finger touch rotates", camera, (rig) => {
      rig.touchDown(7, 400, 300).touchMove(7, 430, 280).touchMove(7, 470, 250);
      rig.touchUp(7, 470, 250);
    });
    parity("two-finger pinch dollies and pans", camera, (rig) => {
      rig.touchDown(1, 300, 300).touchDown(2, 500, 300);
      rig.touchMove(1, 280, 310).touchMove(2, 540, 310);
      rig.touchMove(1, 240, 330).touchMove(2, 560, 330);
      rig.touchUp(2, 560, 330).touchMove(1, 250, 300).touchUp(1, 250, 300);
    });
    parity(
      "two-finger pinch zooms to cursor",
      camera,
      (rig) => {
        rig.touchDown(1, 200, 200).touchDown(2, 300, 250);
        rig.touchMove(2, 360, 280).touchMove(1, 150, 180);
        rig.touchUp(1, 150, 180).touchUp(2, 360, 280);
      },
      { zoomToCursor: true },
    );
    parity("arrow keys pan and, with a modifier, rotate", camera, (rig) => {
      rig.easel.listenToKeyEvents(rig.keyTarget);
      rig.three.listenToKeyEvents(rig.keyTarget);
      rig.key("ArrowUp").key("ArrowDown").key("ArrowLeft").key("ArrowLeft");
      rig
        .key("ArrowRight", { shiftKey: true })
        .key("ArrowUp", { ctrlKey: true });
      rig.key("ArrowDown", { metaKey: true }).key("KeyW");
    });
    parity(
      "auto-rotation per frame and per second",
      camera,
      (rig) => rig.update(10).update(10, 0.25),
      { autoRotate: true, autoRotateSpeed: 5 },
    );
    parity("saveState and reset", camera, (rig) => {
      rig
        .drag(LEFT, [400, 300], [470, 250])
        .wheel(-300)
        .drag(RIGHT, [400, 300], [420, 330]);
      rig.easel.saveState();
      rig.three.saveState();
      rig.drag(LEFT, [400, 300], [200, 200]).wheel(500);
      rig.easel.reset();
      rig.three.reset();
      rig.compare("reset");
    });
    parity(
      "disabled rotate, zoom, and pan ignore input",
      camera,
      (rig) => {
        rig
          .drag(LEFT, [400, 300], [470, 250])
          .drag(MIDDLE, [400, 300], [400, 360]);
        rig.drag(RIGHT, [400, 300], [460, 340]).wheel(-200);
      },
      { enableRotate: false, enableZoom: false, enablePan: false },
    );
    parity(
      "enabled = false ignores pointer, wheel, and key input",
      camera,
      (rig) => {
        rig.easel.listenToKeyEvents(rig.keyTarget);
        rig.three.listenToKeyEvents(rig.keyTarget);
        const setEnabled = (enabled: boolean) => {
          rig.easel.enabled = enabled;
          rig.three.enabled = enabled;
        };
        setEnabled(false);
        rig.drag(LEFT, [400, 300], [470, 250]).wheel(-200).key("ArrowUp");
        setEnabled(true);
        rig.down(LEFT, 400, 300).move(420, 290);
        setEnabled(false);
        rig.move(480, 250).wheel(-200);
        setEnabled(true);
        rig.move(500, 240).up(500, 240).wheel(-200);
        setEnabled(false);
        rig.update(3);
      },
    );
    parity(
      "Control-key tracking separates wheel pinch from ctrl+wheel",
      camera,
      (rig) => {
        rig.wheel(-3, 400, 300, { ctrlKey: true });
        rig
          .rootKey("keydown", "Control")
          .wheel(-3, 400, 300, { ctrlKey: true });
        rig.rootKey("keyup", "Control").wheel(-3, 400, 300, { ctrlKey: true });
      },
    );
    parity(
      "camera.up along +Z sets the orbit axis",
      {
        ...camera,
        up: [0, 0, 1],
        position: [4, -3, 2],
      },
      (rig) => {
        rig
          .drag(LEFT, [400, 300], [480, 250])
          .drag(RIGHT, [400, 300], [450, 330]);
        rig.configure({ screenSpacePanning: false });
        rig.drag(RIGHT, [400, 300], [350, 250]).wheel(-150, 100, 100);
      },
    );
  }

  parity(
    "a tilted camera.up with damping and a non-origin target",
    {
      kind: "perspective",
      position: [2, 5, 3],
      up: [0.3, 0.8, 0.2],
      target: [1, -1, 0.5],
    },
    (rig) => {
      rig.drag(LEFT, [400, 300], [300, 420]).update(20);
      rig.drag(RIGHT, [400, 300], [500, 250]).update(20);
    },
    { enableDamping: true, screenSpacePanning: false },
  );
});

function element() {
  const document = new EventTarget();
  const target = Object.assign(new EventTarget(), {
    clientWidth: WIDTH,
    clientHeight: HEIGHT,
    style: { touchAction: "", cursor: "" },
    ownerDocument: document,
    getRootNode: () => document,
  });
  return target;
}

describe("OrbitControls", () => {
  it("defaults to r186 mouse, touch, and key mappings", () => {
    const controls = new OrbitControls(new PerspectiveCamera());
    expect(controls.mouseButtons).toEqual({
      LEFT: MOUSE.ROTATE,
      MIDDLE: MOUSE.DOLLY,
      RIGHT: MOUSE.PAN,
    });
    expect(controls.touches).toEqual({ ONE: 0, TWO: 2 });
    expect(controls.keys).toEqual({
      LEFT: "ArrowLeft",
      UP: "ArrowUp",
      RIGHT: "ArrowRight",
      BOTTOM: "ArrowDown",
    });
    expect(controls.state).toBe(-1);
    expect(controls.minZoom).toBe(0);
    expect(controls.domElement).toBeUndefined();
  });

  it("exposes distance and angles as accessors", () => {
    const camera = new PerspectiveCamera();
    camera.position.set(0, 3, 4);
    const controls = new OrbitControls(camera);
    expect(controls.distance).toBeCloseTo(5, 12);
    expect(controls.polarAngle).toBeCloseTo(Math.acos(3 / 5), 12);
    expect(controls.azimuthalAngle).toBeCloseTo(0, 12);
  });

  it("toggles touch-action and the grab cursor, then restores them", () => {
    const target = element();
    const controls = new OrbitControls(new PerspectiveCamera(), target);
    expect(target.style.touchAction).toBe("none");
    controls.cursorStyle = "grab";
    expect(target.style.cursor).toBe("grab");
    target.dispatchEvent(
      Object.assign(new Event("pointerdown"), {
        pointerId: 1,
        pointerType: "mouse",
        button: 0,
        clientX: 1,
        clientY: 1,
      }),
    );
    expect(target.style.cursor).toBe("grabbing");
    target.ownerDocument.dispatchEvent(
      Object.assign(new Event("pointerup"), { pointerId: 1 }),
    );
    expect(target.style.cursor).toBe("grab");
    controls.dispose();
    expect(target.style.touchAction).toBe("");
    expect(target.style.cursor).toBe("auto");
  });

  it("stops handling pointer, wheel, and key input after dispose", () => {
    const target = element();
    const keys = new EventTarget();
    const camera = new PerspectiveCamera();
    camera.position.set(0, 0, 5);
    const controls = new OrbitControls(camera, target);
    controls.listenToKeyEvents(keys);
    controls.dispose();
    let changes = 0;
    controls.addEventListener("change", () => changes++);

    target.dispatchEvent(
      Object.assign(new Event("wheel"), {
        deltaY: -100,
        clientX: 0,
        clientY: 0,
      }),
    );
    keys.dispatchEvent(
      Object.assign(new Event("keydown"), { code: "ArrowUp" }),
    );
    target.dispatchEvent(
      Object.assign(new Event("pointerdown"), {
        pointerId: 1,
        pointerType: "mouse",
        button: 0,
        clientX: 0,
        clientY: 0,
      }),
    );
    target.ownerDocument.dispatchEvent(
      Object.assign(new Event("pointermove"), {
        pointerId: 1,
        pointerType: "mouse",
        clientX: 50,
        clientY: 50,
      }),
    );

    expect(changes).toBe(0);
    expect(camera.position.z).toBeCloseTo(5, 12);
  });

  it("works with an element that only implements EventTarget", () => {
    const target = new EventTarget();
    const controls = new OrbitControls(new PerspectiveCamera(), target);
    expect(() => controls.dispose()).not.toThrow();
  });
});
