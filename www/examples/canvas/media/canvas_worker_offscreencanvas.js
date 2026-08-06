import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";
import { addMediaStatus } from "./media_helpers.js";

export const meta = {
  id: "webgl_worker_offscreencanvas",
  name: "OffscreenCanvas worker",
  category: "canvas",
  description:
    "Runs a CPU Canvas2D worker when transferable OffscreenCanvas is available and falls back to the EASEL renderer on the main thread.",
};

export const controls = [];

function workerSource() {
  return [
    "let context;",
    "let running = true;",
    "let start = 0;",
    "globalThis.onmessage = (event) => {",
    "  if (event.data.type !== 'init') return;",
    "  const canvas = event.data.canvas;",
    "  canvas.width = event.data.width;",
    "  canvas.height = event.data.height;",
    "  context = canvas.getContext('2d');",
    "  start = globalThis.performance?.now?.() ?? 0;",
    "  const draw = (time) => {",
    "    if (!running || !context) return;",
    "    const width = canvas.width;",
    "    const height = canvas.height;",
    "    const phase = (time - start) * 0.001;",
    "    context.fillStyle = '#101722';",
    "    context.fillRect(0, 0, width, height);",
    "    context.save();",
    "    context.translate(width * 0.5, height * 0.5);",
    "    context.rotate(phase * 0.7);",
    "    context.fillStyle = '#6bb6e8';",
    "    context.fillRect(-width * 0.18, -height * 0.18, width * 0.36, height * 0.36);",
    "    context.strokeStyle = '#f2b36b';",
    "    context.lineWidth = 4;",
    "    context.strokeRect(-width * 0.28, -height * 0.28, width * 0.56, height * 0.56);",
    "    context.restore();",
    "    if (typeof globalThis.requestAnimationFrame === 'function') globalThis.requestAnimationFrame(draw);",
    "    else globalThis.setTimeout(() => draw(globalThis.performance?.now?.() ?? Date.now()), 16);",
    "  };",
    "  draw(start);",
    "};",
    "globalThis.onmessageerror = () => { running = false; };",
  ].join("\n");
}

function createMainThreadFallback(canvas, status) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x101722;
  scene.add(new AmbientLight(0xffffff, 0.55));
  const key = new DirectionalLight(0xffffff, 0.8);
  key.position.set(3, 4, 5);
  scene.add(key);
  const mesh = new Mesh(
    new BoxGeometry(1.8, 1.8, 1.8),
    new LambertMaterial({ color: 0x6bb6e8 }),
  );
  scene.add(mesh);
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 0.3, 5.3);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  const timer = new Timer();
  const requestFrame =
    typeof globalThis.requestAnimationFrame === "function"
      ? globalThis.requestAnimationFrame.bind(globalThis)
      : undefined;
  const cancelFrame =
    typeof globalThis.cancelAnimationFrame === "function"
      ? globalThis.cancelAnimationFrame.bind(globalThis)
      : undefined;
  let frame;
  const animate = (timestamp) => {
    const timing = timer.update(timestamp);
    mesh.rotation.y += timing.delta * 0.7;
    mesh.rotation.x += timing.delta * 0.35;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
    if (requestFrame) frame = requestFrame(animate);
  };
  animate();
  status.set("Main-thread EASEL CPU fallback");
  return () => {
    if (frame !== undefined) cancelFrame?.(frame);
    renderer.dispose();
    mesh.geometry.dispose();
    mesh.material.dispose();
  };
}

function startWorker(canvas, status) {
  if (
    typeof globalThis.Worker !== "function" ||
    typeof globalThis.Blob !== "function" ||
    typeof globalThis.URL?.createObjectURL !== "function" ||
    typeof canvas.transferControlToOffscreen !== "function"
  ) {
    return;
  }
  let worker;
  let objectUrl;
  try {
    const blob = new globalThis.Blob([workerSource()], {
      type: "text/javascript",
    });
    objectUrl = globalThis.URL.createObjectURL(blob);
    worker = new globalThis.Worker(objectUrl);
    worker.onerror = () =>
      status.set("Worker failed · OffscreenCanvas unavailable");
    const offscreen = canvas.transferControlToOffscreen();
    worker.postMessage(
      {
        type: "init",
        canvas: offscreen,
        width: canvas.width || 640,
        height: canvas.height || 360,
      },
      [offscreen],
    );
    status.set("OffscreenCanvas worker · CPU Canvas2D");
  } catch {
    worker?.terminate();
    if (objectUrl) globalThis.URL.revokeObjectURL?.(objectUrl);
    return;
  }
  return () => {
    worker?.postMessage({ type: "stop" });
    worker?.terminate();
    if (objectUrl) globalThis.URL.revokeObjectURL?.(objectUrl);
  };
}

export function setup(canvas) {
  const status = addMediaStatus(canvas, "Selecting Canvas2D worker path…");
  const stopWorker = startWorker(canvas, status);
  const stopFallback = stopWorker
    ? undefined
    : createMainThreadFallback(canvas, status);
  return {
    cleanup() {
      stopWorker?.();
      stopFallback?.();
      status.cleanup();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const renderer = new EASEL.Renderer({ canvas, width, height });
const worker = new Worker(workerUrl, { type: "module" });
const offscreen = canvas.transferControlToOffscreen?.();
if (offscreen) worker.postMessage({ canvas: offscreen }, [offscreen]);
else renderer.render(scene, camera);`;

export const threeSource = `import * as THREE from "three";

const worker = new Worker(new URL("three/addons/offscreen/scene.js", import.meta.url), { type: "module" });
const offscreen = canvas.transferControlToOffscreen();
worker.postMessage({ canvas: offscreen }, [offscreen]);`;

export const example = { meta, controls, setup, easelSource, threeSource };
