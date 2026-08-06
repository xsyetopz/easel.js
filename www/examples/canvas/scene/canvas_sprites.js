import {
  BasicMaterial,
  DataTexture,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Renderer,
  Scene,
  Side,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_sprites",
  name: "Mesh Billboards",
  category: "canvas",
  description:
    "Textured PlaneGeometry billboards provide a traversable CPU replacement for the source Sprite cloud.",
};

export const controls = [];

function spriteTexture(size = 32) {
  const data = new Uint8ClampedArray(size * size * 4);
  const center = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const distance = Math.hypot(x - center, y - center) / center;
      const offset = (y * size + x) * 4;
      const alpha = distance < 1 ? 255 : 0;
      data[offset] = 245;
      data[offset + 1] = Math.round(125 + (1 - distance) * 100);
      data[offset + 2] = 75;
      data[offset + 3] = alpha;
    }
  }
  return new DataTexture(data, size, size);
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x0c121e;
  const camera = new PerspectiveCamera({
    fov: 48,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 1.1, 8);
  camera.lookAt(new Vector3(0, 0.5, 0));
  const renderer = new Renderer({ canvas, width, height });

  const texture = spriteTexture();
  const material = new BasicMaterial({
    map: texture,
    side: Side.Double,
    transparent: true,
    opacity: 2,
    depthWrite: false,
  });
  const sprites = [];
  for (let index = 0; index < 11; index++) {
    const sprite = new Mesh(new PlaneGeometry(1.1, 1.1), material);
    const angle = index * 2.39996;
    const radius = 1.1 + (index % 4) * 0.55;
    sprite.position.set(
      Math.cos(angle) * radius,
      0.2 + (index % 3) * 0.75,
      Math.sin(angle) * radius - 0.5,
    );
    scene.add(sprite);
    sprites.push(sprite);
  }
  const clock = new Timer();
  let animationFrame;
  function animate(timestamp) {
    animationFrame = requestAnimationFrame(animate);
    clock.update(timestamp);
    for (const [index, sprite] of sprites.entries()) {
      sprite.lookAt(camera.position);
      sprite.rotation.z = Math.sin(clock.elapsedTime * 1.1 + index) * 0.13;
      sprite.scale.setScalar(
        0.9 + Math.sin(clock.elapsedTime * 0.8 + index) * 0.12,
      );
    }
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
      texture.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const billboard = new EASEL.Mesh(new EASEL.PlaneGeometry(1.1, 1.1), material);
billboard.lookAt(camera.position);
scene.add(billboard);`;

export const threeSource = `import * as THREE from "three";

const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
sprite.center.set(0.5, 0.5);
scene.add(sprite);`;

export const example = { meta, controls, setup, easelSource, threeSource };
