import {
  AmbientLight,
  DirectionalLight,
  GLTFLoader,
  InstancedMesh,
  Matrix4,
  PerspectiveCamera,
  Renderer,
  Scene,
  Side,
  Timer,
  Vector3,
} from "@/index.js";

import instancingBinBase64 from "../../../../assets/gltf/simple-instancing/SimpleInstancing.bin.base64?raw";
import instancingGltf from "../../../../assets/gltf/simple-instancing/SimpleInstancing.gltf?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";
import { aimCamera } from "../../../runtime/example-camera.ts";

const instancingBuffer = Uint8Array.from(atob(instancingBinBase64), (value) =>
  value.charCodeAt(0),
).buffer;

export const meta = {
  id: "instanced-asset-review",
  name: "Instanced Asset Review",
  category: "assets",
  animated: true,
  description:
    "Review 125 transforms from the Khronos Simple Instancing asset.",
};
export const controls = [];

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x101622;
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(3.2, 2.8, 5);
  aimCamera(camera, new Vector3());
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.35));
  const key = new DirectionalLight(0xffffff, 1.15);
  key.position.set(4, 8, 6);
  scene.add(key);

  const result = new GLTFLoader().parse(JSON.parse(instancingGltf), {
    buffers: [instancingBuffer],
    materialType: "lambert",
  });
  const instanceMatrix = new Matrix4();
  result.scene.traverse((object) => {
    object.frustumCulled = false;
    if (object instanceof InstancedMesh) {
      for (let index = 0; index < object.count; index++) {
        object.getMatrixAt(index, instanceMatrix);
        const elements = instanceMatrix.elements;
        for (const component of [0, 1, 2, 4, 5, 6, 8, 9, 10]) {
          elements[component] *= 0.2;
        }
        elements[12] = (elements[12] - 5) * 0.2;
        elements[13] = (elements[13] - 5) * 0.2;
        elements[14] = (elements[14] - 5) * 0.2;
        object.setMatrixAt(index, instanceMatrix);
      }
    }
    if (object.material) {
      object.material.vertexColors = false;
      object.material.color.set(0x7eb6e8);
      object.material.side = Side.Double;
    }
  });
  scene.add(result.scene);

  const timer = new Timer();
  const animation = createExampleAnimationLoop(() => {
    result.scene.rotation.y += timer.update().delta * 0.12;
    result.scene.updateMatrixWorld(true, true);
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    cleanup() {
      animation.cleanup();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const result = new EASEL.GLTFLoader().parse(document, {
  buffers: [arrayBuffer],
  materialType: "lambert",
});
scene.add(result.scene);`;

export const example = { meta, controls, setup, easelSource };
