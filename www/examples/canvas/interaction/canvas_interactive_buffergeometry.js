import { Geometry, LambertMaterial, Mesh, Raycaster } from "@/index.js";
import {
  createScene,
  pointerNdc,
  runLoop,
} from "./canvas_interaction_helpers.js";

export const meta = {
  id: "webgl_interactive_buffergeometry",
  name: "Interactive Buffer Geometry",
  category: "canvas",
  description:
    "A pointer-driven height field edits Geometry and Attribute data directly; EASEL's CPU channels replace WebGL BufferGeometry and shader uniforms.",
};

export const controls = [];

function makeGrid(size = 10, segments = 18) {
  const positions = [];
  for (let z = 0; z <= segments; z++) {
    for (let x = 0; x <= segments; x++) {
      positions.push(
        (x / segments - 0.5) * size,
        0,
        (z / segments - 0.5) * size,
      );
    }
  }
  return new Geometry().setPositions(new Float32Array(positions));
}

export function setup(canvas) {
  const { scene, camera, renderer } = createScene(canvas, {
    cameraPosition: [6, 6, 8],
    target: [0, 0, 0],
  });
  const geometry = makeGrid();
  const segments = 18;
  const indices = [];
  const row = segments + 1;
  for (let z = 0; z < segments; z++) {
    for (let x = 0; x < segments; x++) {
      const a = z * row + x;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  geometry.index = indices;
  geometry.computeVertexNormals();
  const material = new LambertMaterial({ color: 0x4b9dc4 });
  const mesh = new Mesh(geometry, material);
  scene.add(mesh);
  const pointer = { x: 0, y: 0 };
  const raycaster = new Raycaster();
  const removePointer = pointerNdc(canvas, (next) => {
    pointer.x = next.x;
    pointer.y = next.y;
  });
  const base = new Float32Array(geometry.getAttribute("position").array);

  return runLoop(
    renderer,
    scene,
    camera,
    (time) => {
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(mesh, false)[0];
      const position = geometry.getAttribute("position");
      for (let index = 0; index < position.count; index++) {
        const offset = index * 3;
        const x = base[offset];
        const z = base[offset + 2];
        let height = Math.sin(time * 1.5 + x * 1.4 + z * 0.9) * 0.12;
        if (hit) {
          const dx = x - hit.point.x;
          const dz = z - hit.point.z;
          const distance = Math.sqrt(dx * dx + dz * dz);
          height += Math.max(0, 0.65 - distance) * 0.55;
        }
        position.setY(index, height);
      }
      position.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
    },
    [removePointer],
  );
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const geometry = new EASEL.Geometry().setPositions(positionArray);
geometry.index = triangleIndices;
const attribute = geometry.getAttribute("position");
attribute.setY(vertex, height);
attribute.needsUpdate = true;`;

export const threeSource = `import * as THREE from "three";

const geometry = new THREE.BufferGeometry().setAttribute("position", positionAttribute);
geometry.setIndex(triangleIndices);
const attribute = geometry.getAttribute("position");
attribute.setY(vertex, height);
attribute.needsUpdate = true;`;

export const example = { meta, controls, setup, easelSource, threeSource };
