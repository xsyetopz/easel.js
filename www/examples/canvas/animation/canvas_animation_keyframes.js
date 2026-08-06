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

export const meta = {
  id: "webgl_animation_keyframes",
  name: "Keyframe Animation",
  category: "canvas",
  description:
    "An authored CPU mesh follows position, scale, and rotation keyframes.",
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
  camera.lookAt(new Vector3(0, 0, 0));

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
  let animationFrame;
  function animate() {
    animationFrame = requestAnimationFrame(animate);
    animator.update(clock.update().delta);
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();

  return {
    cleanup() {
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
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

export const threeSource = `import * as THREE from "three";

const clip = new THREE.AnimationClip("keyframes", 2.4, [
  new THREE.NumberKeyframeTrack(".position[y]", [0, 0.6, 1.2, 1.8, 2.4], [0.8, 1.8, 0.8, 1.8, 0.8]),
  new THREE.NumberKeyframeTrack(".rotation[y]", [0, 2.4], [0, Math.PI * 2]),
]);
const mixer = new THREE.AnimationMixer(mesh);
mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Number.POSITIVE_INFINITY).play();
mixer.update(delta);`;

export const example = { meta, controls, setup, easelSource, threeSource };
