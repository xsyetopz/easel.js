import * as EASEL from "@/index.js";

export const meta = {
  id: "click-events",
  name: "Click Events",
  category: "interactive",
  description: "Click an object to select it. Click again to deselect.",
};

export const controls = [];

const COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c];
const SELECTED_COLOR = 0xffffff;

export function setup(canvas, _params = {}) {
  const width = canvas.width;
  const height = canvas.height;

  const scene = new EASEL.Scene();
  const camera = new EASEL.PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 2, 10);

  const renderer = new EASEL.Renderer({ canvas, width, height });

  scene.add(new EASEL.AmbientLight(0xffffff, 0.4));
  const dirLight = new EASEL.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 8, 6);
  scene.add(dirLight);

  /** @type {EASEL.Mesh[]} */
  const meshes = [];
  /** @type {Map<EASEL.Mesh, number>} */
  const baseColors = new Map();

  for (let i = 0; i < COLORS.length; i++) {
    const color = COLORS[i];
    const mesh = new EASEL.Mesh(
      new EASEL.BoxGeometry(1.2, 1.2, 1.2),
      new EASEL.LambertMaterial({ color }),
    );
    const angle = (i / COLORS.length) * Math.PI * 2;
    mesh.position.set(Math.cos(angle) * 3.2, 0, Math.sin(angle) * 3.2);
    scene.add(mesh);
    meshes.push(mesh);
    baseColors.set(mesh, color);
  }

  const raycaster = new EASEL.Raycaster();
  /** @type {EASEL.Mesh|null} */
  let selectedMesh = null;

  function getCameraForRaycaster() {
    camera.updateMatrixWorld();
    const projInv = new EASEL.Matrix4().copy(camera.projectionMatrix).invert();
    return {
      type: camera.type,
      matrixWorld: camera.matrixWorld,
      projectionMatrixInverse: projInv,
    };
  }

  function onClick(event) {
    const x = (event.offsetX / canvas.clientWidth) * 2 - 1;
    const y = -(event.offsetY / canvas.clientHeight) * 2 + 1;

    raycaster.setFromCamera({ x, y }, getCameraForRaycaster());
    const hits = raycaster.intersectObjects(meshes);
    const hit =
      hits.length > 0 ? /** @type {EASEL.Mesh} */ (hits[0].object) : null;

    if (selectedMesh !== null) {
      const orig = baseColors.get(selectedMesh) ?? 0xffffff;
      selectedMesh.material.color.set(orig);
    }

    if (hit !== null && hit !== selectedMesh) {
      selectedMesh = hit;
      selectedMesh.material.color.set(SELECTED_COLOR);
    } else {
      selectedMesh = null;
    }
  }

  canvas.addEventListener("click", onClick);

  const clock = new EASEL.Clock();
  let animId;

  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.delta;
    for (const mesh of meshes) {
      mesh.rotation.y += 0.6 * dt;
    }
    renderer.render(scene, camera);
  }
  animate();

  return {
    cleanup() {
      if (animId !== undefined) cancelAnimationFrame(animId);
      canvas.removeEventListener("click", onClick);
    },
  };
}

export const easelSource = `import * as EASEL from "easel";

const raycaster = new EASEL.Raycaster();
let selectedMesh = null;

canvas.addEventListener("click", (event) => {
  const x = (event.offsetX / canvas.clientWidth) * 2 - 1;
  const y = -(event.offsetY / canvas.clientHeight) * 2 + 1;

  camera.updateMatrixWorld();
  const camForRay = {
    type: camera.type,
    matrixWorld: camera.matrixWorld,
    projectionMatrixInverse: new EASEL.Matrix4()
      .copy(camera.projectionMatrix)
      .invert(),
  };

  raycaster.setFromCamera({ x, y }, camForRay);
  const hits = raycaster.intersectObjects(meshes);
  const hit = hits.length > 0 ? hits[0].object : null;

  if (selectedMesh !== null) {
    selectedMesh.material.color.set(baseColors.get(selectedMesh));
  }

  if (hit !== null && hit !== selectedMesh) {
    selectedMesh = hit;
    selectedMesh.material.color.set(0xffffff);
  } else {
    selectedMesh = null;
  }
});`;

export const threeSource = `import * as THREE from "three";

const raycaster = new THREE.Raycaster();
let selectedMesh = null;

canvas.addEventListener("click", (event) => {
  const x = (event.offsetX / canvas.clientWidth) * 2 - 1;
  const y = -(event.offsetY / canvas.clientHeight) * 2 + 1;

  raycaster.setFromCamera({ x, y }, camera);
  const hits = raycaster.intersectObjects(meshes);
  const hit = hits.length > 0 ? hits[0].object : null;

  if (selectedMesh !== null) {
    selectedMesh.material.color.set(baseColors.get(selectedMesh));
  }

  if (hit !== null && hit !== selectedMesh) {
    selectedMesh = hit;
    selectedMesh.material.color.set(0xffffff);
  } else {
    selectedMesh = null;
  }
});`;
