import {
  AmbientLight,
  BasicMaterial,
  DirectionalLight,
  Geometry,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Renderer,
  Scene,
  SphereGeometry,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "terrain-placement",
  name: "Terrain Placement",
  category: "worlds",
  description: "Place a marker on terrain by clicking a world position.",
};

export const controls = [];

function makeTerrain(size = 18) {
  const geometry = new Geometry();
  const positions = [];
  const indices = [];
  const heightAt = (x, z) =>
    Math.sin(x * 0.55) * 0.45 +
    Math.cos(z * 0.7) * 0.3 +
    Math.sin((x + z) * 0.35) * 0.2;
  for (let z = 0; z <= size; z++) {
    for (let x = 0; x <= size; x++) {
      const px = (x - size / 2) * 0.36;
      const pz = (z - size / 2) * 0.36;
      positions.push(px, heightAt(px, pz), pz);
    }
  }
  const row = size + 1;
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      const a = z * row + x;
      const b = (z + 1) * row + x;
      const c = (z + 1) * row + x + 1;
      const d = z * row + x + 1;
      indices.push(a, d, b, b, d, c);
    }
  }
  geometry.setPositions(positions);
  geometry.index = indices;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x91bdd5;
  const camera = new PerspectiveCamera({
    fov: 48,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 5.6, 8.5);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.45));
  const light = new DirectionalLight(0xffffff, 0.9);
  light.position.set(4, 8, 6);
  scene.add(light);
  const terrain = new Mesh(
    makeTerrain(),
    new LambertMaterial({ color: 0x5e9b67 }),
  );
  scene.add(terrain);
  const marker = new Mesh(
    new SphereGeometry(0.12, 8, 6),
    new BasicMaterial({ color: 0xf5c95d }),
  );
  marker.visible = false;
  scene.add(marker);
  const raycaster = new Raycaster();
  const handleClick = (event) => {
    const bounds = canvas.getBoundingClientRect();
    const coords = {
      x: ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      y: -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    };
    raycaster.setFromCamera(coords, camera);
    const hits = raycaster.intersectObject(terrain);
    if (hits.length > 0) {
      marker.position.copy(hits[0].point);
      marker.position.y += 0.14;
      marker.visible = true;
    }
  };
  canvas.addEventListener("click", handleClick);
  const clock = new Timer();
  let animationFrame;
  function animate() {
    animationFrame = requestAnimationFrame(animate);
    terrain.rotation.y += clock.update().delta * 0.03;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      canvas.removeEventListener("click", handleClick);
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
raycaster.setFromCamera(pointer, camera);
const hit = raycaster.intersectObject(terrain)[0];
if (hit) marker.position.copy(hit.point);`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
