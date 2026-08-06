import {
  BasicMaterial,
  BoxGeometry,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Side,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_panorama_cube",
  name: "Cube Panorama",
  category: "canvas",
  description:
    "An authored six-sided room substitutes for a CubeTexture/environment map while remaining a CPU scene.",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x090d16;
  const camera = new PerspectiveCamera({
    fov: 72,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 0, 0);
  camera.lookAt(new Vector3(0, 0, -1));
  const renderer = new Renderer({ canvas, width, height });

  const panels = [
    [0x3b5e8f, [0, 0, -4], [0, 0, 0]],
    [0x9d633e, [0, 0, 4], [0, 0, 0]],
    [0x5b8a65, [-4, 0, 0], [0, Math.PI / 2, 0]],
    [0x7a4f78, [4, 0, 0], [0, Math.PI / 2, 0]],
    [0x4f704a, [0, -4, 0], [Math.PI / 2, 0, 0]],
    [0x8c6e42, [0, 4, 0], [Math.PI / 2, 0, 0]],
  ];
  for (const [color, position, rotation] of panels) {
    const panel = new Mesh(
      new BoxGeometry(8, 8, 0.08),
      new BasicMaterial({ color, side: Side.Double }),
    );
    panel.position.set(...position);
    panel.rotation.set(...rotation);
    scene.add(panel);
  }
  const clock = new Timer();
  let animationFrame;
  function animate(timestamp) {
    animationFrame = requestAnimationFrame(animate);
    clock.update(timestamp);
    camera.rotation.y = clock.elapsedTime * 0.12;
    camera.rotation.x = Math.sin(clock.elapsedTime * 0.23) * 0.08;
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

for (const [color, position, rotation] of panels) {
  const panel = new EASEL.Mesh(
    new EASEL.BoxGeometry(8, 8, 0.08),
    new EASEL.BasicMaterial({ color, side: EASEL.Side.Double }),
  );
  panel.position.set(...position);
  panel.rotation.set(...rotation);
  scene.add(panel);
}`;

export const threeSource = `import * as THREE from "three";

const textures = getTexturesFromAtlasFile("textures/cube/sun_temple_stripe.jpg", 6);
const materials = textures.map((texture) =>
  new THREE.MeshBasicMaterial({ map: texture }),
);
const skyBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), materials);
skyBox.geometry.scale(1, 1, -1);
scene.add(skyBox);`;

export const example = { meta, controls, setup, easelSource, threeSource };
