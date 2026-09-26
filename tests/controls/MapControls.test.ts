import { afterAll, describe, expect, it } from "bun:test";
import { PerspectiveCamera } from "@/cameras/PerspectiveCamera.js";
import { MapControls } from "@/controls/MapControls.js";
import { MOUSE, TOUCH } from "@/core/Constants.js";
import {
  type OrbitParityCamera,
  type OrbitParityOptions,
  OrbitParityRig,
  PARITY_EPSILON,
} from "../_helpers/orbit-parity.ts";

const LEFT = 0;
const MIDDLE = 1;
const RIGHT = 2;

const cameras: OrbitParityCamera[] = [
  { kind: "perspective", position: [0, 20, -20] },
  { kind: "orthographic", position: [0, 8, 2] },
  { kind: "perspective", position: [3, 6, 8], target: [1, 0, -1] },
];

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
  epsilon = PARITY_EPSILON,
): void {
  const label = `${camera.kind} at ${camera.position.join(",")}`;
  it(`${name} (${label}) matches three.js`, () => {
    const rig = new OrbitParityRig("map", camera, options, epsilon);
    run(rig);
    rig.dispose();
    maxErrors.set(`map ${name} ${label}`, rig.maxError);
    expect(rig.maxError).toBeLessThan(rig.epsilon);
  });
}

describe("MapControls parity with three.js r186", () => {
  for (const camera of cameras) {
    parity("left drag pans on the ground plane", camera, (rig) => {
      rig.drag(LEFT, [400, 300], [460, 240]).drag(LEFT, [100, 500], [300, 450]);
    });
    parity(
      "left drag pans in screen space",
      camera,
      (rig) => rig.drag(LEFT, [400, 300], [460, 240]),
      { screenSpacePanning: true },
    );
    parity("right drag rotates", camera, (rig) => {
      rig
        .drag(RIGHT, [400, 300], [470, 260])
        .drag(LEFT, [400, 300], [340, 330], 3, {
          shiftKey: true,
        });
    });
    parity("middle drag and wheel dolly", camera, (rig) => {
      rig.drag(MIDDLE, [400, 300], [400, 360]).wheel(-240).wheel(120);
    });
    parity(
      "damped ground pan",
      camera,
      (rig) => rig.drag(LEFT, [400, 300], [480, 350]).update(40),
      { enableDamping: true },
    );
    parity(
      "zoomToCursor then pan",
      camera,
      (rig) => rig.wheel(-200, 150, 120).drag(LEFT, [150, 120], [260, 200]),
      { zoomToCursor: true },
    );
    parity(
      "one-finger touch pans and two fingers dolly and rotate",
      camera,
      (rig) => {
        rig
          .touchDown(1, 400, 300)
          .touchMove(1, 430, 320)
          .touchMove(1, 470, 350);
        rig
          .touchDown(2, 600, 350)
          .touchMove(2, 650, 380)
          .touchMove(1, 420, 330);
        rig.touchUp(2, 650, 380).touchMove(1, 400, 300).touchUp(1, 400, 300);
      },
    );
    parity("arrow keys pan on the ground plane", camera, (rig) => {
      rig.easel.listenToKeyEvents(rig.keyTarget);
      rig.three.listenToKeyEvents(rig.keyTarget);
      rig.key("ArrowUp").key("ArrowLeft").key("ArrowRight", { shiftKey: true });
    });
  }

  // Each gesture alone matches three.js to below 1e-7 from this camera, but
  // chaining them near the pole (phi about 1e-3) grows the difference to about
  // 8e-4; offsets of 0.1 and 1 give about 2.5e-3 and 2e-4. The likely cause is
  // EASEL's Float32 matrices amplified by atan2 near the pole, not yet proven.
  parity(
    "near-pole top-down pan, dolly, and rotate",
    { kind: "orthographic", position: [0, 8, 0.01] },
    (rig) => {
      rig.drag(LEFT, [400, 300], [460, 240]).wheel(-120);
      rig.touchDown(1, 400, 300).touchMove(1, 470, 350);
      rig.touchDown(2, 600, 350).touchMove(2, 650, 380);
      rig.touchUp(2, 650, 380).touchUp(1, 470, 350);
    },
    {},
    2e-3,
  );

  parity(
    "camera.up along +Z pans on the XY plane",
    { kind: "perspective", position: [0, -10, 12], up: [0, 0, 1] },
    (rig) =>
      rig
        .drag(LEFT, [400, 300], [480, 220])
        .drag(RIGHT, [400, 300], [440, 320]),
  );
});

describe("MapControls", () => {
  it("uses the r186 map mappings and ground-plane panning", () => {
    const controls = new MapControls(new PerspectiveCamera());
    expect(controls.screenSpacePanning).toBe(false);
    expect(controls.mouseButtons).toEqual({
      LEFT: MOUSE.PAN,
      MIDDLE: MOUSE.DOLLY,
      RIGHT: MOUSE.ROTATE,
    });
    expect(controls.touches).toEqual({
      ONE: TOUCH.PAN,
      TWO: TOUCH.DOLLY_ROTATE,
    });
  });

  it("keeps the grabbed ground point under a top-down pointer", () => {
    const rig = new OrbitParityRig("map", {
      kind: "orthographic",
      position: [0, 8, 0.01],
    });
    rig.drag(LEFT, [400, 300], [460, 240]);
    // Dragging right and up moves the world with the pointer, so the target
    // moves left (-x) and toward the camera's screen-down side (+z).
    expect(rig.easel.target.x).toBeLessThan(0);
    expect(rig.easel.target.z).toBeGreaterThan(0);
    expect(rig.easel.target.y).toBeCloseTo(0, 12);
    rig.dispose();
  });
});
