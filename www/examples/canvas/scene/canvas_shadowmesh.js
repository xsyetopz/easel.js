import {
  AmbientLight,
  BasicMaterial,
  CircleGeometry,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Renderer,
  Scene,
  Side,
  SphereGeometry,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_shadowmesh",
  name: "Shadow Mesh Approximation",
  category: "canvas",
  description:
    "A flattened translucent CPU disc follows a sphere as a baked shadow blob instead of a shadow map.",
};

export const controls = [];

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x151923;
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(4.6, 3.4, 6.5);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.35));
  const light = new DirectionalLight(0xfff4d6, 0.95);
  light.position.set(-4, 7, 4);
  scene.add(light);
  const floor = new Mesh(
    new PlaneGeometry(10, 10),
    new LambertMaterial({ color: 0x6f7d69 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1;
  scene.add(floor);

  const shadow = new Mesh(
    new CircleGeometry(1, 32),
    new BasicMaterial({
      color: 0x18202a,
      opacity: 5,
      transparent: true,
      side: Side.Double,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.96;
  scene.add(shadow);
  const ball = new Mesh(
    new SphereGeometry(0.85, 18, 12),
    new LambertMaterial({ color: 0xe57a5d }),
  );
  scene.add(ball);
  const clock = new Timer();
  let animationFrame;
  function animate(timestamp) {
    animationFrame = requestAnimationFrame(animate);
    clock.update(timestamp);
    ball.position.x = Math.sin(clock.elapsedTime * 0.85) * 1.7;
    ball.position.y = 0.2 + Math.abs(Math.sin(clock.elapsedTime * 0.85)) * 1.3;
    ball.position.z = Math.cos(clock.elapsedTime * 0.85) * 0.8;
    shadow.position.x = ball.position.x;
    shadow.position.z = ball.position.z;
    const height = Math.max(0.05, ball.position.y + 1);
    shadow.scale.set(1.1 + height * 0.28, 0.65 + height * 0.18, 1);
    shadow.material.opacity = Math.min(7, 4 + Math.round(height * 0.8));
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

const shadow = new EASEL.Mesh(new EASEL.CircleGeometry(1, 32),
  new EASEL.BasicMaterial({ color: 0x18202a, opacity: 5, transparent: true }));
shadow.rotation.x = -Math.PI / 2;
shadow.position.set(ball.position.x, -0.96, ball.position.z);`;

export const threeSource = `import * as THREE from "three";

const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 32),
  new THREE.MeshBasicMaterial({ color: 0x18202a, transparent: true, opacity: 0.35 }));
shadow.rotation.x = -Math.PI / 2;
ball.castShadow = true;
renderer.shadowMap.enabled = true;`;

export const example = { meta, controls, setup, easelSource, threeSource };
