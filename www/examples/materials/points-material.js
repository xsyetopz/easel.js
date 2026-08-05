import * as EASEL from "@/index.js";

export const meta = {
  id: "points-material",
  name: "Points Material",
  category: "materials",
  description: "Point rendering mode with adjustable point radius.",
};

export const controls = [
  {
    type: "slider",
    key: "pointRadius",
    label: "Point Radius",
    min: 1,
    max: 8,
    step: 1,
    default: 3,
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
    fov: 50,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.z = 6;

  const renderer = new EASEL.Renderer({ canvas, width, height });

  scene.add(new EASEL.AmbientLight(0xffffff, 0.5));

  let currentRadius = params.pointRadius ?? 3;
  const material = new EASEL.PointsMaterial({
    color: 0x66bbff,
    size: currentRadius,
  });

  const geometry = new EASEL.SphereGeometry(2, 24, 18);
  const points = new EASEL.Points(geometry, material);
  scene.add(points);

  const clock = new EASEL.Timer();
  let animId;

  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.update().delta;
    points.rotation.y += 0.4 * dt;
    points.rotation.x += 0.15 * dt;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();

  return {
    cleanup() {
      if (animId !== undefined) cancelAnimationFrame(animId);
    },
    update(newParams) {
      if (
        newParams.pointRadius !== undefined &&
        newParams.pointRadius !== currentRadius
      ) {
        currentRadius = newParams.pointRadius;
        material.size = currentRadius;
      }
    },
  };
}

export const easelSource = `import * as EASEL from "easel";

const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
  fov: 50, aspect: width / height, near: 0.1, far: 100,
});
camera.position.z = 6;

const renderer = new EASEL.Renderer({ canvas, width, height });
scene.add(new EASEL.AmbientLight(0xffffff, 0.5));

const material = new EASEL.PointsMaterial({ color: 0x66bbff, size: 3 });
const geometry = new EASEL.SphereGeometry(2, 24, 18);

const points = new EASEL.Points(geometry, material);
scene.add(points);`;

export const threeSource = `import * as THREE from "three";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
camera.position.z = 6;

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(width, height);

const material = new THREE.PointsMaterial({ color: 0x66bbff, size: 0.1 });
const geometry = new THREE.SphereGeometry(2, 24, 18);
const points = new THREE.Points(geometry, material);
scene.add(points);`;
