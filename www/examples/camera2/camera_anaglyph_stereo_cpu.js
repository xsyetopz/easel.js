import {
  AmbientLight,
  BasicMaterial,
  BoxGeometry,
  Color,
  DirectionalLight,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "camera_anaglyph_stereo_cpu",
  name: "Anaglyph Stereo (CPU Canvas2D)",
  category: "camera2",
  description:
    "CPU Canvas2D anaglyph stereo rendering: two offset perspective passes composited into a red-cyan image. No WebGL stereo buffer.",
  gpuOnly: false,
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = new Color(0x000000);
  const renderer = new Renderer({ canvas, width, height });

  scene.add(new AmbientLight(0xffffff, 0.5));
  const key = new DirectionalLight(0xffffff, 0.8);
  key.position.set(4, 5, 6);
  scene.add(key);

  const cube = new Mesh(
    new BoxGeometry(2, 2, 2),
    new BasicMaterial({ color: 0xffffff }),
  );
  scene.add(cube);

  let eyeSeparation = 0.3;
  const focalLength = 10;
  let animationFrame;
  const clock = new Timer();

  function animate(timestamp) {
    animationFrame = requestAnimationFrame(animate);
    clock.update(timestamp);
    cube.rotation.y += clock.delta * 0.5;
    cube.rotation.x += clock.delta * 0.3;

    const halfSep = eyeSeparation / 2;
    const leftCamera = new PerspectiveCamera({
      fov: 45,
      aspect: width / height,
      near: 0.1,
      far: 100,
    });
    leftCamera.position.set(-halfSep, 0, focalLength);
    leftCamera.lookAt(new Vector3(0, 0, 0));

    const rightCamera = new PerspectiveCamera({
      fov: 45,
      aspect: width / height,
      near: 0.1,
      far: 100,
    });
    rightCamera.position.set(halfSep, 0, focalLength);
    rightCamera.lookAt(new Vector3(0, 0, 0));

    renderer.render(scene, leftCamera);
    const leftData = renderer.ctx.getImageData(0, 0, width, height);
    renderer.render(scene, rightCamera);
    const rightData = renderer.ctx.getImageData(0, 0, width, height);

    const ctx2d = canvas.getContext("2d");
    const anaglyph = ctx2d.createImageData(width, height);
    for (let i = 0; i < leftData.data.length; i += 4) {
      anaglyph.data[i] = leftData.data[i];
      anaglyph.data[i + 1] = rightData.data[i + 1];
      anaglyph.data[i + 2] = rightData.data[i + 2];
      anaglyph.data[i + 3] = 255;
    }
    ctx2d.putImageData(anaglyph, 0, 0);
  }
  animate();

  return {
    cleanup() {
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
// Anaglyph stereo projection
const camera = new EASEL.PerspectiveCamera({ fov: 45 });`;

export const threeSource = `import * as THREE from "three";
// Anaglyph stereo projection
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);`;

export const example = { meta, controls, setup, easelSource, threeSource };
