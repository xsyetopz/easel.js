import {
  BasicMaterial,
  DataTexture,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Renderer,
  Scene,
  SphereGeometry,
  Timer,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "texture-picking",
  name: "Texture Picking",
  category: "interaction",
  animated: true,
  description: "Pick a texture coordinate on a board and report its location.",
};

export const controls = [];

function checkerTexture(size = 48) {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const stripe = (Math.floor(x / 6) + Math.floor(y / 6)) % 2 === 0;
      const offset = (y * size + x) * 4;
      data[offset] = stripe ? 230 : 45;
      data[offset + 1] = stripe ? 130 : 80;
      data[offset + 2] = stripe ? 65 : 165;
      data[offset + 3] = 255;
    }
  }
  return new DataTexture(data, size, size);
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x101522;
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 0.5, 6.5);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });

  const texture = checkerTexture();
  const board = new Mesh(
    new PlaneGeometry(4.4, 3.2),
    new BasicMaterial({ map: texture }),
  );
  scene.add(board);
  const marker = new Mesh(
    new SphereGeometry(0.1, 10, 8),
    new BasicMaterial({ color: 0xfff2ad }),
  );
  marker.visible = false;
  marker.position.z = 0.08;
  scene.add(marker);
  const raycaster = new Raycaster();
  const pointer = { x: 0, y: 0 };
  const onPointerMove = (event) => {
    const bounds = canvas.getBoundingClientRect();
    pointer.x =
      ((event.clientX - bounds.left) / (bounds.width || width)) * 2 - 1;
    pointer.y =
      -((event.clientY - bounds.top) / (bounds.height || height)) * 2 + 1;
  };
  canvas.addEventListener("pointermove", onPointerMove);
  const clock = new Timer();
  const animation = createExampleAnimationLoop((timestamp) => {
    clock.update(timestamp);
    board.rotation.z = Math.sin(clock.elapsedTime * 0.55) * 0.04;
    renderer.prepare(scene, camera);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(board)[0];
    if (hit) {
      const localHit = board.worldToLocal(hit.point.clone());
      const uvX = (localHit.x + 2.2) / 4.4;
      const uvY = (localHit.y + 1.6) / 3.2;
      marker.visible = true;
      marker.position.set(hit.point.x, hit.point.y, 0.08);
      marker.scale.set(0.7 + uvX * 0.5, 0.7 + uvY * 0.5, 0.7 + uvX * 0.5);
    } else {
      marker.visible = false;
    }
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    cleanup() {
      animation.cleanup();
      canvas.removeEventListener("pointermove", onPointerMove);
      texture.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const hit = raycaster.intersectObject(board)[0];
const uv = { x: (hit.point.x + 2.2) / 4.4, y: (hit.point.y + 1.6) / 3.2 };
marker.position.copy(hit.point);`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
