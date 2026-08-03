import * as EASEL from "@/index.js";

export const meta = {
  id: "frustum-culling",
  name: "Frustum Culling Workload",
  category: "performance",
  description:
    "Large grid of objects with camera aimed at one corner to measure frustum culling effectiveness.",
};

export const controls = [
  {
    type: "slider",
    key: "count",
    label: "Total Objects",
    min: 100,
    max: 3000,
    step: 100,
    default: 1000,
  },
];

const COLORS = [0x5577dd, 0xe07050, 0x50c080, 0xd0a030, 0xb060d0, 0x60b0d0];

/**
 * @param {HTMLCanvasElement} canvas
 * @param {Record<string, unknown>} [params]
 */
export function setup(canvas, params = {}) {
  const width = canvas.width;
  const height = canvas.height;

  const scene = new EASEL.Scene();
  const origin = new EASEL.Vector3(0, 0, 0);
  const camera = new EASEL.PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 80,
  });
  camera.position.set(-20, 12, -20);
  camera.lookAt(origin);

  const renderer = new EASEL.Renderer({ canvas, width, height });

  scene.add(new EASEL.AmbientLight(0xffffff, 0.4));
  const light = new EASEL.DirectionalLight(0xffffff, 0.8);
  light.position.set(5, 10, 7);
  scene.add(light);

  const geometry = new EASEL.BoxGeometry(0.4, 0.4, 0.4);
  geometry.computeBoundingSphere();

  /** @type {EASEL.Mesh[]} */
  let meshes = [];
  let currentCount = params.count ?? 1000;

  /**
   * Distributes count meshes across a 3D grid with ~1.5 unit spacing.
   * @param {number} count
   */
  function buildGrid(count) {
    for (const m of meshes) scene.remove(m);
    meshes = [];

    const cols = Math.ceil(Math.cbrt(count));
    const rows = Math.ceil(Math.cbrt(count));
    const layers = Math.ceil(count / (cols * rows));
    const spacing = 1.5;
    const offsetX = ((cols - 1) * spacing) / 2;
    const offsetY = ((layers - 1) * spacing) / 2;
    const offsetZ = ((rows - 1) * spacing) / 2;

    for (let i = 0; i < count; i++) {
      const x = i % cols;
      const z = Math.floor(i / cols) % rows;
      const y = Math.floor(i / (cols * rows));
      const mesh = new EASEL.Mesh(
        geometry,
        new EASEL.LambertMaterial({ color: COLORS[i % COLORS.length] }),
      );
      mesh.position.x = x * spacing - offsetX;
      mesh.position.y = y * spacing - offsetY;
      mesh.position.z = z * spacing - offsetZ;
      scene.add(mesh);
      meshes.push(mesh);
    }
  }

  buildGrid(currentCount);

  const clock = new EASEL.Clock();
  let animId;
  let frames = 0;
  let fpsTime = 0;
  let fps = 0;
  let elapsed = 0;
  const ctx = canvas.getContext("2d");
  const timings = {};

  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.delta;
    elapsed += dt;

    // Slowly orbit the camera around the corner to vary the visible set
    const angle = elapsed * 0.15;
    const radius = 28;
    camera.position.x = Math.cos(angle) * radius;
    camera.position.z = Math.sin(angle) * radius;
    camera.position.y = 12 + Math.sin(elapsed * 0.1) * 4;
    camera.lookAt(origin);

    renderer.render(scene, camera, timings);

    frames++;
    fpsTime += dt;
    if (fpsTime >= 1) {
      fps = Math.round(frames / fpsTime);
      frames = 0;
      fpsTime = 0;
    }

    if (ctx) {
      ctx.fillStyle = "#fff";
      ctx.font = "14px monospace";
      ctx.fillText(
        `FPS: ${fps}  Total: ${meshes.length}  (cull saves work on off-screen objects)`,
        8,
        20,
      );
      const total =
        typeof timings.totalMs === "number" ? timings.totalMs.toFixed(2) : "-";
      const trav =
        typeof timings.traversalMs === "number"
          ? timings.traversalMs.toFixed(2)
          : "-";
      const sort =
        typeof timings.sortMs === "number" ? timings.sortMs.toFixed(2) : "-";
      const shade =
        typeof timings.shadeRasterMs === "number"
          ? timings.shadeRasterMs.toFixed(2)
          : "-";
      const upload =
        typeof timings.uploadMs === "number"
          ? timings.uploadMs.toFixed(2)
          : "-";
      ctx.fillText(
        `ms: total ${total}  trav ${trav}  sort ${sort}  shade+rast ${shade}  upload ${upload}`,
        8,
        40,
      );
    }
  }
  animate();

  return {
    cleanup() {
      if (animId !== undefined) cancelAnimationFrame(animId);
    },
    update(newParams) {
      if (newParams.count !== undefined && newParams.count !== currentCount) {
        currentCount = newParams.count;
        buildGrid(currentCount);
      }
    },
  };
}

export const easelSource = `import * as EASEL from "easel";

const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
  fov: 45, aspect: width / height, near: 0.1, far: 80,
});
camera.position.set(-20, 12, -20);
camera.lookAt(new EASEL.Vector3(0, 0, 0));

const renderer = new EASEL.Renderer({ canvas, width, height });
scene.add(new EASEL.AmbientLight(0xffffff, 0.4));

const geometry = new EASEL.BoxGeometry(0.4, 0.4, 0.4);
geometry.computeBoundingSphere();

for (let i = 0; i < 1000; i++) {
  const mesh = new EASEL.Mesh(
    geometry,
    new EASEL.LambertMaterial({ color: colors[i % 6] }),
  );
  mesh.position.x = (i % cols) * 1.5 - offsetX;
  mesh.position.z = Math.floor(i / cols) % rows * 1.5 - offsetZ;
  mesh.position.y = Math.floor(i / (cols * rows)) * 1.5 - offsetY;
  scene.add(mesh);
}
`;

export const noThreeReason =
  "This workload measures EASEL traversal and software-renderer culling cost.";

export const threeSource = undefined;
