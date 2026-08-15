import {
  AmbientLight,
  Color,
  DirectionalLight,
  Matrix4,
  OrthographicCamera,
  PerspectiveCamera,
  Quaternion,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export function createScene(canvas, options = {}) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  const isOrthographic = options.orthographic === true;
  const frustum = options.frustum ?? 6;
  const camera = isOrthographic
    ? new OrthographicCamera({
        left: -frustum,
        right: frustum,
        top: frustum * (height / width),
        bottom: -frustum * (height / width),
        near: 0.1,
        far: 100,
      })
    : new PerspectiveCamera({
        fov: options.fov ?? 45,
        aspect: width / height,
        near: 0.1,
        far: 100,
      });
  camera.position.set(...(options.cameraPosition ?? [4, 3, 8]));
  camera.updateMatrixWorld(false, false, true);
  camera.lookAt(new Vector3(...(options.target ?? [0, 0, 0])));
  camera.updateMatrix();
  scene.background = new Color(options.background ?? 0x101622);
  scene.add(new AmbientLight(0xffffff, 0.35));
  const key = new DirectionalLight(0xffffff, 0.95);
  key.position.set(5, 7, 8);
  scene.add(key);
  const fill = new DirectionalLight(0x6d9dff, 0.25);
  fill.position.set(-4, 2, -5);
  scene.add(fill);
  const renderer = new Renderer({ canvas, width, height });
  return { width, height, scene, camera, renderer };
}

export function runLoop(renderer, scene, camera, update, disposers = []) {
  const clock = new Timer();
  const animation = createExampleAnimationLoop((timestamp) => {
    clock.update(timestamp);
    update(clock.elapsedTime, clock.delta);
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    cleanup() {
      animation.cleanup();
      for (const dispose of disposers) dispose();
    },
  };
}

export function pointerNdc(canvas, onMove, eventName = "pointermove") {
  const onPointer = (event) => {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || canvas.width || 1;
    const height = rect.height || canvas.height || 1;
    onMove({
      x: ((event.clientX - rect.left) / width) * 2 - 1,
      y: -((event.clientY - rect.top) / height) * 2 + 1,
      event,
    });
  };
  canvas.addEventListener(eventName, onPointer);
  return () => canvas.removeEventListener(eventName, onPointer);
}

export function instanceMatrix(position, rotationY, scale) {
  const quaternion = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    rotationY,
  );
  const matrix = new Matrix4();
  matrix.compose(
    new Vector3(position[0], position[1], position[2]),
    quaternion,
    new Vector3(scale, scale, scale),
  );
  return matrix;
}

export function colorFromHex(hex) {
  return new Color(hex);
}

export function positionArray(geometry) {
  const position = geometry.getAttribute("position");
  const values = new Float32Array(position?.array ?? 0);
  return values;
}

export function applyMorphPositions(geometry, base, targets, weights) {
  const position = geometry.getAttribute("position");
  if (!position) return;
  for (let vertex = 0; vertex < position.count; vertex++) {
    const offset = vertex * 3;
    let x = base[offset] ?? 0;
    let y = base[offset + 1] ?? 0;
    let z = base[offset + 2] ?? 0;
    for (let targetIndex = 0; targetIndex < targets.length; targetIndex++) {
      const target = targets[targetIndex];
      const weight = weights[targetIndex] ?? 0;
      if (!target || weight === 0) continue;
      x += ((target[offset] ?? x) - (base[offset] ?? x)) * weight;
      y += ((target[offset + 1] ?? y) - (base[offset + 1] ?? y)) * weight;
      z += ((target[offset + 2] ?? z) - (base[offset + 2] ?? z)) * weight;
    }
    position.setXYZ(vertex, x, y, z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}
