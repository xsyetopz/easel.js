import {
  AmbientLight,
  Color,
  Geometry,
  GridHelper,
  LineMaterial,
  LineSegments,
  MapControls,
  OrthographicCamera,
  Renderer,
  Scene,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "orthographic-blueprint",
  name: "Orthographic Blueprint",
  category: "interaction",
  description: "Pan a measured plan view for layout and annotation work.",
};
export const controls = [];

function makeLines(positions, color, linewidth = 2) {
  const geometry = new Geometry();
  geometry.setPositions(positions);
  geometry.computeBoundingSphere();
  return new LineSegments(geometry, new LineMaterial({ color, linewidth }));
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = new Color(0x0d1a28);
  const camera = new OrthographicCamera({
    left: -6,
    right: 6,
    top: 6 * (height / width),
    bottom: -6 * (height / width),
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 8, 0.01);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.8));
  scene.add(new GridHelper(10, 10, 0x2e607c, 0x163448));

  const footprint = makeLines(
    [
      -4, 0.04, -2.6, 4, 0.04, -2.6, 4, 0.04, -2.6, 4, 0.04, 2.6, 4, 0.04, 2.6,
      -4, 0.04, 2.6, -4, 0.04, 2.6, -4, 0.04, -2.6,
    ],
    0x9cddff,
    3,
  );
  const partitions = makeLines(
    [
      -1.2, 0.05, -2.6, -1.2, 0.05, 0.8, -1.2, 0.05, 0.8, 2.2, 0.05, 0.8, 2.2,
      0.05, 0.8, 2.2, 0.05, 2.6, -1.2, 0.05, 1.4, -1.2, 0.05, 2.6,
    ],
    0x52b6df,
  );
  const measurements = makeLines(
    [
      -4, 0.06, -3.35, 4, 0.06, -3.35, -4, 0.06, -3.65, -4, 0.06, -3.05, 4,
      0.06, -3.65, 4, 0.06, -3.05, 0, 0.06, -2.6, 0, 0.06, 2.6,
    ],
    0xffc96b,
  );
  scene.add(footprint, partitions, measurements);

  const mapControls = new MapControls(camera, canvas);
  mapControls.enableRotate = false;
  mapControls.screenSpacePanning = false;
  mapControls.target.set(0, 0, 0);
  let frame;
  function animate() {
    frame = globalThis.requestAnimationFrame(animate);
    mapControls.update();
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      mapControls.dispose();
      if (frame !== undefined) globalThis.cancelAnimationFrame(frame);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const camera = new EASEL.OrthographicCamera({ left: -6, right: 6, top: 3.375, bottom: -3.375 });
camera.position.set(0, 8, 0.01);
camera.lookAt(new EASEL.Vector3(0, 0, 0));
const grid = new EASEL.GridHelper(10, 10, 0x2e607c, 0x163448);
const controls = new EASEL.MapControls(camera, canvas);
controls.enableRotate = false;
scene.add(grid, footprint, partitions, measurements);`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
