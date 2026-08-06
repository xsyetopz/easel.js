import {
  AmbientLight,
  AnimationClip,
  Animator,
  DirectionalLight,
  LambertMaterial,
  Loop,
  Mesh,
  NumberTrack,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  TorusKnotGeometry,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "misc_animation_keys",
  name: "Animation Keys",
  category: "misc",
  description: "A CPU keyframe clip animates position and rotation over time.",
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
  camera.position.set(0, 1, 6);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.3));
  const light = new DirectionalLight(0xffffff, 0.9);
  light.position.set(3, 4, 5);
  scene.add(light);
  const mesh = new Mesh(
    new TorusKnotGeometry(1, 0.32, 48, 10),
    new LambertMaterial({ color: 0x67c5a4 }),
  );
  scene.add(mesh);
  const clip = new AnimationClip("keys", 2, [
    new NumberTrack("position.y", [0, 1, 2], [0, 1.2, 0]),
    new NumberTrack("rotation.y", [0, 2], [0, Math.PI * 2]),
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

const clip = new EASEL.AnimationClip("keys", 2, [
  new EASEL.NumberTrack("position.y", [0, 1, 2], [0, 1.2, 0]),
  new EASEL.NumberTrack("rotation.y", [0, 2], [0, Math.PI * 2]),
]);
const animator = new EASEL.Animator(mesh);
animator.clipAction(clip).setLoop(EASEL.Loop.Repeat, Number.POSITIVE_INFINITY).play();
animator.update(delta);`;

export const threeSource = `import * as THREE from "three";

const clip = new THREE.AnimationClip("keys", 2, [
  new THREE.NumberKeyframeTrack(".position[y]", [0, 1, 2], [0, 1.2, 0]),
  new THREE.NumberKeyframeTrack(".rotation[y]", [0, 2], [0, Math.PI * 2]),
]);
const mixer = new THREE.AnimationMixer(mesh);
mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Number.POSITIVE_INFINITY).play();
mixer.update(delta);`;

export const example = { meta, controls, setup, easelSource, threeSource };
