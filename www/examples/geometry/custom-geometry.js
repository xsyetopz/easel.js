import * as EASEL from "@/index.js";

export const meta = {
  id: "custom-geometry",
  name: "Custom Geometry",
  category: "geometry",
  description:
    "Build geometry from raw vertex data using Attribute and Geometry.",
};

export const controls = [];

/**
 * @param {HTMLCanvasElement} canvas
 */
export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;

  const scene = new EASEL.Scene();
  const camera = new EASEL.PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 1.5, 5);
  camera.lookAt(new EASEL.Vector3(0, 0, 0));

  const renderer = new EASEL.Renderer({ canvas, width, height });

  scene.add(new EASEL.AmbientLight(0xffffff, 0.4));
  const light = new EASEL.DirectionalLight(0xffffff, 0.8);
  light.position.set(3, 5, 4);
  scene.add(light);

  // Build a diamond shape from raw vertices
  // prettier-ignore
  const positions = new Float32Array([
    0.0,
    1.5,
    0.0, // 0: top
    -1.0,
    0.0,
    1.0, // 1: front-left
    1.0,
    0.0,
    1.0, // 2: front-right
    1.0,
    0.0,
    -1.0, // 3: back-right
    -1.0,
    0.0,
    -1.0, // 4: back-left
    0.0,
    -1.5,
    0.0, // 5: bottom
  ]);

  // prettier-ignore
  const indices = [
    // top faces
    0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1,
    // bottom faces
    5, 2, 1, 5, 3, 2, 5, 4, 3, 5, 1, 4,
  ];

  const geometry = new EASEL.Geometry();
  geometry.setAttribute("position", new EASEL.Attribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const mesh = new EASEL.Mesh(
    geometry,
    new EASEL.LambertMaterial({ color: 0xe0a040 }),
  );
  scene.add(mesh);

  const clock = new EASEL.Clock();
  let animId;

  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.delta;
    mesh.rotation.y += 0.6 * dt;
    renderer.render(scene, camera);
  }
  animate();

  return {
    cleanup() {
      if (animId !== undefined) cancelAnimationFrame(animId);
    },
  };
}

export const easelSource = `import * as EASEL from "easel";

const positions = new Float32Array([
   0.0,  1.5,  0.0,
  -1.0,  0.0,  1.0,
   1.0,  0.0,  1.0,
   1.0,  0.0, -1.0,
  -1.0,  0.0, -1.0,
   0.0, -1.5,  0.0,
]);

const indices = [
  0,1,2, 0,2,3, 0,3,4, 0,4,1,
  5,2,1, 5,3,2, 5,4,3, 5,1,4,
];

const geometry = new EASEL.Geometry();
geometry.setAttribute("position", new EASEL.Attribute(positions, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();

const mesh = new EASEL.Mesh(
  geometry,
  new EASEL.LambertMaterial({ color: 0xe0a040 }),
);
scene.add(mesh);`;

export const threeSource = `import * as THREE from "three";

const positions = new Float32Array([
   0.0,  1.5,  0.0,
  -1.0,  0.0,  1.0,
   1.0,  0.0,  1.0,
   1.0,  0.0, -1.0,
  -1.0,  0.0, -1.0,
   0.0, -1.5,  0.0,
]);

const indices = [
  0,1,2, 0,2,3, 0,3,4, 0,4,1,
  5,2,1, 5,3,2, 5,4,3, 5,1,4,
];

const geometry = new THREE.BufferGeometry();
geometry.setAttribute("position",
  new THREE.BufferAttribute(positions, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();

const mesh = new THREE.Mesh(
  geometry,
  new THREE.MeshLambertMaterial({ color: 0xe0a040 }),
);
scene.add(mesh);`;
