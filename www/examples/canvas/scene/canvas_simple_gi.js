import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  HemisphereLight,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Renderer,
  Scene,
  SphereGeometry,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_simple_gi",
  name: "Simple Indirect Light",
  category: "canvas",
  description:
    "Baked hemisphere and fill lights approximate a simple-GI scene without light probes, render targets, or bounce passes.",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x18202b;
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(5, 3.8, 7);
  camera.lookAt(new Vector3(0, 0.7, 0));
  const renderer = new Renderer({ canvas, width, height });

  scene.add(new HemisphereLight(0x9bc8ff, 0x483c36, 0.9));
  scene.add(new AmbientLight(0xffffff, 0.2));
  const key = new DirectionalLight(0xffe1b5, 0.7);
  key.position.set(4, 6, 5);
  scene.add(key);
  const floor = new Mesh(
    new PlaneGeometry(12, 12),
    new LambertMaterial({ color: 0x566a58 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1;
  scene.add(floor);
  const objects = [
    [new BoxGeometry(1.6, 1.6, 1.6), 0xd56c54, -1.9],
    [new SphereGeometry(0.95, 18, 12), 0x5ca7d5, 0],
    [new BoxGeometry(1.4, 2.2, 1.4), 0xd5ad52, 1.9],
  ].map(([geometry, color, x]) => {
    const mesh = new Mesh(geometry, new LambertMaterial({ color }));
    mesh.position.set(x, 0, 0);
    scene.add(mesh);
    return mesh;
  });
  const clock = new Timer();
  let animationFrame;
  function animate(timestamp) {
    animationFrame = requestAnimationFrame(animate);
    clock.update(timestamp);
    for (const [index, mesh] of objects.entries()) {
      mesh.rotation.y += clock.delta * (0.16 + index * 0.06);
      mesh.position.y = Math.sin(clock.elapsedTime * 0.7 + index * 0.8) * 0.06;
    }
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

scene.add(new EASEL.HemisphereLight(0x9bc8ff, 0x483c36, 0.9));
scene.add(new EASEL.AmbientLight(0xffffff, 0.2));
scene.add(new EASEL.DirectionalLight(0xffe1b5, 0.7));`;

export const threeSource = `import * as THREE from "three";

scene.add(new THREE.HemisphereLight(0x9bc8ff, 0x483c36, 0.9));
scene.add(new THREE.LightProbe());
renderer.setRenderTarget(giTarget);`;

export const example = { meta, controls, setup, easelSource, threeSource };
