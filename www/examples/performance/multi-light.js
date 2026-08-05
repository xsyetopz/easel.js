import * as EASEL from "@/index.js";

export const meta = {
  id: "multi-light",
  name: "Multi-Light Workload",
  category: "performance",
  description:
    "Measure lighting cost by adjusting the number of point lights in the scene.",
};

export const controls = [
  {
    type: "slider",
    key: "lightCount",
    label: "Light Count",
    min: 1,
    max: 32,
    step: 1,
    default: 4,
  },
];

const LIGHT_COLORS = [
  0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff,
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
  camera.position.set(0, 2, 8);
  camera.lookAt(new EASEL.Vector3(0, 0, 0));

  const renderer = new EASEL.Renderer({ canvas, width, height });

  scene.add(new EASEL.AmbientLight(0xffffff, 0.2));

  const sphere = new EASEL.Mesh(
    new EASEL.SphereGeometry(1.5, 32, 24),
    new EASEL.LambertMaterial({ color: 0xcccccc }),
  );
  scene.add(sphere);

  /** @type {EASEL.PointLight[]} */
  let pointLights = [];
  let currentCount = Number(params.lightCount ?? 4);
  const ORBIT_RADIUS = 4;

  /**
   * Remove existing point lights and create a new ring of N lights.
   * @param {number} count
   */
  function buildLights(count) {
    for (const pl of pointLights) scene.remove(pl);
    pointLights = [];

    for (let i = 0; i < count; i++) {
      const color = LIGHT_COLORS[i % LIGHT_COLORS.length];
      const pl = new EASEL.PointLight(color, 1, 10, 2);
      const angle = (i / count) * Math.PI * 2;
      pl.position.set(
        Math.cos(angle) * ORBIT_RADIUS,
        0,
        Math.sin(angle) * ORBIT_RADIUS,
      );
      scene.add(pl);
      pointLights.push(pl);
    }
  }

  buildLights(currentCount);

  const clock = new EASEL.Timer();
  let animId;
  let frames = 0;
  let fpsTime = 0;
  let fps = 0;
  const ctx = canvas.getContext("2d");

  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.update().delta;

    sphere.rotation.y += 0.3 * dt;

    const elapsed = clock.elapsedTime;
    const orbitSpeed = 0.5;
    for (let i = 0; i < pointLights.length; i++) {
      const baseAngle = (i / pointLights.length) * Math.PI * 2;
      const angle = baseAngle + elapsed * orbitSpeed;
      pointLights[i].position.x = Math.cos(angle) * ORBIT_RADIUS;
      pointLights[i].position.z = Math.sin(angle) * ORBIT_RADIUS;
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
      ctx.fillText(`FPS: ${fps}  Lights: ${pointLights.length}`, 8, 20);
    }
  }
  animate();

  return {
    cleanup() {
      if (animId !== undefined) cancelAnimationFrame(animId);
    },
    update(newParams) {
      if (
        newParams.lightCount !== undefined &&
        newParams.lightCount !== currentCount
      ) {
        currentCount = Number(newParams.lightCount);
        buildLights(currentCount);
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
scene.add(new EASEL.AmbientLight(0xffffff, 0.2));

const sphere = new EASEL.Mesh(
  new EASEL.SphereGeometry(1.5, 32, 24),
  new EASEL.LambertMaterial({ color: 0xcccccc }),
);
scene.add(sphere);

const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff];
for (let i = 0; i < lightCount; i++) {
  const pl = new EASEL.PointLight(colors[i % 6], 1, 10, 2);
  const a = (i / lightCount) * Math.PI * 2;
  pl.position.set(Math.cos(a) * 4, 0, Math.sin(a) * 4);
  scene.add(pl);
}`;

export const noThreeReason =
  "This workload measures EASEL CPU light baking cost.";

export const threeSource = undefined;
