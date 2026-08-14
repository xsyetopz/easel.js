import {
  AmbientLight,
  DirectionalLight,
  GLTFExporter,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "gltf-normal-check",
  name: "glTF Normal Check",
  category: "data",
  description:
    "Export vertex normals with a glTF scene for downstream shading.",
};
export const controls = [];

function createMeshes() {
  const geometry1 = new PlaneGeometry(2.4, 2.4);
  const geometry2 = new PlaneGeometry(2.4, 2.4);
  geometry2.setNormals(new Float32Array([0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0, 2]));
  const mesh1 = new Mesh(
    geometry1,
    new LambertMaterial({ color: 0x636389, side: 2 }),
  );
  const mesh2 = new Mesh(
    geometry2,
    new LambertMaterial({ color: 0x898963, side: 2 }),
  );
  mesh1.name = "Mesh1";
  mesh2.name = "Mesh2";
  mesh1.position.x = -1.6;
  mesh2.position.x = 1.6;
  return { mesh1, mesh2 };
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.name = "Scene";
  scene.background = 0x10131e;
  scene.userData.normalMapBoundary =
    "Vertex normals are included in the export.";
  const camera = new PerspectiveCamera({
    fov: 45,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 0, 8);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.4));
  const light = new DirectionalLight(0xffffff, 1.8);
  light.position.set(0, 1, 1);
  scene.add(light);

  const { mesh1, mesh2 } = createMeshes();
  scene.add(mesh1, mesh2);

  const exported = new GLTFExporter().parse(scene, { normalizeNormals: true });
  canvas.dataset.gltfBytes = String(exported.binary.byteLength);
  const timer = new Timer();
  let frame;
  function animate() {
    frame = globalThis.requestAnimationFrame(animate);
    const delta = timer.update().delta;
    mesh1.rotation.y += delta * 0.2;
    mesh2.rotation.y -= delta * 0.2;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (frame !== undefined) globalThis.cancelAnimationFrame(frame);
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const exporter = new EASEL.GLTFExporter();
const result = exporter.parse(scene, { normalizeNormals: true });`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
