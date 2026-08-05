import * as EASEL from "@/index.js";

export const meta = {
  id: "flat-vs-gouraud",
  name: "Flat vs Gouraud",
  category: "materials",
  description:
    "Two spheres: flat shading (one color per face) vs Gouraud shading (per-vertex, interpolated).",
};

export const controls = [];

/**
 * @param {HTMLCanvasElement} canvas
 */
export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const aspect = width / height;
  const size = 4;

  const scene = new EASEL.Scene();
  const camera = new EASEL.OrthographicCamera({
    left: -size * aspect,
    right: size * aspect,
    top: size,
    bottom: -size,
    near: 0.1,
    far: 100,
  });
  camera.position.z = 6;

  const renderer = new EASEL.Renderer({ canvas, width, height });

  scene.add(new EASEL.AmbientLight(0xffffff, 0.3));
  const dirLight = new EASEL.DirectionalLight(0xffffff, 0.9);
  dirLight.position.set(3, 5, 4);
  scene.add(dirLight);

  const flat = new EASEL.Mesh(
    new EASEL.SphereGeometry(1.4, 12, 8),
    new EASEL.LambertMaterial({ color: 0x44aa88, shading: EASEL.Shading.Flat }),
  );
  flat.position.x = -2.5;
  scene.add(flat);

  const gouraud = new EASEL.Mesh(
    new EASEL.SphereGeometry(1.4, 12, 8),
    new EASEL.LambertMaterial({
      color: 0x44aa88,
      shading: EASEL.Shading.Gouraud,
    }),
  );
  gouraud.position.x = 2.5;
  scene.add(gouraud);

  const clock = new EASEL.Timer();
  let animId;

  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.update().delta;
    flat.rotation.y += 0.3 * dt;
    gouraud.rotation.y += 0.3 * dt;
    renderer.prepare(scene, camera);
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

const scene = new EASEL.Scene();
const camera = new EASEL.OrthographicCamera({
  left: -size * aspect, right: size * aspect,
  top: size, bottom: -size,
  near: 0.1, far: 100,
});

scene.add(new EASEL.AmbientLight(0xffffff, 0.3));
const dirLight = new EASEL.DirectionalLight(0xffffff, 0.9);
dirLight.position.set(3, 5, 4);
scene.add(dirLight);

const geo = new EASEL.SphereGeometry(1.4, 12, 8);

const flat = new EASEL.Mesh(
  geo,
  new EASEL.LambertMaterial({ color: 0x44aa88, shading: EASEL.Shading.Flat }),
);
flat.position.x = -2.5;

const gouraud = new EASEL.Mesh(
  geo,
  new EASEL.LambertMaterial({ color: 0x44aa88, shading: EASEL.Shading.Gouraud }),
);
gouraud.position.x = 2.5;`;

// THREE.js does not expose a Flat/Gouraud toggle on MeshLambertMaterial the
// same way - FlatShading is a geometry/normal flag, not a material property.
export const noThreeReason =
  "Gouraud shading is an explicit EASEL material mode; THREE does not expose an equivalent per-material toggle.";

export const threeSource = undefined;
