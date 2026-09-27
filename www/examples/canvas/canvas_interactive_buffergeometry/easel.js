import {
  AmbientLight,
  Attribute,
  Color,
  DirectionalLight,
  Fog,
  Geometry,
  LambertMaterial,
  Line,
  LineMaterial,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Renderer,
  Scene,
  Side,
  Vector2,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";
import { pointerToNdc } from "../../../runtime/example-pointer.ts";

export const meta = {
  id: "canvas_interactive_buffergeometry",
  upstream: "webgl_interactive_buffergeometry",
  name: "interactive / buffergeometry",
  category: "canvas",
  animated: true,
  description:
    "Five thousand randomly placed, vertex-colored triangles in one rotating Geometry are raycast every frame, and a white outline traces the triangle under the pointer.",
  differences: [
    "EASEL has no MeshPhongMaterial, so the triangles use LambertMaterial and lose the white specular highlights (shininess 250) of the three.js original.",
    "EASEL bakes lighting per vertex and rasterizes the triangles and the outline on the CPU without anti-aliasing, so edges are jagged where the three.js renderer enables antialias.",
  ],
};
export const controls = [];

export function setup(canvas) {
  //

  const camera = new PerspectiveCamera({
    fov: 27,
    aspect: canvas.width / canvas.height,
    near: 1,
    far: 3500,
  });
  camera.position.z = 2750;

  const scene = new Scene();
  scene.background = 0x050505;
  scene.fog = new Fog({ color: 0x050505, near: 2000, far: 3500 });

  //

  scene.add(new AmbientLight(0x444444, 3));

  const light1 = new DirectionalLight(0xffffff, 1.5);
  light1.position.set(1, 1, 1);
  scene.add(light1);

  const light2 = new DirectionalLight(0xffffff, 4.5);
  light2.position.set(0, -1, 0);
  scene.add(light2);

  //

  const triangles = 5000;

  const meshGeometry = new Geometry();

  const positions = new Float32Array(triangles * 3 * 3);
  const normals = new Float32Array(triangles * 3 * 3);
  const colors = new Float32Array(triangles * 3 * 3);

  const color = new Color();

  const n = 800;
  const n2 = n / 2; // triangles spread in the cube
  const d = 120;
  const d2 = d / 2; // individual triangle size

  const pA = new Vector3();
  const pB = new Vector3();
  const pC = new Vector3();

  const cb = new Vector3();
  const ab = new Vector3();

  for (let i = 0; i < positions.length; i += 9) {
    // positions

    const x = Math.random() * n - n2;
    const y = Math.random() * n - n2;
    const z = Math.random() * n - n2;

    const ax = x + Math.random() * d - d2;
    const ay = y + Math.random() * d - d2;
    const az = z + Math.random() * d - d2;

    const bx = x + Math.random() * d - d2;
    const by = y + Math.random() * d - d2;
    const bz = z + Math.random() * d - d2;

    const cx = x + Math.random() * d - d2;
    const cy = y + Math.random() * d - d2;
    const cz = z + Math.random() * d - d2;

    positions[i] = ax;
    positions[i + 1] = ay;
    positions[i + 2] = az;

    positions[i + 3] = bx;
    positions[i + 4] = by;
    positions[i + 5] = bz;

    positions[i + 6] = cx;
    positions[i + 7] = cy;
    positions[i + 8] = cz;

    // flat face normals

    pA.set(ax, ay, az);
    pB.set(bx, by, bz);
    pC.set(cx, cy, cz);

    cb.subVectors(pC, pB);
    ab.subVectors(pA, pB);
    cb.cross(ab);

    cb.normalize();

    const nx = cb.x;
    const ny = cb.y;
    const nz = cb.z;

    normals[i] = nx;
    normals[i + 1] = ny;
    normals[i + 2] = nz;

    normals[i + 3] = nx;
    normals[i + 4] = ny;
    normals[i + 5] = nz;

    normals[i + 6] = nx;
    normals[i + 7] = ny;
    normals[i + 8] = nz;

    // colors

    const vx = x / n + 0.5;
    const vy = y / n + 0.5;
    const vz = z / n + 0.5;

    color.setRGB(vx, vy, vz);

    colors[i] = color.r;
    colors[i + 1] = color.g;
    colors[i + 2] = color.b;

    colors[i + 3] = color.r;
    colors[i + 4] = color.g;
    colors[i + 5] = color.b;

    colors[i + 6] = color.r;
    colors[i + 7] = color.g;
    colors[i + 8] = color.b;
  }

  meshGeometry.setAttribute("position", new Attribute(positions, 3));
  meshGeometry.setAttribute("normal", new Attribute(normals, 3));
  meshGeometry.setAttribute("color", new Attribute(colors, 3));

  meshGeometry.computeBoundingSphere();

  const meshMaterial = new LambertMaterial({
    color: 0xaaaaaa,
    side: Side.Double,
    vertexColors: true,
  });

  const mesh = new Mesh(meshGeometry, meshMaterial);
  scene.add(mesh);

  //

  const raycaster = new Raycaster();

  const pointer = new Vector2();

  const lineGeometry = new Geometry();
  lineGeometry.setAttribute(
    "position",
    new Attribute(new Float32Array(4 * 3), 3),
  );

  const lineMaterial = new LineMaterial({
    color: 0xffffff,
    transparent: true,
  });

  const line = new Line(lineGeometry, lineMaterial);
  scene.add(line);

  //

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  //

  canvas.addEventListener("pointermove", onPointerMove);

  function onPointerMove(event) {
    pointerToNdc(event, canvas, pointer);
  }

  //

  function render() {
    const time = Date.now() * 0.001;

    mesh.rotation.x = time * 0.15;
    mesh.rotation.y = time * 0.25;

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObject(mesh);

    if (intersects.length > 0) {
      const intersect = intersects[0];
      const face = intersect.face;

      const linePosition = line.geometry.getAttribute("position");
      const meshPosition = mesh.geometry.getAttribute("position");

      linePosition.copyAt(0, meshPosition, face.a);
      linePosition.copyAt(1, meshPosition, face.b);
      linePosition.copyAt(2, meshPosition, face.c);
      linePosition.copyAt(3, meshPosition, face.a);

      mesh.updateMatrix();

      line.geometry.applyMatrix4(mesh.matrix);

      line.visible = true;
    } else {
      line.visible = false;
    }

    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }

  const animation = createExampleAnimationLoop(() => {
    render();
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
      canvas.removeEventListener("pointermove", onPointerMove);
      meshGeometry.dispose();
      meshMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const geometry = new EASEL.Geometry();
geometry.setAttribute("position", new EASEL.Attribute(positions, 3));
geometry.setAttribute("normal", new EASEL.Attribute(normals, 3));
geometry.setAttribute("color", new EASEL.Attribute(colors, 3));
geometry.computeBoundingSphere();

const mesh = new EASEL.Mesh(
  geometry,
  new EASEL.LambertMaterial({ color: 0xaaaaaa, side: EASEL.Side.Double, vertexColors: true }),
);
scene.add(mesh);

raycaster.setFromCamera(pointer, camera);
const intersect = raycaster.intersectObject(mesh)[0];
if (intersect) {
  const linePosition = line.geometry.getAttribute("position");
  const meshPosition = mesh.geometry.getAttribute("position");
  linePosition.copyAt(0, meshPosition, intersect.face.a);
  linePosition.copyAt(1, meshPosition, intersect.face.b);
  linePosition.copyAt(2, meshPosition, intersect.face.c);
  linePosition.copyAt(3, meshPosition, intersect.face.a);
  mesh.updateMatrix();
  line.geometry.applyMatrix4(mesh.matrix);
}
line.visible = intersect !== undefined;

renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };
