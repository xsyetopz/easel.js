import * as EASEL from "@/index.js";

export const meta = {
  id: "toon-shading",
  name: "Toon Shading",
  category: "materials",
  description:
    "Four ToonMaterial spheres with different colors showing cel/stepped shading.",
};

export const controls = [
  {
    type: "slider",
    key: "intensity",
    label: "Light Intensity",
    min: 0,
    max: 2,
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
  camera.position.z = 8;

  const renderer = new EASEL.Renderer({ canvas, width, height });

  scene.add(new EASEL.AmbientLight(0xffffff, 0.2));
  const dirLight = new EASEL.DirectionalLight(0xffffff, params.intensity ?? 1);
  dirLight.position.set(4, 6, 5);
  scene.add(dirLight);

  const colors = [0xe05050, 0x50b050, 0x5080e0, 0xe0b040];
  const spacing = 2.2;
  /** @type {EASEL.Mesh[]} */
  const meshes = [];

  for (let i = 0; i < colors.length; i++) {
    const color = colors[i];
    const mesh = new EASEL.Mesh(
      new EASEL.SphereGeometry(0.9, 24, 16),
      new EASEL.ToonMaterial({ color }),
    );
    mesh.position.x = (i - (colors.length - 1) / 2) * spacing;
    scene.add(mesh);
    meshes.push(mesh);
  }

  const clock = new EASEL.Timer();
  let animId;

  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.update().delta;
    for (const mesh of meshes) {
      mesh.rotation.y += 0.4 * dt;
    }
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();

  return {
    cleanup() {
      if (animId !== undefined) cancelAnimationFrame(animId);
    },
    update(newParams) {
      if (newParams.intensity !== undefined) {
        dirLight.intensity = newParams.intensity;
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

scene.add(new EASEL.AmbientLight(0xffffff, 0.2));
const dirLight = new EASEL.DirectionalLight(0xffffff, 1);
dirLight.position.set(4, 6, 5);
scene.add(dirLight);

const colors = [0xe05050, 0x50b050, 0x5080e0, 0xe0b040];
for (let i = 0; i < colors.length; i++) {
  const color = colors[i];
  const mesh = new EASEL.Mesh(
    new EASEL.SphereGeometry(0.9, 24, 16),
    new EASEL.ToonMaterial({ color }),
  );
  mesh.position.x = (i - 1.5) * 2.2;
  scene.add(mesh);
}`;

export const threeSource = `import * as THREE from "three";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);

scene.add(new THREE.AmbientLight(0xffffff, 0.2));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(4, 6, 5);
scene.add(dirLight);

const colors = [0xe05050, 0x50b050, 0x5080e0, 0xe0b040];
for (let i = 0; i < colors.length; i++) {
  const color = colors[i];
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 24, 16),
    new THREE.MeshToonMaterial({ color }),
  );
  mesh.position.x = (i - 1.5) * 2.2;
  scene.add(mesh);
}`;
