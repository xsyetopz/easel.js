// Card: references/animation-tracks.md#loop-and-animator-update
import * as EASEL from "@xsyetopz/easel";
import {
  createStubCanvas,
  expect,
  installFrameScheduler,
} from "./harness.ts";

export function playForever(
  root: EASEL.Node,
  clip: EASEL.AnimationClip,
): EASEL.Animator {
  const animator = new EASEL.Animator(root);
  animator
    .clipAction(clip)
    .setLoop(EASEL.Loop.Repeat, Number.POSITIVE_INFINITY)
    .play();
  return animator;
}

export function startLoop(
  animator: EASEL.Animator,
  renderer: EASEL.Renderer,
  scene: EASEL.Scene,
  camera: EASEL.Camera,
): () => void {
  const timer = new EASEL.Timer();
  let handle = 0;
  const frame = (now: number) => {
    timer.update(now); // rAF milliseconds in, seconds out via delta
    animator.update(timer.delta);
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
    handle = requestAnimationFrame(frame);
  };
  handle = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(handle);
}

function crateRig() {
  const root = new EASEL.Group();
  const crate = new EASEL.Group();
  crate.name = "Crate"; // track names bind by node name
  root.add(crate);
  const clip = new EASEL.AnimationClip("rise", 2, [
    new EASEL.NumberTrack("Crate.position.y", [0, 2], [0, 2]),
  ]);
  return { root, crate, clip };
}

function rig(loop: EASEL.LoopMode) {
  const { root, crate, clip } = crateRig();
  const animator = new EASEL.Animator(root);
  const action = animator.clipAction(clip);
  action.setLoop(loop, Number.POSITIVE_INFINITY).play();
  return { crate, animator, action };
}

function loopRuns(): number {
  const scheduler = installFrameScheduler();
  try {
    const stub = createStubCanvas(8, 8);
    const canvas = stub.element;
    const renderer = new EASEL.Renderer({ width: 8, height: 8, canvas });
    const scene = new EASEL.Scene();
    const { root, crate, clip } = crateRig();
    scene.add(root);
    const animator = playForever(root, clip);
    const camera = new EASEL.PerspectiveCamera();
    const stop = startLoop(animator, renderer, scene, camera);
    scheduler.step(performance.now() + 500);
    stop();
    expect(scheduler.pending === 0, "stop() should cancel the frame");
    return crate.position.y;
  } finally {
    scheduler.restore();
  }
}

export function check(): string {
  const looped = loopRuns();
  const repeat = rig(EASEL.Loop.Repeat);
  repeat.animator.update(2.5);
  const once = rig(EASEL.Loop.Once);
  once.animator.update(2.5);
  const held = rig(EASEL.Loop.Once);
  held.action.clampWhenFinished = true; // keep the last pose after Once
  held.animator.update(2.5);
  const millis = rig(EASEL.Loop.Repeat);
  millis.animator.update(16); // a rAF delta in ms: 16 s of animation

  const names = Object.keys(EASEL);
  expect(!names.includes("LoopRepeat"), "EASEL has no LoopRepeat constant");
  expect(!names.includes("Clock"), "EASEL has no Clock; use Timer");
  expect(Math.abs(repeat.crate.position.y - 0.5) < 1e-6, "repeat wraps");
  expect(once.crate.position.y === 0, "Once without clamp resets");
  expect(Math.abs(held.crate.position.y - 2) < 1e-6, "clamp holds the end");
  expect(millis.crate.position.y === 0, "16 s wraps to the clip start");
  expect(looped > 0, "the frame loop should advance the animator");
  return `t=2.5s: Loop.Repeat y=${repeat.crate.position.y} ` +
    `Loop.Once y=${once.crate.position.y} ` +
    `Once+clampWhenFinished y=${held.crate.position.y}; ` +
    "update(16) meant as ms gives " +
    `y=${millis.crate.position.y} (16 s)`;
}
