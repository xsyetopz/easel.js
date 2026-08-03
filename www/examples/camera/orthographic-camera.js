import * as EASEL from "@/index.js";

export const meta = {
  id: "orthographic-camera",
  name: "Orthographic Camera",
  category: "camera",
  description:
    "Parallel projection: objects stay the same size regardless of depth.",
};

export const controls = [
  {
    type: "slider",
    key: "size",
    label: "Frustum Size",
    min: 2,
    max: 20,
    step: 0.5,
    default: 5,
  },
];

export function setup(canvas, params = {}) {
  const width = canvas.width;
  const height = canvas.height;
  const aspect = width / height;

  let size = params.size ?? 5;

  const scene = new EASEL.Scene();

  const camera = new EASEL.OrthographicCamera({
    left: -size * aspect,
    right: size * aspect,
    top: size,
    bottom: -size,
    near: 0.1,
    far: 100,
  });
  camera.position.set(5, 4, 8);
  camera.lookAt(new EASEL.Vector3(0, 0, 0));

  const renderer = new EASEL.Renderer({ canvas, width, height });

  scene.add(new EASEL.AmbientLight(0xffffff, 0.4));
  const dirLight = new EASEL.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 8, 6);
  scene.add(dirLight);

  const colors = [0xe05555, 0x55aa55, 0x5588e0, 0xddaa22];
  const positions = [
    [-3, 0, -3],
    [0, 0, 0],
    [3, 0, 3],
    [0, 2, 0],
  ];

  const meshes = positions.map(([x, y, z], i) => {
    const mesh = new EASEL.Mesh(
      new EASEL.BoxGeometry(1, 1, 1),
      new EASEL.LambertMaterial({ color: colors[i] }),
    );
    mesh.position.set(x, y, z);
    scene.add(mesh);
    return mesh;
  });

  const clock = new EASEL.Clock();
  let animId;

  function updateCamera() {
    const s = size;
    camera.left = -s * aspect;
    camera.right = s * aspect;
    camera.top = s;
    camera.bottom = -s;
    camera.updateProjectionMatrix();
  }

  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.delta;
    for (const mesh of meshes) {
      mesh.rotation.y += 0.5 * dt;
    }
    renderer.render(scene, camera);
  }
  animate();

  return {
    cleanup() {
      if (animId !== undefined) cancelAnimationFrame(animId);
    },
    update(newParams) {
      if (newParams.size !== undefined) {
        size = newParams.size;
        updateCamera();
      }
    },
  };
}

export const easelSource = `import * as EASEL from "easel";

const camera = new EASEL.OrthographicCamera({
  left:   -size * aspect,
  right:   size * aspect,
  top:     size,
  bottom: -size,
  near: 0.1,
  far: 100,
});

camera.left = -newSize * aspect;
camera.right =  newSize * aspect;
camera.top    =  newSize;
camera.bottom = -newSize;
camera.updateProjectionMatrix();

const renderer = new EASEL.Renderer({ canvas, width: 800, height: 600 });
renderer.render(scene, camera);`;

export const threeSource = `import * as THREE from "three";

const camera = new THREE.OrthographicCamera(
  -size * aspect,
   size * aspect,
   size,
  -size,
  0.1,
  100,
);

camera.left   = -newSize * aspect;
camera.right  =  newSize * aspect;
camera.top    =  newSize;
camera.bottom = -newSize;
camera.updateProjectionMatrix();

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(800, 600);
renderer.render(scene, camera);`;
