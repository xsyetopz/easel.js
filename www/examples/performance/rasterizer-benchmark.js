import * as EASEL from "@/index.js";

export const meta = {
  id: "rasterizer-benchmark",
  name: "Sphere Raster Workload",
  category: "performance",
  description:
    "Sphere with adjustable subdivisions and material modes to isolate rasterizer throughput.",
};

export const controls = [
  {
    type: "slider",
    key: "subdivisions",
    label: "Subdivisions",
    min: 4,
    max: 256,
    step: 4,
    default: 32,
  },
  {
    type: "select",
    key: "material",
    label: "Material",
    options: [
      "Lambert (Gouraud)",
      "Lambert (Flat)",
      "Basic (Unlit)",
      "Toon",
      "Wireframe",
    ],
    default: "Lambert (Gouraud)",
  },
];

/**
 * @param {string} mode
 * @returns {EASEL.Material}
 */
function createMaterial(mode) {
  switch (mode) {
    case "Lambert (Gouraud)":
      return new EASEL.LambertMaterial({ color: 0x5577dd });
    case "Lambert (Flat)":
      return new EASEL.LambertMaterial({
        color: 0x5577dd,
        shading: EASEL.Shading.Flat,
      });
    case "Basic (Unlit)":
      return new EASEL.BasicMaterial({ color: 0x5577dd });
    case "Toon":
      return new EASEL.ToonMaterial({ color: 0x5577dd });
    case "Wireframe": {
      const mat = new EASEL.BasicMaterial({ color: 0x44aaff });
      mat.wireframe = true;
      return mat;
    }
    default:
      return new EASEL.LambertMaterial({ color: 0x5577dd });
  }
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
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.z = 5;

  const renderer = new EASEL.Renderer({ canvas, width, height });

  scene.add(new EASEL.AmbientLight(0xffffff, 0.3));
  const light = new EASEL.DirectionalLight(0xffffff, 0.9);
  light.position.set(3, 5, 4);
  scene.add(light);

  let currentSubs = /** @type {number} */ (params.subdivisions ?? 32);
  let currentMaterial = /** @type {string} */ (
    params.material ?? "Lambert (Gouraud)"
  );

  let mesh = new EASEL.Mesh(
    new EASEL.SphereGeometry(1.5, currentSubs, Math.floor(currentSubs * 0.75)),
    createMaterial(currentMaterial),
  );
  scene.add(mesh);

  /** @returns {number} */
  function triCount() {
    const idx = mesh.geometry.index;
    return idx ? Math.floor(idx.length / 3) : 0;
  }

  /**
   * @param {number} subs
   * @param {string} materialMode
   */
  function rebuildMesh(subs, materialMode) {
    scene.remove(mesh);
    mesh = new EASEL.Mesh(
      new EASEL.SphereGeometry(1.5, subs, Math.floor(subs * 0.75)),
      createMaterial(materialMode),
    );
    scene.add(mesh);
  }

  const clock = new EASEL.Timer();
  let animId;
  let frames = 0;
  let fpsTime = 0;
  let fps = 0;
  const ctx = canvas.getContext("2d");
  const timings = {};

  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.update().delta;

    mesh.rotation.y += 0.4 * dt;
    renderer.prepare(scene, camera);
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
        `FPS: ${fps}  Tris: ${triCount()}  Mode: ${currentMaterial}`,
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
    /** @param {Record<string, unknown>} newParams */
    update(newParams) {
      let rebuild = false;

      if (
        newParams.subdivisions !== undefined &&
        newParams.subdivisions !== currentSubs
      ) {
        currentSubs = /** @type {number} */ (newParams.subdivisions);
        rebuild = true;
      }
      if (
        newParams.material !== undefined &&
        newParams.material !== currentMaterial
      ) {
        currentMaterial = /** @type {string} */ (newParams.material);
        rebuild = true;
      }

      if (rebuild) {
        rebuildMesh(currentSubs, currentMaterial);
      }
    },
  };
}

export const easelSource = `import * as EASEL from "easel";

const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
  fov: 45, aspect: width / height, near: 0.1, far: 100,
});
camera.position.z = 5;

const renderer = new EASEL.Renderer({ canvas, width, height });
scene.add(new EASEL.AmbientLight(0xffffff, 0.3));

const subs = 32;
const sphere = new EASEL.Mesh(
  new EASEL.SphereGeometry(1.5, subs, Math.floor(subs * 0.75)),
  new EASEL.LambertMaterial({ color: 0x5577dd }),
);
scene.add(sphere);
`;

export const noThreeReason =
  "This workload measures the EASEL software rasterizer directly.";

export const threeSource = undefined;
