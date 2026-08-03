import * as EASEL from "@/index.js";

export const meta = {
  id: "point-lights",
  name: "Point Lights",
  category: "lights",
  description:
    "Three colored PointLights orbiting a TorusKnot at different radii and speeds.",
};

export const controls = [
  {
    type: "slider",
    key: "intensity",
    label: "Light Intensity",
    min: 0,
    max: 3,
    step: 0.05,
    default: 1.5,
  },
  {
    type: "slider",
    key: "speed",
    label: "Orbit Speed",
    min: 0.1,
    max: 3,
    step: 0.05,
    default: 1,
  },
];

/**
 * @param {HTMLCanvasElement} canvas
 * @param {Record<string, unknown>} [params]
 */
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
  camera.position.set(0, 3, 10);
  camera.lookAt(new EASEL.Vector3(0, 0, 0));

  const renderer = new EASEL.Renderer({ canvas, width, height });

  scene.add(new EASEL.AmbientLight(0xffffff, 0.1));

  const knot = new EASEL.Mesh(
    new EASEL.TorusKnotGeometry(2, 0.6, 128, 16),
    new EASEL.LambertMaterial({ color: 0xdddddd }),
  );
  scene.add(knot);

  const ground = new EASEL.Mesh(
    new EASEL.PlaneGeometry(20, 20),
    new EASEL.LambertMaterial({ color: 0x444444 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -3;
  scene.add(ground);

  const intensity = params.intensity ?? 1.5;
  const red = new EASEL.PointLight(0xff0000, intensity, 20, 2);
  const green = new EASEL.PointLight(0x00ff00, intensity, 20, 2);
  const blue = new EASEL.PointLight(0x0000ff, intensity, 20, 2);
  scene.add(red);
  scene.add(green);
  scene.add(blue);

  const lights = [red, green, blue];

  const clock = new EASEL.Clock();
  let elapsed = 0;
  let animId;
  let currentSpeed = params.speed ?? 1;
  let currentIntensity = intensity;

  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.delta;
    elapsed += dt;

    const speed = currentSpeed;
    lights[0].position.set(
      Math.cos(elapsed * speed) * 4,
      2,
      Math.sin(elapsed * speed) * 4,
    );
    lights[1].position.set(
      Math.cos(elapsed * speed * 0.7 + 2) * 5,
      1,
      Math.sin(elapsed * speed * 0.7 + 2) * 5,
    );
    lights[2].position.set(
      Math.cos(elapsed * speed * 1.3 + 4) * 3,
      3,
      Math.sin(elapsed * speed * 1.3 + 4) * 3,
    );

    renderer.render(scene, camera);
  }
  animate();

  return {
    cleanup() {
      if (animId !== undefined) cancelAnimationFrame(animId);
    },
    update(newParams) {
      if (newParams.intensity !== undefined) {
        currentIntensity = /** @type {number} */ (newParams.intensity);
        for (const light of lights) {
          light.intensity = currentIntensity;
        }
      }
      if (newParams.speed !== undefined) {
        currentSpeed = /** @type {number} */ (newParams.speed);
      }
    },
  };
}

export const easelSource = `import * as EASEL from "easel";

const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
  fov: 45,
  aspect: width / height,
  near: 0.1,
  far: 100,
});
camera.position.set(0, 3, 10);
camera.lookAt(new EASEL.Vector3(0, 0, 0));

scene.add(new EASEL.AmbientLight(0xffffff, 0.1));

const knot = new EASEL.Mesh(
  new EASEL.TorusKnotGeometry(2, 0.6, 128, 16),
  new EASEL.LambertMaterial({ color: 0xdddddd }),
);
scene.add(knot);

const red   = new EASEL.PointLight(0xff0000, 1.5, 20, 2);
const green = new EASEL.PointLight(0x00ff00, 1.5, 20, 2);
const blue  = new EASEL.PointLight(0x0000ff, 1.5, 20, 2);

let t = 0;
function animate() {
  t += clock.delta;
  red.position.set(Math.cos(t) * 4, 2, Math.sin(t) * 4);
  green.position.set(Math.cos(t * 0.7 + 2) * 5, 1, Math.sin(t * 0.7 + 2) * 5);
  blue.position.set(Math.cos(t * 1.3 + 4) * 3, 3, Math.sin(t * 1.3 + 4) * 3);
  renderer.render(scene, camera);
}`;

export const threeSource = `import * as THREE from "three";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
camera.position.set(0, 3, 10);
camera.lookAt(new THREE.Vector3(0, 0, 0));

scene.add(new THREE.AmbientLight(0xffffff, 0.1));

const knot = new THREE.Mesh(
  new THREE.TorusKnotGeometry(2, 0.6, 128, 16),
  new THREE.MeshLambertMaterial({ color: 0xdddddd }),
);
scene.add(knot);

const red   = new THREE.PointLight(0xff0000, 1.5, 20, 2);
const green = new THREE.PointLight(0x00ff00, 1.5, 20, 2);
const blue  = new THREE.PointLight(0x0000ff, 1.5, 20, 2);

const clock = new THREE.Clock();
let t = 0;
function animate() {
  t += clock.getDelta();
  red.position.set(Math.cos(t) * 4, 2, Math.sin(t) * 4);
  green.position.set(Math.cos(t * 0.7 + 2) * 5, 1, Math.sin(t * 0.7 + 2) * 5);
  blue.position.set(Math.cos(t * 1.3 + 4) * 3, 3, Math.sin(t * 1.3 + 4) * 3);
  renderer.render(scene, camera);
}`;
