import {
  AmbientLight,
  AxesHelper,
  ConvexGeometry,
  DodecahedronGeometry,
  Geometry,
  Group,
  LambertMaterial,
  Mesh,
  OrbitControls,
  PerspectiveCamera,
  PointLight,
  Points,
  PointsMaterial,
  Renderer,
  Scene,
  Side,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "canvas_geometry_convex",
  upstream: "webgl_geometry_convex",
  name: "geometry / convex",
  category: "canvas",
  animated: true,
  description:
    "A translucent convex hull built around the twenty vertices of a dodecahedron spins beside an axes helper, with the source vertices drawn as blue points and orbit controls for the camera.",
  differences: [
    "EASEL points are filled discs with an integer pixel radius and no texture sampling, alphaTest or size attenuation, so solid blue discs of radius 2 stand in for the disc.png sprites whose size shrinks with distance.",
    "The hull's opacity 0.5 maps to EASEL's discrete opacity level 4 of 8, so the hull blends through one of nine fixed translucency steps (here exactly half) rather than a continuous alpha.",
  ],
};
export const controls = [];

export function setup(canvas) {
  const scene = new Scene();

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  // camera

  const camera = new PerspectiveCamera({
    fov: 40,
    aspect: canvas.width / canvas.height,
    near: 1,
    far: 1000,
  });
  camera.position.set(15, 20, 30);
  scene.add(camera);

  // controls

  const orbit = new OrbitControls(camera, canvas);
  orbit.minDistance = 20;
  orbit.maxDistance = 50;
  orbit.maxPolarAngle = Math.PI / 2;

  // ambient light

  scene.add(new AmbientLight(0x666666, 1));

  // point light

  const light = new PointLight(0xffffff, 3, 0, 0);
  camera.add(light);

  // helper

  const axesHelper = new AxesHelper(20);
  scene.add(axesHelper);

  const group = new Group();
  scene.add(group);

  // points

  const dodecahedronGeometry = new DodecahedronGeometry(10);

  // if normal and uv attributes are not removed, mergeVertices() can't consolidate identical vertices with different normal/uv data

  dodecahedronGeometry.deleteAttribute("normal");
  dodecahedronGeometry.deleteAttribute("uv");

  dodecahedronGeometry.mergeVertices();

  const vertices = [];
  const positionAttribute = dodecahedronGeometry.getAttribute("position");

  for (let i = 0; i < positionAttribute.count; i++) {
    const vertex = new Vector3();
    vertex.fromBufferAttribute(positionAttribute, i);
    vertices.push(vertex);
  }

  const pointsMaterial = new PointsMaterial({
    color: 0x0080ff,
    size: 2,
    vertexColors: false,
  });

  const pointsGeometry = new Geometry().setFromPoints(vertices);

  const points = new Points(pointsGeometry, pointsMaterial);
  group.add(points);

  // convex hull

  const meshMaterial = new LambertMaterial({
    color: 0xffffff,
    opacity: 4,
    side: Side.Double,
    transparent: true,
    vertexColors: false,
  });

  const meshGeometry = new ConvexGeometry(vertices);

  const mesh = new Mesh(meshGeometry, meshMaterial);
  group.add(mesh);

  const animation = createExampleAnimationLoop(() => {
    group.rotation.y += 0.005;

    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    },
    cleanup() {
      animation.cleanup();
      orbit.dispose();
      axesHelper.dispose();
      dodecahedronGeometry.dispose();
      pointsGeometry.dispose();
      pointsMaterial.dispose();
      meshGeometry.dispose();
      meshMaterial.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const dodecahedron = new EASEL.DodecahedronGeometry(10);
dodecahedron.deleteAttribute("normal");
dodecahedron.deleteAttribute("uv");
dodecahedron.mergeVertices();

const position = dodecahedron.getAttribute("position");
const vertices = [];
for (let i = 0; i < position.count; i++) {
  vertices.push(new EASEL.Vector3().fromBufferAttribute(position, i));
}

group.add(new EASEL.Points(
  new EASEL.Geometry().setFromPoints(vertices),
  new EASEL.PointsMaterial({ color: 0x0080ff, size: 2, vertexColors: false }),
));
group.add(new EASEL.Mesh(
  new EASEL.ConvexGeometry(vertices),
  new EASEL.LambertMaterial({ opacity: 4, side: EASEL.Side.Double, transparent: true }),
));

group.rotation.y += 0.005;
renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };
