import {
  AmbientLight,
  AnimationBlend,
  AnimationClip,
  Animator,
  Attribute,
  BasicMaterial,
  Bone,
  BoxGeometry,
  DirectionalLight,
  Loop,
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
  id: "webgl_animation_skinning_additive_blending",
  name: "Skinning Additive Blending",
  category: "canvas",
  description:
    "A CPU-skinned strip combines a normal bend with an additive sway clip.",
};

export const controls = [];

function makeSkinnedGeometry() {
  const geometry = new BoxGeometry(0.9, 2, 0.9, 1, 6, 1);
  geometry.translate(0, 1, 0);
  const position = geometry.getAttribute("position");
  if (!position) throw new Error("Skinned example requires positions.");

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
  camera.position.set(0, 1.1, 6.5);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });

  scene.add(new AmbientLight(0xffffff, 0.45));
  const light = new DirectionalLight(0xffffff, 0.85);
  light.position.set(3, 4, 5);
  scene.add(light);

  const { geometry, bindPositions } = makeSkinnedGeometry();
  const root = new Bone();
  root.name = "hip";
  const tip = new Bone();
  tip.name = "sway";
  tip.position.y = 1;
  root.add(tip);
  scene.add(root);
  root.updateMatrixWorld(false, true);

  const mesh = new SkinnedMesh(
    geometry,
    new BasicMaterial({ color: 0x67b7d8, side: Side.Double }),
  );
  mesh.name = "rig";
  mesh.type = "Mesh";
  scene.add(mesh);
  const skeleton = new Skeleton([root, tip]);
  mesh.bind(skeleton);

  const helper = new SkeletonHelper([root, tip]);
  helper.colors = { bone: 0xffc857, parent: 0x4ecdc4 };
  helper.updateColors();
  scene.add(helper);

  const baseClip = new AnimationClip("base-bend", 2.4, [
    new NumberTrack(
      "rig.bones[1].rotation.y",
      [0, 1.2, 2.4],
      [0.45, -0.45, 0.45],
    ),
  ]);
  const swayClip = new AnimationClip(
    "additive-sway",
    1.2,
    [
      new NumberTrack(
        "rig.bones[1].rotation.z",
        [0, 0.3, 0.6, 0.9, 1.2],
        [0, 0.35, 0, -0.35, 0],
      ),
    ],
    AnimationBlend.Additive,
  );
  const animator = new Animator(mesh);
  animator
    .clipAction(baseClip)
    .setLoop(Loop.Repeat, Number.POSITIVE_INFINITY)
    .play();
  animator
    .clipAction(swayClip)
    .setLoop(Loop.Repeat, Number.POSITIVE_INFINITY)
    .play();

  const clock = new Timer();
  let animationFrame;
  function animate() {
    animationFrame = requestAnimationFrame(animate);
    animator.update(clock.update().delta);
    root.updateMatrixWorld(false, true);
    syncSkinnedGeometry(mesh, bindPositions);
    helper.update();
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();

  return {
    cleanup() {
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
      skeleton.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const clip = new EASEL.AnimationClip("sway", 1.2, [
  new EASEL.NumberTrack("rig.bones[1].rotation.z", [0, 0.3, 0.6, 0.9, 1.2], [0, 0.35, 0, -0.35, 0]),
], EASEL.AnimationBlend.Additive);
const animator = new EASEL.Animator(skinnedMesh);
animator.clipAction(baseClip).setLoop(EASEL.Loop.Repeat, Number.POSITIVE_INFINITY).play();
animator.clipAction(clip).setLoop(EASEL.Loop.Repeat, Number.POSITIVE_INFINITY).play();
animator.update(delta);`;

export const threeSource = `import * as THREE from "three";

const clip = new THREE.AnimationClip("sway", 1.2, [
  new THREE.NumberKeyframeTrack("bones[1].rotation[z]", [0, 0.3, 0.6, 0.9, 1.2], [0, 0.35, 0, -0.35, 0]),
]);
clip.blendMode = THREE.AdditiveAnimationBlendMode;
const mixer = new THREE.AnimationMixer(skinnedMesh);
mixer.clipAction(baseClip).setLoop(THREE.LoopRepeat, Number.POSITIVE_INFINITY).play();
mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Number.POSITIVE_INFINITY).play();
mixer.update(delta);`;

export const example = { meta, controls, setup, easelSource, threeSource };
