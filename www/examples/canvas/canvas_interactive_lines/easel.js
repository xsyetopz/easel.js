import {
  Attribute,
  BasicMaterial,
  Geometry,
  Line,
  LineMaterial,
  LineSegments,
  Mesh,
  Node,
  PerspectiveCamera,
  Raycaster,
  Renderer,
  Scene,
  SphereGeometry,
  toRadians,
  Vector2,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";
import { pointerToNdc } from "../../../runtime/example-pointer.ts";

export const meta = {
  id: "canvas_interactive_lines",
  upstream: "webgl_interactive_lines",
  name: "interactive / lines",
  category: "canvas",
  animated: true,
  description:
    "Fifty randomly colored Line and LineSegments copies of one random walk, nested under a random parent transform, are raycast every frame so a red sphere marks the line under the pointer while the camera slowly orbits.",
  differences: [
    "The three.js renderer enables antialias; EASEL rasterizes the lines and the red marker sphere on the CPU without anti-aliasing, so their edges are jagged.",
  ],
};
export const controls = [];

export function setup(canvas) {
  const pointer = new Vector2();
  const radius = 100;
  let theta = 0;

  const camera = new PerspectiveCamera({
    fov: 70,
    aspect: canvas.width / canvas.height,
    near: 1,
    far: 10000,
  });

  const scene = new Scene();
  scene.background = 0xf0f0f0;

  const geometry = new SphereGeometry(5, 32, 16);
  const material = new BasicMaterial({
    color: 0xff0000,
    vertexColors: false,
  });

  const sphereInter = new Mesh(geometry, material);
  sphereInter.visible = false;
  scene.add(sphereInter);

  const lineGeometry = new Geometry();
  const points = [];

  const point = new Vector3();
  const direction = new Vector3();

  for (let i = 0; i < 50; i++) {
    direction.x += Math.random() - 0.5;
    direction.y += Math.random() - 0.5;
    direction.z += Math.random() - 0.5;
    direction.normalize().multiplyScalar(10);

    point.add(direction);
    points.push(point.x, point.y, point.z);
  }

  lineGeometry.setAttribute(
    "position",
    new Attribute(new Float32Array(points), 3),
  );

  const parentTransform = new Node();
  parentTransform.position.x = Math.random() * 40 - 20;
  parentTransform.position.y = Math.random() * 40 - 20;
  parentTransform.position.z = Math.random() * 40 - 20;

  parentTransform.rotation.x = Math.random() * 2 * Math.PI;
  parentTransform.rotation.y = Math.random() * 2 * Math.PI;
  parentTransform.rotation.z = Math.random() * 2 * Math.PI;

  parentTransform.scale.x = Math.random() + 0.5;
  parentTransform.scale.y = Math.random() + 0.5;
  parentTransform.scale.z = Math.random() + 0.5;

  const lineMaterials = [];

  for (let i = 0; i < 50; i++) {
    let object;

    const lineMaterial = new LineMaterial({
      color: Math.random() * 0xffffff,
    });
    lineMaterials.push(lineMaterial);

    if (Math.random() > 0.5) {
      object = new Line(lineGeometry, lineMaterial);
    } else {
      object = new LineSegments(lineGeometry, lineMaterial);
    }

    object.position.x = Math.random() * 400 - 200;
    object.position.y = Math.random() * 400 - 200;
    object.position.z = Math.random() * 400 - 200;

    object.rotation.x = Math.random() * 2 * Math.PI;
    object.rotation.y = Math.random() * 2 * Math.PI;
    object.rotation.z = Math.random() * 2 * Math.PI;

    object.scale.x = Math.random() + 0.5;
    object.scale.y = Math.random() + 0.5;
    object.scale.z = Math.random() + 0.5;

    parentTransform.add(object);
  }

  scene.add(parentTransform);

  const raycaster = new Raycaster();
  raycaster.lineThreshold = 3;

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  canvas.addEventListener("pointermove", onPointerMove);

  function onPointerMove(event) {
    pointerToNdc(event, canvas, pointer);
  }

  //

  function render() {
    theta += 0.1;

    camera.position.x = radius * Math.sin(toRadians(theta));
    camera.position.y = radius * Math.sin(toRadians(theta));
    camera.position.z = radius * Math.cos(toRadians(theta));
    camera.updateMatrixWorld();
    camera.lookAt(scene.position);

    camera.updateMatrixWorld();

    // find intersections

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(
      parentTransform.children,
      true,
    );

    if (intersects.length > 0) {
      sphereInter.visible = true;
      sphereInter.position.copy(intersects[0].point);
    } else {
      sphereInter.visible = false;
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
      geometry.dispose();
      material.dispose();
      lineGeometry.dispose();
      for (const lineMaterial of lineMaterials) lineMaterial.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const lineGeometry = new EASEL.Geometry();
lineGeometry.setAttribute("position", new EASEL.Attribute(new Float32Array(points), 3));
const material = new EASEL.LineMaterial({ color: Math.random() * 0xffffff });
const object = Math.random() > 0.5
  ? new EASEL.Line(lineGeometry, material)
  : new EASEL.LineSegments(lineGeometry, material);
parentTransform.add(object);

const raycaster = new EASEL.Raycaster();
raycaster.lineThreshold = 3;

camera.updateMatrixWorld();
camera.lookAt(scene.position);
camera.updateMatrixWorld();
raycaster.setFromCamera(pointer, camera);
const hit = raycaster.intersectObjects(parentTransform.children, true)[0];
sphereInter.visible = hit !== undefined;
if (hit) sphereInter.position.copy(hit.point);

renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };
