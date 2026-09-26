import {
  AmbientLight,
  GLTFLoader,
  OrbitControls,
  PerspectiveCamera,
  PointLight,
  Points,
  PointsMaterial,
  Renderer,
  Scene,
  Timer,
} from "@/index.js";

import sphereBinBase64 from "../../../../assets/gltf/AnimatedMorphSphere/AnimatedMorphSphere.bin.base64?raw";
import sphereGltf from "../../../../assets/gltf/AnimatedMorphSphere/AnimatedMorphSphere.gltf?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

const sphereBin = Uint8Array.from(atob(sphereBinBase64), (value) =>
  value.charCodeAt(0),
);

export const meta = {
  id: "canvas_morphtargets_sphere",
  upstream: "webgl_morphtargets_sphere",
  name: "morphtargets / sphere",
  category: "canvas",
  animated: true,
  description:
    "A glTF sphere lit by red and green point lights spins while its blob morph target swings back and forth, with white point sprites following the morphed vertices.",
  differences: [
    "EASEL's GLTFLoader does not read morph targets and its renderer ignores morphTargetInfluences, so the port reads the two POSITION and NORMAL morph deltas from the same glTF buffer and blends them into the shared geometry on the CPU each frame.",
    "EASEL does not keep a node's Euler rotation in sync when its quaternion is changed in place, so the port copies the glTF node quaternion into mesh.rotation before applying the upstream rotation.z change.",
    "The glTF PBR material is loaded as an EASEL Lambert material with CPU-baked vertex lighting, so the sphere has no specular response.",
    "EASEL points are filled discs with an integer pixel radius and no texture sampling or alphaTest, so solid discs of radius 5 (11 pixels across) stand in for the 10-pixel disc.png sprites.",
  ],
};
export const controls = [];

export function setup(canvas) {
  let mesh;

  let sign = 1;
  const speed = 0.5;

  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: canvas.width / canvas.height,
    near: 0.2,
    far: 100,
  });
  camera.position.set(0, 5, 5);

  const scene = new Scene();

  const timer = new Timer();
  timer.connect(canvas.ownerDocument);

  const light1 = new PointLight(0xff2200, 50000);
  light1.position.set(100, 100, 100);
  scene.add(light1);

  const light2 = new PointLight(0x22ff00, 10000);
  light2.position.set(-100, -100, -100);
  scene.add(light2);

  scene.add(new AmbientLight(0x111111));

  const loader = new GLTFLoader();
  const gltf = loader.parse(sphereGltf, { buffers: [sphereBin] });

  mesh = gltf.scene.getObjectByName("AnimatedMorphSphere");
  mesh.rotation.setFromQuaternion(mesh.quaternion);
  mesh.rotation.z = Math.PI / 2;
  scene.add(mesh);

  // EASEL has no morph target support: read the glTF target deltas and blend
  // them into the geometry on the CPU (1,876 vertices per frame).
  const morph = createMorphTargets(JSON.parse(sphereGltf), mesh);
  mesh.morphTargetInfluences = [0, 0];
  mesh.morphTargetDictionary = morph.dictionary;

  //

  const pointsMaterial = new PointsMaterial({
    size: 5,
    vertexColors: false,
  });

  const points = new Points(mesh.geometry, pointsMaterial);
  points.morphTargetInfluences = mesh.morphTargetInfluences;
  points.morphTargetDictionary = mesh.morphTargetDictionary;
  mesh.add(points);

  //

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  //

  const orbit = new OrbitControls(camera, canvas);
  orbit.minDistance = 1;
  orbit.maxDistance = 20;

  function render() {
    const delta = timer.delta;

    if (mesh !== undefined) {
      const step = delta * speed;

      mesh.rotation.y += step;

      mesh.morphTargetInfluences[1] =
        mesh.morphTargetInfluences[1] + step * sign;

      if (
        mesh.morphTargetInfluences[1] <= 0 ||
        mesh.morphTargetInfluences[1] >= 1
      ) {
        sign *= -1;
      }

      morph.apply(mesh.morphTargetInfluences);
    }

    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }

  const animation = createExampleAnimationLoop(() => {
    timer.update();
    render();
  });

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    },
    cleanup() {
      animation.cleanup();
      orbit.dispose();
      timer.dispose();
      mesh.geometry.dispose();
      mesh.material.dispose();
      pointsMaterial.dispose();
      renderer.dispose();
    },
  };
}

function createMorphTargets(json, mesh) {
  const [primitive] = json.meshes[0].primitives;
  const geometry = mesh.geometry;
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const basePosition = position.array.slice();
  const baseNormal = normal.array.slice();

  function readVec3(accessorIndex) {
    const accessor = json.accessors[accessorIndex];
    const view = json.bufferViews[accessor.bufferView];
    const offset =
      sphereBin.byteOffset +
      (view.byteOffset ?? 0) +
      (accessor.byteOffset ?? 0);
    return new Float32Array(sphereBin.buffer, offset, accessor.count * 3);
  }

  const dictionary = {};
  const positionDeltas = [];
  const normalDeltas = [];
  primitive.targets.forEach((target, index) => {
    dictionary[json.accessors[target.POSITION].name ?? String(index)] = index;
    positionDeltas.push(readVec3(target.POSITION));
    normalDeltas.push(readVec3(target.NORMAL));
  });

  function blend(out, base, deltas, influences) {
    for (let i = 0; i < out.length; i++) {
      let value = base[i];
      for (let t = 0; t < deltas.length; t++) {
        value += deltas[t][i] * influences[t];
      }
      out[i] = value;
    }
  }

  return {
    dictionary,
    apply(influences) {
      blend(position.array, basePosition, positionDeltas, influences);
      blend(normal.array, baseNormal, normalDeltas, influences);
      geometry.normalizeNormals();
      position.needsUpdate = true;
      normal.needsUpdate = true;
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const gltf = new EASEL.GLTFLoader().parse(sphereGltf, { buffers: [sphereBin] });
const mesh = gltf.scene.getObjectByName("AnimatedMorphSphere");
mesh.rotation.setFromQuaternion(mesh.quaternion);
mesh.rotation.z = Math.PI / 2;
scene.add(mesh);

const points = new EASEL.Points(
  mesh.geometry,
  new EASEL.PointsMaterial({ size: 5, vertexColors: false }),
);
mesh.add(points);

// EASEL has no morph targets: blend the glTF deltas on the CPU.
const position = mesh.geometry.getAttribute("position");
for (let i = 0; i < position.array.length; i++) {
  position.array[i] = base[i] + blobDelta[i] * influence;
}
position.needsUpdate = true;

renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };
