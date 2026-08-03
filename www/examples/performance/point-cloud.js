import * as EASEL from "@/index.js";

export const meta = {
  id: "point-cloud",
  name: "Point Cloud Workload",
  category: "performance",
  description: "Measures PointRasterizer throughput with large vertex counts.",
};

export const controls = [
  {
    type: "slider",
    key: "count",
    label: "Point Count",
    min: 100,
    max: 50000,
    step: 100,
    default: 5000,
  },
  {
    type: "slider",
    key: "size",
    label: "Point Size",
    min: 1,
    max: 8,
    step: 1,
    default: 2,
  },
];

const CLOUD_RADIUS = 3;

/**
 * Generate random positions inside a sphere using rejection sampling,
 * with random per-vertex colors.
 * @param {number} count
 * @returns {{ positions: Float32Array, colors: Float32Array }}
 */
function generateCloud(count) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  let written = 0;
  while (written < count) {
    const x = (Math.random() * 2 - 1) * CLOUD_RADIUS;
    const y = (Math.random() * 2 - 1) * CLOUD_RADIUS;
    const z = (Math.random() * 2 - 1) * CLOUD_RADIUS;
    if (x * x + y * y + z * z > CLOUD_RADIUS * CLOUD_RADIUS) continue;
    const i3 = written * 3;
    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;
    colors[i3] = Math.random();
    colors[i3 + 1] = Math.random();
    colors[i3 + 2] = Math.random();
    written++;
  }

  return { positions, colors };
}

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
  camera.position.set(0, 2, 8);
  camera.lookAt(new EASEL.Vector3(0, 0, 0));

  const renderer = new EASEL.Renderer({ canvas, width, height });

  scene.add(new EASEL.AmbientLight(0xffffff, 0.5));

  let currentCount = Number(params.count ?? 5000);
  let currentSize = Number(params.size ?? 2);

  const material = new EASEL.PointsMaterial({
    size: currentSize,
  });

  const geometry = new EASEL.Geometry();

  /** @type {EASEL.Points} */
  const points = new EASEL.Points(geometry, material);
  scene.add(points);

  /**
   * Rebuild the geometry with a new point count.
   * @param {number} count
   */
  function rebuildGeometry(count) {
    const { positions, colors } = generateCloud(count);
    geometry.setPositions(positions);
    geometry.setColors(colors);
  }

  rebuildGeometry(currentCount);

  const clock = new EASEL.Clock();
  let animId;
  let frames = 0;
  let fpsTime = 0;
  let fps = 0;
  const ctx = canvas.getContext("2d");

  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.delta;

    points.rotation.y += 0.3 * dt;
    points.rotation.x += 0.1 * dt;

    renderer.render(scene, camera);

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
        `FPS: ${fps}  Points: ${currentCount}  Size: ${currentSize}px`,
        8,
        20,
      );
    }
  }
  animate();

  return {
    cleanup() {
      if (animId !== undefined) cancelAnimationFrame(animId);
    },
    update(newParams) {
      let needsRebuild = false;

      if (
        newParams.count !== undefined &&
        Number(newParams.count) !== currentCount
      ) {
        currentCount = Number(newParams.count);
        needsRebuild = true;
      }

      if (
        newParams.size !== undefined &&
        Number(newParams.size) !== currentSize
      ) {
        currentSize = Number(newParams.size);
        material.size = currentSize;
      }

      if (needsRebuild) {
        rebuildGeometry(currentCount);
      }
    },
  };
}

export const easelSource = `import * as EASEL from "easel";

const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
  fov: 50, aspect: width / height, near: 0.1, far: 100,
});
camera.position.set(0, 2, 8);

const renderer = new EASEL.Renderer({ canvas, width, height });
scene.add(new EASEL.AmbientLight(0xffffff, 0.5));

const positions = new Float32Array(count * 3);
const colors = new Float32Array(count * 3);
let i = 0;
while (i < count) {
  const x = (Math.random() * 2 - 1) * 3;
  const y = (Math.random() * 2 - 1) * 3;
  const z = (Math.random() * 2 - 1) * 3;
  if (x * x + y * y + z * z > 9) continue;
  positions.set([x, y, z], i * 3);
  colors.set([Math.random(), Math.random(), Math.random()], i * 3);
  i++;
}

const geometry = new EASEL.Geometry();
geometry.setPositions(positions);
geometry.setColors(colors);

const material = new EASEL.PointsMaterial({ size: 2 });
const points = new EASEL.Points(geometry, material);
scene.add(points);`;

export const noThreeReason =
  "This workload measures EASEL PointRasterizer throughput.";

export const threeSource = undefined;
