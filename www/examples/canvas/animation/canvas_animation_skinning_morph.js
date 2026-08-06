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
  id: "webgl_animation_skinning_morph",
  name: "Skinning and Morph Targets",
  category: "canvas",
  description:
    "A CPU-skinned mesh blends authored smile and frown position targets.",
};

export const controls = [];

function makeMorphGeometry() {
  const geometry = new BoxGeometry(0.9, 2, 0.9, 1, 6, 1);
  geometry.translate(0, 1, 0);
  const position = geometry.getAttribute("position");
  if (!position) throw new Error("Morph example requires positions.");

  const smile = new Attribute(new Float32Array(position.count * 3), 3);
  smile.name = "smile";
  const frown = new Attribute(new Float32Array(position.count * 3), 3);
  frown.name = "frown";
  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const faceWeight = Math.max(0, Math.min(1, (y - 0.7) / 1.3));
    smile.setXYZ(index, x * (1 + 0.18 * faceWeight), y + 0.12 * faceWeight, z);
    frown.setXYZ(index, x * (1 - 0.14 * faceWeight), y - 0.14 * faceWeight, z);
  }

  geometry.morphAttributes = { position: [smile, frown] };
  geometry.morphTargetsRelative = false;
  geometry.computeBoundingSphere();
  return {
    geometry,
    bindPositions: new Float32Array(position.array),
    morphTargets: [smile, frown],
  };
}

function syncSkinnedMorphGeometry(mesh, bindPositions, morphTargets) {
  const geometry = mesh.geometry;
  const position = geometry?.getAttribute("position");
  const influences = mesh.morphTargetInfluences;
  if (!(geometry && position && influences)) return;

  const scratch = new Vector3();
  for (let index = 0; index < position.count; index++) {
    const baseX = bindPositions[index * 3];
    const baseY = bindPositions[index * 3 + 1];
    const baseZ = bindPositions[index * 3 + 2];
    let x = baseX;
    let y = baseY;
    let z = baseZ;
    for (
      let targetIndex = 0;
      targetIndex < morphTargets.length;
      targetIndex++
    ) {
      const target = morphTargets[targetIndex];
      const influence = influences[targetIndex] ?? 0;
      if (influence === 0) continue;
      x += (target.getX(index) - baseX) * influence;
      y += (target.getY(index) - baseY) * influence;
      z += (target.getZ(index) - baseZ) * influence;
    }
    position.setXYZ(index, x, y, z);
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

  const { geometry, bindPositions, morphTargets } = makeMorphGeometry();
  const root = new Bone();
  root.name = "face-root";
  const tip = new Bone();
  tip.name = "face-tip";
  tip.position.y = 1;
  root.add(tip);
  scene.add(root);
  root.updateMatrixWorld(false, true);

  const mesh = new SkinnedMesh(
    geometry,
    new BasicMaterial({ color: 0xd87b9b, side: Side.Double }),
  );
  mesh.name = "faceRig";
  mesh.type = "Mesh";
  scene.add(mesh);
  const skeleton = new Skeleton([root, tip]);
  mesh.bind(skeleton);

  const helper = new SkeletonHelper([root, tip]);
  helper.colors = { bone: 0xffc857, parent: 0x4ecdc4 };
  helper.updateColors();
  scene.add(helper);

  const clip = new AnimationClip("head-bob", 2.2, [
    new NumberTrack(
      "faceRig.bones[1].rotation.z",
      [0, 1.1, 2.2],
      [-0.24, 0.24, -0.24],
    ),
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
    const elapsed = clock.update().elapsedTime;
    const smile = 0.5 + 0.5 * Math.sin(elapsed * 1.8);
    if (mesh.morphTargetInfluences) {
      mesh.morphTargetInfluences[0] = smile;
      mesh.morphTargetInfluences[1] = 1 - smile;
    }
    animator.update(clock.delta);
    root.updateMatrixWorld(false, true);
    syncSkinnedMorphGeometry(mesh, bindPositions, morphTargets);
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

skinnedMesh.morphTargetInfluences[0] = smileWeight;
skinnedMesh.morphTargetInfluences[1] = 1 - smileWeight;
animator.update(delta);
`;

export const threeSource = `import * as THREE from "three";

skinnedMesh.morphTargetInfluences[0] = smileWeight;
skinnedMesh.morphTargetInfluences[1] = 1 - smileWeight;
mixer.update(delta);
`;

export const example = { meta, controls, setup, easelSource, threeSource };
