import {
  AmbientLight,
  DirectionalLight,
  Geometry,
  LambertMaterial,
  LineMaterial,
  LineSegments,
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

function base(canvas, orthographic = false) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x101722;
  const camera = orthographic
    ? new OrthographicCamera({
        left: -4,
        right: 4,
        top: (4 * height) / width,
        bottom: (-4 * height) / width,
        near: 0.1,
        far: 100,
      })
    : new PerspectiveCamera({
        fov: 45,
        aspect: width / height,
        near: 0.1,
        far: 100,
      });
  camera.position.set(0, 0.4, 6.5);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.4));
  const light = new DirectionalLight(0xffffff, 0.9);
  light.position.set(3, 5, 6);
  scene.add(light);
  return { width, height, scene, camera, renderer };
}

function triangleGeometry(indexed) {
  const geometry = new Geometry();
  geometry.setPositions([-1.8, -1.2, 0, 1.8, -1.2, 0, 0, 1.6, 0]);
  if (indexed) geometry.index = [0, 1, 2];
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function lineGeometry(indexed, colors = false) {
  const geometry = new Geometry();
  geometry.setPositions([
    -2.6, -1.4, 0, 2.6, -1.4, 0, -2.6, 1.4, 0, 2.6, 1.4, 0,
  ]);
  if (indexed) geometry.index = [0, 1, 2, 3];
  if (colors)
    geometry.setColors([
      1, 0.25, 0.25, 0.25, 0.9, 1, 0.4, 1, 0.35, 1, 0.8, 0.2,
    ]);
  geometry.computeBoundingSphere();
  return geometry;
}

export function setupDirect(canvas, kind) {
  const { scene, camera, renderer } = base(canvas, kind === "camera");
  const object =
    kind === "lines" || kind === "lines-indexed" || kind === "lines-colors"
      ? new LineSegments(
          lineGeometry(kind !== "lines", kind === "lines-colors"),
          new LineMaterial({ color: 0x6ec8ff, linewidth: 2 }),
        )
      : new Mesh(
          triangleGeometry(kind === "indexed"),
          new LambertMaterial({ color: 0xe29a56 }),
        );
  scene.add(object);
  const clock = new Timer();
  const animation = createExampleAnimationLoop((timestamp) => {
    clock.update(timestamp);
    object.rotation.y += clock.delta * 0.45;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    cleanup() {
      animation.cleanup();
    },
  };
}

export const directEasel = {
  mesh: "const geometry = new EASEL.Geometry();\ngeometry.setPositions(vertices);\nconst mesh = new EASEL.Mesh(geometry, new EASEL.LambertMaterial({ color: 0xe29a56 }));",
  indexed:
    "const geometry = new EASEL.Geometry();\ngeometry.setPositions(vertices);\ngeometry.index = indices;",
  lines:
    "const geometry = new EASEL.Geometry();\ngeometry.setPositions(vertices);\nconst lines = new EASEL.LineSegments(geometry, new EASEL.LineMaterial({ color: 0x6ec8ff }));",
  "lines-indexed":
    "const geometry = new EASEL.Geometry();\ngeometry.setPositions(vertices);\ngeometry.index = indices;",
  "lines-colors":
    "geometry.setColors(colors);\nconst lines = new EASEL.LineSegments(geometry, new EASEL.LineMaterial({ color: 0xffffff }));",
  camera:
    "const camera = new EASEL.OrthographicCamera({ left: -4, right: 4, top: 2.25, bottom: -2.25 });",
};
