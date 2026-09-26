// Card: references/lifecycle.md#frame-loop-teardown
import {
  BasicMaterial,
  BoxGeometry,
  Mesh,
  OrbitControls,
  PerspectiveCamera,
  Renderer,
  Scene,
} from "@xsyetopz/easel";
import {
  createStubCanvas,
  expect,
  installFrameScheduler,
} from "./harness.ts";

export function mountScene(canvas: HTMLCanvasElement): () => void {
  const renderer = new Renderer({ width: 64, height: 48, canvas });
  const scene = new Scene();
  const camera = new PerspectiveCamera({ fov: 60, aspect: 64 / 48 });
  camera.position.set(0, 1, 4);
  const controls = new OrbitControls(camera, canvas); // adds DOM listeners
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new BasicMaterial({ color: 0x66ccff });
  scene.add(new Mesh(geometry, material));

  let handle = 0;
  const frame = () => {
    controls.update();
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
    handle = requestAnimationFrame(frame);
  };
  handle = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(handle); // renderer.dispose() does not stop rAF
    controls.dispose(); // removes pointer, wheel, and contextmenu listeners
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  };
}

export function check(): string {
  const scheduler = installFrameScheduler();
  try {
    const stub = createStubCanvas(64, 48);
    const unmount = mountScene(stub.element);
    const listeners = stub.listenerTypes.length;
    scheduler.step(16);
    scheduler.step(32);
    const pendingWhileMounted = scheduler.pending;
    unmount();
    expect(listeners > 0, "OrbitControls should attach listeners");
    expect(pendingWhileMounted === 1, "one frame should stay queued");
    expect(scheduler.pending === 0, "unmount should cancel the frame");
    expect(stub.listenerTypes.length === 0, "dispose should drop listeners");
    return `listeners mounted=${listeners} after=${stub.listenerTypes.length}; ` +
      `queued frames mounted=${pendingWhileMounted} after=${scheduler.pending}`;
  } finally {
    scheduler.restore();
  }
}
