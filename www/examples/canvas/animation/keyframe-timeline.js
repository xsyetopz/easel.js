import {
  AmbientLight,
  AnimationClip,
  Animator,
  BoxGeometry,
  DirectionalLight,
  LambertMaterial,
  Loop,
  Mesh,
  NumberTrack,
  PerspectiveCamera,
  Renderer,
  Scene,
  Side,
  Timer,
  Vector3,
} from "@/index.js";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "keyframe-timeline",
  name: "Keyframe Timeline",
  category: "motion",
  animated: true,
  description:
    "Scrub a keyed prop through position, rotation, and scale tracks.",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 1.2, 6.5);
  camera.updateMatrixWorld(false, false, true);
  camera.lookAt(new Vector3(0, 1.3, 0));
  camera.updateMatrix();

  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.35));
  const light = new DirectionalLight(0xffffff, 0.9);
  light.position.set(4, 5, 6);
  scene.add(light);

  const mesh = new Mesh(
    new BoxGeometry(1.4, 1.4, 1.4, 2, 2, 2),
    new LambertMaterial({ color: 0x65b9d8, side: Side.Double }),
  );
  mesh.position.y = 0.8;
  scene.add(mesh);

  const clip = new AnimationClip("keyframes", 2.4, [
    new NumberTrack(
      "position.y",
      [0, 0.6, 1.2, 1.8, 2.4],
      [0.8, 1.8, 0.8, 1.8, 0.8],
    ),
    new NumberTrack("rotation.x", [0, 1.2, 2.4], [0, Math.PI, Math.PI * 2]),
    new NumberTrack("rotation.y", [0, 2.4], [0, Math.PI * 2]),
    new NumberTrack("scale.x", [0, 1.2, 2.4], [1, 0.72, 1]),
    new NumberTrack("scale.z", [0, 1.2, 2.4], [1, 1.28, 1]),
  ]);
  const animator = new Animator(mesh);
  animator
    .clipAction(clip)
    .setLoop(Loop.Repeat, Number.POSITIVE_INFINITY)
    .play();

  const clock = new Timer();
  const animation = createExampleAnimationLoop((timestamp) => {
    animator.update(clock.update(timestamp).delta);
    renderer.prepare(scene, camera);
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
const clip = new EASEL.AnimationClip("keyframes", 2.4, [
  new EASEL.NumberTrack("position.y", [0, 0.6, 1.2, 1.8, 2.4], [0.8, 1.8, 0.8, 1.8, 0.8]),
  new EASEL.NumberTrack("rotation.y", [0, 2.4], [0, Math.PI * 2]),
]);
const animator = new EASEL.Animator(mesh);
animator.clipAction(clip).setLoop(EASEL.Loop.Repeat, Number.POSITIVE_INFINITY).play();
animator.update(delta);`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
