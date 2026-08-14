import {
  AmbientLight,
  Box3,
  BoxGeometry,
  DirectionalLight,
  EdgesGeometry,
  LambertMaterial,
  LineMaterial,
  LineSegments,
  Mesh,
  OBB,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "collision-bounds",
  name: "Collision Bounds",
  category: "worlds",
  animated: true,
  description: "Visualize oriented bounds around a moving object.",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x111724;
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 1.2, 7);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.35));
  const light = new DirectionalLight(0xffffff, 0.9);
  light.position.set(3, 5, 6);
  scene.add(light);

  const materialA = new LambertMaterial({ color: 0x5b9fe0 });
  const materialB = new LambertMaterial({ color: 0xe07070 });
  const geometryA = new BoxGeometry(1.8, 1.8, 1.8);
  const geometryB = new BoxGeometry(1.8, 1.8, 1.8);
  const boxA = new Mesh(geometryA, materialA);
  const boxB = new Mesh(geometryB, materialB);
  boxA.position.x = -1.15;
  boxB.position.x = 1.15;
  scene.add(boxA, boxB);
  const outlineA = new LineSegments(
    new EdgesGeometry(geometryA),
    new LineMaterial({ color: 0x9dd7ff, linewidth: 2 }),
  );
  const outlineB = new LineSegments(
    new EdgesGeometry(geometryB),
    new LineMaterial({ color: 0xffb0b0, linewidth: 2 }),
  );
  outlineA.position.copy(boxA.position);
  outlineB.position.copy(boxB.position);
  scene.add(outlineA, outlineB);
  const localBounds = new Box3().setFromCenterAndSize(
    new Vector3(),
    new Vector3(1.8, 1.8, 1.8),
  );
  const obbA = new OBB();
  const obbB = new OBB();
  const clock = new Timer();
  const animation = createExampleAnimationLoop((timestamp) => {
    clock.update(timestamp);
    boxA.rotation.y += clock.delta * 0.65;
    boxB.rotation.y -= clock.delta * 0.52;
    outlineA.rotation.copy(boxA.rotation);
    outlineB.rotation.copy(boxB.rotation);
    renderer.prepare(scene, camera);
    const overlaps = obbA
      .fromBox3(localBounds)
      .applyMatrix4(boxA.matrixWorld)
      .intersectsOBB(obbB.fromBox3(localBounds).applyMatrix4(boxB.matrixWorld));
    materialA.color.hex = overlaps ? 0xf3bf57 : 0x5b9fe0;
    materialB.color.hex = overlaps ? 0xf3bf57 : 0xe07070;
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    cleanup() {
      animation.cleanup();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const bounds = new EASEL.Box3().setFromCenterAndSize(
  new EASEL.Vector3(),
  new EASEL.Vector3(1.8, 1.8, 1.8),
);
const a = new EASEL.OBB().fromBox3(bounds).applyMatrix4(boxA.matrixWorld);
const b = new EASEL.OBB().fromBox3(bounds).applyMatrix4(boxB.matrixWorld);
const overlaps = a.intersectsOBB(b);`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
