import * as EASEL from "@/index.js";

export const meta = {
  id: "hello-animation",
  name: "Hello Animation",
  category: "getting-started",
  description: "Rotate, bounce, and scale a cube using clock.delta.",
};

export const controls = [
  {
    type: "slider",
    key: "speed",
    label: "Speed",
    min: 0.1,
    max: 3,
    step: 0.1,
    default: 1,
  },
];

export function setup(canvas, params = {}) {
  const width = canvas.width;
  const height = canvas.height;

  const scene = new EASEL.Scene();
  const camera = new EASEL.PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 0, 5);

  const renderer = new EASEL.Renderer({ canvas, width, height });

  scene.add(new EASEL.AmbientLight(0xffffff, 0.3));
  const light = new EASEL.DirectionalLight(0xffffff, 0.9);
  light.position.set(3, 5, 4);
  scene.add(light);

  const box = new EASEL.Mesh(
    new EASEL.BoxGeometry(1, 1, 1),
    new EASEL.LambertMaterial({ color: 0x4488ff }),
  );
  scene.add(box);

  const clock = new EASEL.Clock();
  let elapsed = 0;
  let speed = params.speed ?? 1;
  let animId;

  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.delta;
    elapsed += dt * speed;

    box.rotation.y = elapsed;
    box.position.y = Math.sin(elapsed * 2) * 0.5;
    const s = 1 + Math.sin(elapsed * 3) * 0.15;
    box.scale.set(s, s, s);

    renderer.render(scene, camera);
  }
  animate();

  return {
    cleanup() {
      if (animId !== undefined) cancelAnimationFrame(animId);
    },
    update(newParams) {
      if (newParams.speed !== undefined) speed = newParams.speed;
    },
  };
}

export const easelSource = `import * as EASEL from "easel";

const box = new EASEL.Mesh(
  new EASEL.BoxGeometry(1, 1, 1),
  new EASEL.LambertMaterial({ color: 0x4488ff }),
);
scene.add(box);

const clock = new EASEL.Clock();
let elapsed = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.delta;
  elapsed += dt;

  box.rotation.y = elapsed;

  box.position.y = Math.sin(elapsed * 2) * 0.5;

  const s = 1 + Math.sin(elapsed * 3) * 0.15;
  box.scale.set(s, s, s);

  renderer.render(scene, camera);
}
animate();`;

export const threeSource = `import * as THREE from "three";

const box = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshLambertMaterial({ color: 0x4488ff }),
);
scene.add(box);

const clock = new THREE.Clock();
let elapsed = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  elapsed += dt;

  box.rotation.y = elapsed;

  box.position.y = Math.sin(elapsed * 2) * 0.5;

  const s = 1 + Math.sin(elapsed * 3) * 0.15;
  box.scale.set(s, s, s);

  renderer.render(scene, camera);
}
animate();`;
