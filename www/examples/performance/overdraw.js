import * as EASEL from "@/index.js";

export const meta = {
  id: "overdraw",
  name: "Overdraw Workload",
  category: "performance",
  description:
    "Overlapping translucent planes to measure overdraw and transparency cost.",
};

export const controls = [
  {
    type: "slider",
    key: "count",
    label: "Layer Count",
    min: 2,
    max: 50,
    step: 1,
    default: 10,
  },
  {
    type: "select",
    key: "opacity",
    label: "Opacity",
    options: ["Opaque", "Medium", "Transparent"],
    default: "Opaque",
  },
];

const OPACITY_MAP = /** @type {Record<string, number>} */ ({
  Opaque: 0,
  Medium: 4,
  Transparent: 7,
});

const PALETTE = [0x5577dd, 0xe07050, 0x50c080, 0xd0a030, 0xb060d0, 0x60b0d0];

/**
 * @param {HTMLCanvasElement} canvas
 * @param {Record<string, unknown>} [params]
 */
export function setup(canvas, params = {}) {
  const width = canvas.width;
  const height = canvas.height;

  const scene = new EASEL.Scene();
  const camera = new EASEL.PerspectiveCamera({
    fov: 60,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 0, 5);
  camera.lookAt(new EASEL.Vector3(0, 0, 0));

  const renderer = new EASEL.Renderer({ canvas, width, height });

  scene.add(new EASEL.AmbientLight(0xffffff, 0.4));
  const light = new EASEL.DirectionalLight(0xffffff, 0.8);
  light.position.set(3, 5, 4);
  scene.add(light);

  const geometry = new EASEL.PlaneGeometry(4, 4);

  /** @type {EASEL.Mesh[]} */
  let meshes = [];
  let currentCount = /** @type {number} */ (params.count ?? 10);
  let currentOpacity = /** @type {string} */ (params.opacity ?? "Opaque");

  /**
   * @param {number} count
   * @param {string} opacityLabel
   */
  function buildPlanes(count, opacityLabel) {
    for (const m of meshes) scene.remove(m);
    meshes = [];

    const opacityValue = OPACITY_MAP[opacityLabel] ?? 0;

    for (let i = 0; i < count; i++) {
      const mesh = new EASEL.Mesh(
        geometry,
        new EASEL.LambertMaterial({
          color: PALETTE[i % PALETTE.length],
          opacity: opacityValue,
          transparent: opacityValue > 0,
        }),
      );
      mesh.position.z = i * 0.1;
      scene.add(mesh);
      meshes.push(mesh);
    }
  }

  buildPlanes(currentCount, currentOpacity);

  const clock = new EASEL.Timer();
  let animId;
  let frames = 0;
  let fpsTime = 0;
  let fps = 0;
  const ctx = canvas.getContext("2d");

  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.update().delta;
    const elapsed = clock.elapsedTime;

    for (let i = 0; i < meshes.length; i++) {
      meshes[i].position.x = Math.sin(elapsed * 0.8 + i * 0.5) * 0.6;
    }

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
      ctx.fillText(
        `FPS: ${fps}  Layers: ${meshes.length}  Opacity: ${currentOpacity}`,
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
      let rebuild = false;
      if (newParams.count !== undefined && newParams.count !== currentCount) {
        currentCount = /** @type {number} */ (newParams.count);
        rebuild = true;
      }
      if (
        newParams.opacity !== undefined &&
        newParams.opacity !== currentOpacity
      ) {
        currentOpacity = /** @type {string} */ (newParams.opacity);
        rebuild = true;
      }
      if (rebuild) {
        buildPlanes(currentCount, currentOpacity);
      }
    },
  };
}

export const easelSource = `import * as EASEL from "easel";

const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
  fov: 60, aspect: width / height, near: 0.1, far: 100,
});
camera.position.set(0, 0, 5);

const renderer = new EASEL.Renderer({ canvas, width, height });
scene.add(new EASEL.AmbientLight(0xffffff, 0.4));

const geometry = new EASEL.PlaneGeometry(4, 4);

for (let i = 0; i < 10; i++) {
  const mesh = new EASEL.Mesh(
    geometry,
    new EASEL.LambertMaterial({
      color: palette[i % 6],
      opacity: 4,
      transparent: true,
    }),
  );
  mesh.position.z = i * 0.1;
  scene.add(mesh);
}`;

export const noThreeReason =
  "This workload measures EASEL Canvas2D overdraw and depth behavior.";

export const threeSource = undefined;
