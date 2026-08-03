import * as EASEL from "@/index.js";

export const meta = {
  id: "animation-blending",
  name: "Animation Blending",
  category: "animation",
  description:
    "Two clips on the same Animator: crossFadeFrom switches smoothly between Bounce and Spin.",
};

export const controls = [
  {
    type: "select",
    key: "clip",
    label: "Active Clip",
    options: ["Bounce", "Spin"],
    default: "Bounce",
  },
];

export function setup(canvas, params = {}) {
  const width = canvas.width;
  const height = canvas.height;

  const scene = new EASEL.Scene();
  const camera = new EASEL.PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 2, 8);
  camera.lookAt(new EASEL.Vector3(0, 0, 0));

  const renderer = new EASEL.Renderer({ canvas, width, height });

  scene.add(new EASEL.AmbientLight(0xffffff, 0.4));
  const dirLight = new EASEL.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(4, 6, 5);
  scene.add(dirLight);

  const box = new EASEL.Mesh(
    new EASEL.BoxGeometry(1.2, 1.2, 1.2),
    new EASEL.LambertMaterial({ color: 0x9055cc }),
  );
  scene.add(box);

  const animator = new EASEL.Animator(box);

  const bouncePos = new EASEL.VectorTrack(
    "position",
    [0, 0.5, 1],
    [0, 0, 0, 0, 2.5, 0, 0, 0, 0],
    3,
  );
  const bounceScale = new EASEL.VectorTrack(
    "scale",
    [0, 0.5, 1],
    [1.2, 0.7, 1.2, 0.8, 1.3, 0.8, 1.2, 0.7, 1.2],
    3,
  );
  const bounceClip = new EASEL.AnimationClip("bounce", 1, [
    bouncePos,
    bounceScale,
  ]);
  const bounceAction = animator.clipAction(bounceClip);
  bounceAction.setLoop(EASEL.LoopRepeat, Number.POSITIVE_INFINITY);

  const spinRot = new EASEL.VectorTrack(
    "rotation",
    [0, 0.5, 1],
    [0, 0, 0, 0, Math.PI, 0, 0, Math.PI * 2, 0],
    3,
  );
  const spinClip = new EASEL.AnimationClip("spin", 1, [spinRot]);
  const spinAction = animator.clipAction(spinClip);
  spinAction.setLoop(EASEL.LoopRepeat, Number.POSITIVE_INFINITY);

  bounceAction.play();
  let activeClipName = "Bounce";

  const FADE_DURATION = 0.4;

  function switchTo(clipName) {
    if (clipName === activeClipName) return;
    if (clipName === "Bounce") {
      bounceAction.reset();
      bounceAction.crossFadeFrom(spinAction, FADE_DURATION);
      bounceAction.play();
    } else {
      spinAction.reset();
      spinAction.crossFadeFrom(bounceAction, FADE_DURATION);
      spinAction.play();
    }
    activeClipName = clipName;
  }

  if (params.clip && params.clip !== "Bounce") {
    switchTo(params.clip);
  }

  const clock = new EASEL.Clock();
  let animId;

  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.delta;
    animator.update(dt);
    renderer.render(scene, camera);
  }
  animate();

  return {
    cleanup() {
      if (animId !== undefined) cancelAnimationFrame(animId);
    },
    update(newParams) {
      if (newParams.clip !== undefined) {
        switchTo(newParams.clip);
      }
    },
  };
}

export const easelSource = `import * as EASEL from "easel";

const animator = new EASEL.Animator(box);

const bounceAction = animator.clipAction(bounceClip);
bounceAction.setLoop(EASEL.LoopRepeat, Infinity);

const spinAction = animator.clipAction(spinClip);
spinAction.setLoop(EASEL.LoopRepeat, Infinity);

bounceAction.play();

function switchTo(next, current) {
  next.reset();
  next.crossFadeFrom(current, 0.4);
  next.play();
}

animator.update(dt);`;

export const threeSource = `import * as THREE from "three";

const mixer = new THREE.AnimationMixer(box);

const bounceAction = mixer.clipAction(bounceClip);
bounceAction.setLoop(THREE.LoopRepeat, Infinity);

const spinAction = mixer.clipAction(spinClip);
spinAction.setLoop(THREE.LoopRepeat, Infinity);

bounceAction.play();

function switchTo(next, current) {
  next.reset();
  next.crossFadeFrom(current, 0.4);
  next.play();
}

mixer.update(dt);`;
