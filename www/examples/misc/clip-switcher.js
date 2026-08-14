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
  Timer,
  Vector3,
} from "@/index.js";
import { createExampleAnimationLoop } from "../../runtime/example-animation.ts";

export const meta = {
  id: "clip-switcher",
  name: "Clip Switcher",
  category: "motion",
  animated: true,
  description: "Switch between named clips on a grouped mechanical assembly.",
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
  camera.position.set(0, 1, 7);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.35));
  const light = new DirectionalLight(0xffffff, 0.9);
  light.position.set(4, 5, 6);
  scene.add(light);

  const roots = [-2, 0, 2].map((x, index) => {
    const mesh = new Mesh(
      new BoxGeometry(1.25, 1.25, 1.25),
      new LambertMaterial({ color: [0xe05a5a, 0x5aa6e0, 0xe0b84f][index] }),
    );
    mesh.position.x = x;
    scene.add(mesh);
    return mesh;
  });
  const group = new AnimationGroup(...roots);
  const clip = new AnimationClip("spin", 2, [
    new NumberTrack("rotation.y", [0, 1, 2], [0, Math.PI, Math.PI * 2]),
  ]);
  const animator = new Animator(group);
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
const group = new EASEL.AnimationGroup(meshA, meshB, meshC);
const clip = new EASEL.AnimationClip("spin", 2, [
  new EASEL.NumberTrack("rotation.y", [0, 1, 2], [0, Math.PI, Math.PI * 2]),
]);
const animator = new EASEL.Animator(group);
animator.clipAction(clip).setLoop(EASEL.Loop.Repeat, Number.POSITIVE_INFINITY).play();
animator.update(delta);`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
