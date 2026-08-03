import * as EASEL from "@/index.js";

export const meta = {
  id: "raycaster",
  name: "Raycaster",
  category: "interactive",
  description:
    "Move the mouse over the grid to highlight cubes via ray-object intersection.",
};

export const controls = [];

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
  camera.position.set(0, 1, 12);
  camera.lookAt(new EASEL.Vector3(0, 0, 0));

  const renderer = new EASEL.Renderer({ canvas, width, height });

  scene.add(new EASEL.AmbientLight(0xffffff, 0.4));
  const dirLight = new EASEL.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 8, 6);
  scene.add(dirLight);

  const gridSize = 5;
  const boxSize = 0.8;
  const spacing = 1.4;

  /** @type {EASEL.Mesh[]} */
  const cubes = [];
  /** @type {Map<EASEL.Mesh, number>} */
  const originalColors = new Map();

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const color =
        Math.floor(Math.random() * 0x606060) +
        0x404040 +
        (Math.floor(Math.random() * 0x40) << 16) +
        (Math.floor(Math.random() * 0x40) << 8);
      const mesh = new EASEL.Mesh(
        new EASEL.BoxGeometry(boxSize, boxSize, boxSize),
        new EASEL.LambertMaterial({ color }),
      );
      mesh.position.set(
        (col - (gridSize - 1) / 2) * spacing,
        (row - (gridSize - 1) / 2) * spacing,
        0,
      );
      scene.add(mesh);
      cubes.push(mesh);
      originalColors.set(mesh, color);
    }
  }

  const raycaster = new EASEL.Raycaster();
  /** @type {EASEL.Mesh|null} */
  let hoveredCube = null;

  function getCameraForRaycaster() {
    camera.updateMatrixWorld();
    const projInv = new EASEL.Matrix4().copy(camera.projectionMatrix).invert();
    return {
      type: camera.type,
      matrixWorld: camera.matrixWorld,
      projectionMatrixInverse: projInv,
    };
  }

  function onMouseMove(event) {
    const x = (event.offsetX / canvas.clientWidth) * 2 - 1;
    const y = -(event.offsetY / canvas.clientHeight) * 2 + 1;

    raycaster.setFromCamera({ x, y }, getCameraForRaycaster());
    const hits = raycaster.intersectObjects(cubes);
    const hit =
      hits.length > 0 ? /** @type {EASEL.Mesh} */ (hits[0].object) : null;

    if (hit !== hoveredCube) {
      if (hoveredCube !== null) {
        const orig = originalColors.get(hoveredCube);
        if (orig !== undefined) {
          hoveredCube.material.color.set(orig);
        }
      }
      hoveredCube = hit;
      if (hoveredCube !== null) {
        const orig = originalColors.get(hoveredCube) ?? 0xffffff;
        const bright = new EASEL.Color(orig);
        bright.r = Math.min(1, bright.r * 1.6);
        bright.g = Math.min(1, bright.g * 1.6);
        bright.b = Math.min(1, bright.b * 1.6);
        hoveredCube.material.color.copy(bright);
      }
    }
  }

  canvas.addEventListener("mousemove", onMouseMove);

  const clock = new EASEL.Clock();
  let animId;

  function animate() {
    animId = requestAnimationFrame(animate);
    void clock.delta;
    renderer.render(scene, camera);
  }
  animate();

  return {
    cleanup() {
      if (animId !== undefined) cancelAnimationFrame(animId);
      canvas.removeEventListener("mousemove", onMouseMove);
    },
  };
}

export const easelSource = `import * as EASEL from "easel";

const raycaster = new EASEL.Raycaster();

canvas.addEventListener("mousemove", (event) => {
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
  const hits = raycaster.intersectObjects(cubes);

  if (hits.length > 0) {
    hits[0].object.material.color.set(0xffffff);
  }
});`;

export const threeSource = `import * as THREE from "three";

const raycaster = new THREE.Raycaster();

canvas.addEventListener("mousemove", (event) => {
  const x = (event.offsetX / canvas.clientWidth) * 2 - 1;
  const y = -(event.offsetY / canvas.clientHeight) * 2 + 1;

  raycaster.setFromCamera({ x, y }, camera);
  const hits = raycaster.intersectObjects(cubes);

  if (hits.length > 0) {
    hits[0].object.material.color.set(0xffffff);
  }
});`;
