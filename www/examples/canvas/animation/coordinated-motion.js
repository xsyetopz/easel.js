import {
  AmbientLight,
  AnimationClip,
  AnimationGroup,
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
  id: "coordinated-motion",
  name: "Coordinated Motion",
  category: "motion",
  animated: true,
  description: "Keep several moving parts in sync with one animation group.",
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
  camera.position.set(0, 1.1, 7.5);
  camera.updateMatrixWorld(false, false, true);
  camera.lookAt(new Vector3(0, 1.1, 0));
  camera.updateMatrix();

  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.35));
  const light = new DirectionalLight(0xffffff, 0.9);
  light.position.set(4, 5, 6);
  scene.add(light);

  const colors = [0xe56b6f, 0x68b4d8, 0x74c69d, 0xd7a84f];
  const roots = colors.map((color, index) => {
    const mesh = new Mesh(
      new BoxGeometry(1.05, 1.05, 1.05, 1, 1, 1),
      new LambertMaterial({ color, side: Side.Double }),
    );
    mesh.position.set((index - 1.5) * 1.55, 0.7, 0);
    scene.add(mesh);
    return mesh;
  });

  const group = new AnimationGroup(...roots);
  const spinClip = new AnimationClip("spin", 2.8, [
    new NumberTrack("rotation.y", [0, 1.4, 2.8], [0, Math.PI, Math.PI * 2]),
  ]);
  const bounceClip = new AnimationClip("bounce", 1.4, [
    new NumberTrack("position.y", [0, 0.7, 1.4], [0.7, 1.55, 0.7]),
    new NumberTrack("rotation.x", [0, 0.7, 1.4], [0, 0.25, 0]),
  ]);
  const animator = new Animator(group);
  animator
    .clipAction(spinClip)
    .setLoop(Loop.Repeat, Number.POSITIVE_INFINITY)
    .play();
  const bounceAction = animator
    .clipAction(bounceClip)
    .setLoop(Loop.Repeat, Number.POSITIVE_INFINITY)
    .play();
  bounceAction.weight = 0.72;

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
const group = new EASEL.AnimationGroup(meshA, meshB, meshC, meshD);
const spin = new EASEL.AnimationClip("spin", 2.8, [
  new EASEL.NumberTrack("rotation.y", [0, 1.4, 2.8], [0, Math.PI, Math.PI * 2]),
]);
const bounce = new EASEL.AnimationClip("bounce", 1.4, [
  new EASEL.NumberTrack("position.y", [0, 0.7, 1.4], [0.7, 1.55, 0.7]),
]);
const animator = new EASEL.Animator(group);
animator.clipAction(spin).setLoop(EASEL.Loop.Repeat, Number.POSITIVE_INFINITY).play();
animator.clipAction(bounce).setLoop(EASEL.Loop.Repeat, Number.POSITIVE_INFINITY).play();
animator.update(delta);`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
