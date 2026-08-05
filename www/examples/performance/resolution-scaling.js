import * as EASEL from "@/index.js";

export const meta = {
  id: "resolution-scaling",
  name: "Resolution Scaling Workload",
  category: "performance",
  description: "Measure how rendering cost scales with canvas resolution.",
};

export const controls = [
  {
    type: "slider",
    key: "scale",
    label: "Resolution Scale",
    min: 0.25,
    max: 2.0,
    step: 0.25,
    default: 1.0,
  },
];

/**
 * @param {HTMLCanvasElement} canvas
 * @param {Record<string, unknown>} [params]
 */
export function setup(canvas, params = {}) {
  const baseWidth = canvas.width;
  const baseHeight = canvas.height;

  const scene = new EASEL.Scene();
  const camera = new EASEL.PerspectiveCamera({
    fov: 50,
    aspect: baseWidth / baseHeight,
    near: 0.1,
    far: 100,
  });
  camera.position.z = 4;

  const renderer = new EASEL.Renderer({
    canvas,
    width: baseWidth,
    height: baseHeight,
  });

  scene.add(new EASEL.AmbientLight(0xffffff, 0.4));
  const light = new EASEL.DirectionalLight(0xffffff, 0.8);
  light.position.set(4, 6, 5);
  scene.add(light);

  const mesh = new EASEL.Mesh(
    new EASEL.TorusKnotGeometry(1, 0.3, 128, 16),
    new EASEL.LambertMaterial({ color: 0x5577dd }),
  );
  scene.add(mesh);

  let currentScale = /** @type {number} */ (params.scale ?? 1.0);
  let currentW = baseWidth;
  let currentH = baseHeight;

  canvas.style.width = `${baseWidth}px`;
  canvas.style.height = `${baseHeight}px`;

  /**
   * @param {number} scale
   */
  function applyScale(scale) {
    const w = Math.round(baseWidth * scale);
    const h = Math.round(baseHeight * scale);
    currentW = w;
    currentH = h;
    renderer.setSize(w, h);
    canvas.style.width = `${baseWidth}px`;
    canvas.style.height = `${baseHeight}px`;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  if (currentScale !== 1.0) {
    applyScale(currentScale);
  }

  const clock = new EASEL.Timer();
  let animId;
  let frames = 0;
  let fpsTime = 0;
  let fps = 0;
  const ctx = canvas.getContext("2d");

  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.update().delta;

    mesh.rotation.y += 0.5 * dt;
    mesh.rotation.x += 0.3 * dt;

    renderer.prepare(scene, camera);

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
      ctx.fillText(`FPS: ${fps}  Resolution: ${currentW}x${currentH}`, 8, 20);
    }
  }
  animate();

  return {
    cleanup() {
      if (animId !== undefined) cancelAnimationFrame(animId);
    },
    update(newParams) {
      if (newParams.scale !== undefined && newParams.scale !== currentScale) {
        currentScale = /** @type {number} */ (newParams.scale);
        applyScale(currentScale);
      }
    },
  };
}

export const easelSource = `import * as EASEL from "easel";

const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
  fov: 50, aspect: width / height, near: 0.1, far: 100,
});
camera.position.z = 4;

const renderer = new EASEL.Renderer({ canvas, width, height });
scene.add(new EASEL.AmbientLight(0xffffff, 0.4));

const mesh = new EASEL.Mesh(
  new EASEL.TorusKnotGeometry(1, 0.3, 128, 16),
  new EASEL.LambertMaterial({ color: 0x5577dd }),
);
scene.add(mesh);

const scale = 0.5;
renderer.setSize(width * scale, height * scale);
canvas.style.width = width + "px";
canvas.style.height = height + "px";`;

export const noThreeReason =
  "This workload measures EASEL canvas resolution scaling and CPU raster cost.";

export const threeSource = undefined;
