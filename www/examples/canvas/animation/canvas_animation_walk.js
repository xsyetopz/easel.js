import {
  AmbientLight,
  AnimationClip,
  Animator,
  Attribute,
  BasicMaterial,
  Bone,
  BoxGeometry,
  DirectionalLight,
  Loop,
  Mesh,
  NumberTrack,
  PerspectiveCamera,
  Renderer,
  Scene,
  Side,
  Skeleton,
  SkeletonHelper,
  SkinnedMesh,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_animation_walk",
  name: "Walk Cycle",
  category: "canvas",
  description:
    "A small authored biped alternates two CPU-skinned leg chains in place.",
};

export const controls = [];

function makeSkinnedGeometry() {
  const geometry = new BoxGeometry(0.42, 2, 0.42, 1, 6, 1);
  geometry.translate(0, 1, 0);
  const position = geometry.getAttribute("position");
  if (!position) throw new Error("Walk example requires positions.");
  const skinIndices = new Uint16Array(position.count * 4);
  const skinWeights = new Float32Array(position.count * 4);
  for (let index = 0; index < position.count; index++) {
    const amount = Math.max(0, Math.min(1, position.getY(index) / 2));
    skinIndices[index * 4] = 0;
    skinIndices[index * 4 + 1] = 1;
    skinWeights[index * 4] = 1 - amount;
    skinWeights[index * 4 + 1] = amount;
  }
  geometry.setAttribute("skinIndex", new Attribute(skinIndices, 4));
  geometry.setAttribute("skinWeight", new Attribute(skinWeights, 4));
  geometry.computeBoundingSphere();
  return {
    geometry,
    bindPositions: new Float32Array(position.array),
  };
}

function syncSkinnedGeometry(mesh, bindPositions) {
  const geometry = mesh.geometry;
  const position = geometry?.getAttribute("position");
  if (!(geometry && position)) return;
  position.set(bindPositions);
  const scratch = new Vector3();
  for (let index = 0; index < position.count; index++) {
    mesh.boneTransform(index, scratch);
    position.setXYZ(index, scratch.x, scratch.y, scratch.z);
  }
  position.needsUpdate = true;
  geometry.computeBoundingSphere();
}

function makeLeg(scene, name, x, color) {
  const { geometry, bindPositions } = makeSkinnedGeometry();
  const root = new Bone();
  root.name = `${name}-hip`;
  root.position.x = x;
  const knee = new Bone();
  knee.name = `${name}-knee`;
  knee.position.y = 1;
  root.add(knee);
  scene.add(root);
  root.updateMatrixWorld(false, true);

  const mesh = new SkinnedMesh(
    geometry,
    new BasicMaterial({ color, side: Side.Double }),
  );
  mesh.name = name;
  mesh.type = "Mesh";
  mesh.position.x = x;
  scene.add(mesh);
  const skeleton = new Skeleton([root, knee]);
  mesh.bind(skeleton);

  const helper = new SkeletonHelper([root, knee]);
  helper.colors = { bone: 0xffc857, parent: 0x4ecdc4 };
  helper.updateColors();
  scene.add(helper);

  return { bindPositions, helper, mesh, root, skeleton };
}

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
  camera.position.set(0, 1.4, 7.5);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.45));
  const light = new DirectionalLight(0xffffff, 0.85);
  light.position.set(4, 5, 6);
  scene.add(light);

  const left = makeLeg(scene, "leftLeg", -0.38, 0x5d9cec);
  const right = makeLeg(scene, "rightLeg", 0.38, 0xe87878);
  const torso = new Mesh(
    new BoxGeometry(1.25, 0.75, 0.8, 1, 1, 1),
    new BasicMaterial({ color: 0xf0b35a, side: Side.Double }),
  );
  torso.position.y = 2.32;
  scene.add(torso);

  const leftClip = new AnimationClip("left-step", 1.2, [
    new NumberTrack(
      "leftLeg.bones[0].rotation.z",
      [0, 0.3, 0.6, 0.9, 1.2],
      [0.14, -0.14, 0.14, -0.14, 0.14],
    ),
    new NumberTrack(
      "leftLeg.bones[1].rotation.z",
      [0, 0.3, 0.6, 0.9, 1.2],
      [0.6, -0.75, 0.6, -0.75, 0.6],
    ),
  ]);
  const rightClip = new AnimationClip("right-step", 1.2, [
    new NumberTrack(
      "rightLeg.bones[0].rotation.z",
      [0, 0.3, 0.6, 0.9, 1.2],
      [-0.14, 0.14, -0.14, 0.14, -0.14],
    ),
    new NumberTrack(
      "rightLeg.bones[1].rotation.z",
      [0, 0.3, 0.6, 0.9, 1.2],
      [-0.75, 0.6, -0.75, 0.6, -0.75],
    ),
  ]);
  const leftAnimator = new Animator(left.mesh);
  leftAnimator
    .clipAction(leftClip)
    .setLoop(Loop.Repeat, Number.POSITIVE_INFINITY)
    .play();
  const rightAnimator = new Animator(right.mesh);
  rightAnimator
    .clipAction(rightClip)
    .setLoop(Loop.Repeat, Number.POSITIVE_INFINITY)
    .play();

  const clock = new Timer();
  let animationFrame;
  function animate() {
    animationFrame = requestAnimationFrame(animate);
    const delta = clock.update().delta;
    leftAnimator.update(delta);
    rightAnimator.update(delta);
    left.root.updateMatrixWorld(false, true);
    right.root.updateMatrixWorld(false, true);
    syncSkinnedGeometry(left.mesh, left.bindPositions);
    syncSkinnedGeometry(right.mesh, right.bindPositions);
    left.helper.update();
    right.helper.update();
    torso.position.y = 2.32 + Math.sin(leftAnimator.time * Math.PI * 2) * 0.05;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();

  return {
    cleanup() {
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
      left.skeleton.dispose();
      right.skeleton.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const clip = new EASEL.AnimationClip("left-step", 1.2, [
  new EASEL.NumberTrack("leftLeg.bones[0].rotation.z", [0, 0.3, 0.6, 0.9, 1.2], [0.14, -0.14, 0.14, -0.14, 0.14]),
  new EASEL.NumberTrack("leftLeg.bones[1].rotation.z", [0, 0.3, 0.6, 0.9, 1.2], [0.6, -0.75, 0.6, -0.75, 0.6]),
]);
const animator = new EASEL.Animator(leftLeg);
animator.clipAction(clip).setLoop(EASEL.Loop.Repeat, Number.POSITIVE_INFINITY).play();
animator.update(delta);
`;

export const threeSource = `import * as THREE from "three";

const clip = new THREE.AnimationClip("left-step", 1.2, [
  new THREE.NumberKeyframeTrack("bones[0].rotation[z]", [0, 0.3, 0.6, 0.9, 1.2], [0.14, -0.14, 0.14, -0.14, 0.14]),
  new THREE.NumberKeyframeTrack("bones[1].rotation[z]", [0, 0.3, 0.6, 0.9, 1.2], [0.6, -0.75, 0.6, -0.75, 0.6]),
]);
const mixer = new THREE.AnimationMixer(leftLeg);
mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Number.POSITIVE_INFINITY).play();
mixer.update(delta);
`;

export const example = { meta, controls, setup, easelSource, threeSource };
