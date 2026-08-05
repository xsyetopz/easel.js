import * as EASEL from "@/index.js";

export const meta = {
  id: "geometry-parameters",
  name: "Geometry Parameters",
  category: "geometry",
  description: "Adjust segment count on Sphere, Torus, Cylinder, and Cone.",
};

export const controls = [
  {
    type: "slider",
    key: "segments",
    label: "Segments",
    min: 4,
    max: 64,
    step: 1,
    default: 16,
  },
];

function buildGeometry(shape, segments) {
  switch (shape) {
    case "Torus":
      return new EASEL.TorusGeometry(0.9, 0.35, segments, segments * 2);
    case "Cylinder":
      return new EASEL.CylinderGeometry(0.7, 0.7, 1.8, segments);
    case "Cone":
      return new EASEL.ConeGeometry(0.9, 1.8, segments);
    default:
      return new EASEL.SphereGeometry(
        1.1,
        segments,
        Math.max(3, Math.floor(segments * 0.75)),
      );
  }
}

const SHAPES = ["Sphere", "Torus", "Cylinder", "Cone"];
const COLS = 2;
const SPACING = 3.5;

/**
 * @param {HTMLCanvasElement} canvas
 * @param {Record<string, unknown>} [params]
 */
export function setup(canvas, params = {}) {
  const width = canvas.width;
  const height = canvas.height;
  const aspect = width / height;
  const size = 5;

  const scene = new EASEL.Scene();
  const camera = new EASEL.OrthographicCamera({
    left: -size * aspect,
    right: size * aspect,
    top: size,
    bottom: -size,
    near: 0.1,
    far: 100,
  });
  camera.position.z = 8;

  const renderer = new EASEL.Renderer({ canvas, width, height });

  scene.add(new EASEL.AmbientLight(0xffffff, 0.4));
  const dirLight = new EASEL.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(3, 5, 4);
  scene.add(dirLight);

  const colors = [0x5577dd, 0xe07050, 0x50c080, 0xd0a030];
  let currentSegments = params.segments ?? 16;

  /** @type {EASEL.Mesh[]} */
  let meshes = [];

  function buildGrid(segments) {
    for (const m of meshes) scene.remove(m);
    meshes = [];

    for (let i = 0; i < SHAPES.length; i++) {
      const shape = SHAPES[i];
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const mesh = new EASEL.Mesh(
        buildGeometry(shape, segments),
        new EASEL.LambertMaterial({ color: colors[i] }),
      );
      mesh.position.x = (col - (COLS - 1) / 2) * SPACING;
      mesh.position.y = -(row - 0.5) * SPACING;
      scene.add(mesh);
      meshes.push(mesh);
    }
  }

  buildGrid(currentSegments);

  const clock = new EASEL.Timer();
  let animId;

  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.update().delta;
    for (const mesh of meshes) {
      mesh.rotation.y += 0.5 * dt;
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
      if (newParams.segments !== undefined) {
        currentSegments = newParams.segments;
        buildGrid(currentSegments);
      }
    },
  };
}

export const easelSource = `import * as EASEL from "easel";

const scene = new EASEL.Scene();
const size = 5;
const camera = new EASEL.OrthographicCamera({
  left: -size * aspect,
  right: size * aspect,
  top: size,
  bottom: -size,
  near: 0.1,
  far: 100,
});

function buildGeometry(shape, segments) {
  if (shape === "Torus")
    return new EASEL.TorusGeometry(0.9, 0.35, segments, segments * 2);
  if (shape === "Cylinder")
    return new EASEL.CylinderGeometry(0.7, 0.7, 1.8, segments);
  if (shape === "Cone")
    return new EASEL.ConeGeometry(0.9, 1.8, segments);
  return new EASEL.SphereGeometry(1.1, segments, Math.floor(segments * 0.75));
}

scene.remove(mesh);
mesh = new EASEL.Mesh(buildGeometry(shape, segments), material);
scene.add(mesh);`;

export const threeSource = `import * as THREE from "three";

const scene = new THREE.Scene();
const size = 5;
const camera = new THREE.OrthographicCamera(
  -size * aspect,
  size * aspect,
  size,
  -size,
  0.1,
  100,
);

function buildGeometry(shape, segments) {
  if (shape === "Torus")
    return new THREE.TorusGeometry(0.9, 0.35, segments, segments * 2);
  if (shape === "Cylinder")
    return new THREE.CylinderGeometry(0.7, 0.7, 1.8, segments);
  if (shape === "Cone")
    return new THREE.ConeGeometry(0.9, 1.8, segments);
  return new THREE.SphereGeometry(1.1, segments, Math.floor(segments * 0.75));
}

scene.remove(mesh);
mesh = new THREE.Mesh(buildGeometry(shape, segments), material);
scene.add(mesh);`;
