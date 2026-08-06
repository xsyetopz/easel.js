import {
  AmbientLight,
  Attribute,
  BasicMaterial,
  Bone,
  BoxGeometry,
  DirectionalLight,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Side,
  Skeleton,
  SkeletonHelper,
  SkinnedMesh,
  SphereGeometry,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_animation_skinning_ik",
  name: "Skinning IK",
  category: "canvas",
  description:
    "A moving target drives an authored two-bone chain with a CPU IK solve.",
};

export const controls = [];

function makeSkinnedGeometry() {
  const geometry = new BoxGeometry(0.72, 2, 0.72, 1, 6, 1);
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

function solveTwoBoneIk(root, tip, target) {
  const distance = Math.max(
    0.2,
    Math.min(1.95, Math.hypot(target.x, target.y)),
  );
  const cosine = Math.max(-1, Math.min(1, (distance * distance - 2) / 2));
  const elbow = Math.acos(cosine);
  const shoulder =
    Math.atan2(target.y, target.x) -
    Math.atan2(Math.sin(elbow), 1 + Math.cos(elbow));

  root.rotation.z = shoulder - Math.PI / 2;
  tip.rotation.z = -elbow;
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
  root.name = "ik-root";
  const tip = new Bone();
  tip.name = "ik-tip";
  tip.position.y = 1;
  root.add(tip);
  scene.add(root);
  root.updateMatrixWorld(false, true);

  const mesh = new SkinnedMesh(
    geometry,
    new BasicMaterial({ color: 0x8f7ce0, side: Side.Double }),
  );
  scene.add(mesh);
  mesh.type = "Mesh";
  const skeleton = new Skeleton([root, tip]);
  mesh.bind(skeleton);

  const helper = new SkeletonHelper([root, tip]);
  helper.colors = { bone: 0xffc857, parent: 0x4ecdc4 };
  helper.updateColors();
  scene.add(helper);

  const target = new Mesh(
    new SphereGeometry(0.14, 12, 8),
    new BasicMaterial({ color: 0xff6b6b }),
  );
  scene.add(target);

  const clock = new Timer();
  let animationFrame;
  function animate() {
    animationFrame = requestAnimationFrame(animate);
    const time = clock.update().elapsedTime;
    const targetPosition = new Vector3(
      Math.sin(time * 1.4) * 1.15,
      1 + Math.cos(time * 1.1) * 0.55,
      0,
    );
    solveTwoBoneIk(root, tip, targetPosition);
    target.position.copy(targetPosition);
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

const target = new EASEL.Vector3(0, 1, 0);
const distance = Math.min(1.95, Math.max(0.2, target.length));
const elbow = Math.acos((distance * distance - 2) / 2);
root.rotation.z = Math.atan2(target.y, target.x) - Math.atan2(Math.sin(elbow), 1 + Math.cos(elbow)) - Math.PI / 2;
tip.rotation.z = -elbow;
root.updateMatrixWorld(false, true);
`;

export const threeSource = `import * as THREE from "three";

const target = new THREE.Vector3(0, 1, 0);
const distance = Math.min(1.95, Math.max(0.2, target.length()));
const elbow = Math.acos((distance * distance - 2) / 2);
root.rotation.z = Math.atan2(target.y, target.x) - Math.atan2(Math.sin(elbow), 1 + Math.cos(elbow)) - Math.PI / 2;
tip.rotation.z = -elbow;
root.updateMatrixWorld(true);
`;

export const example = { meta, controls, setup, easelSource, threeSource };
