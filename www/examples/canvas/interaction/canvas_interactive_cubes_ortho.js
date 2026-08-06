import { BoxGeometry, LambertMaterial, Mesh, Raycaster } from "@/index.js";
import {
  createScene,
  pointerNdc,
  runLoop,
} from "./canvas_interaction_helpers.js";

export const meta = {
  id: "webgl_interactive_cubes_ortho",
  name: "Interactive Cubes (Orthographic)",
  category: "canvas",
  description:
    "The same CPU pointer-picking interaction viewed through an OrthographicCamera, with no perspective-only assumptions.",
};

export const controls = [];

export function setup(canvas) {
  const { scene, camera, renderer } = createScene(canvas, {
    orthographic: true,
    frustum: 6,
    cameraPosition: [6, 6, 9],
    target: [0, 0, 0],
  });
  const cubes = [];
  const colors = [0xc95f72, 0x608fd1, 0x60ae88, 0xd6a64e];
  for (let index = 0; index < 49; index++) {
    const material = new LambertMaterial({
      color: colors[index % colors.length],
    });
    const cube = new Mesh(new BoxGeometry(0.72, 0.72, 0.72), material);
    cube.position.set((index % 7) - 3, 0, Math.floor(index / 7) - 3);
    scene.add(cube);
    cubes.push(cube);
  }
  const raycaster = new Raycaster();
  let pointer = { x: 0, y: 0 };
  let selected = -1;
  const removePointer = pointerNdc(canvas, (next) => {
    pointer = next;
  });

  return runLoop(
    renderer,
    scene,
    camera,
    (time) => {
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(cubes, false)[0];
      const nextSelected = hit ? cubes.indexOf(hit.object) : -1;
      if (nextSelected !== selected) {
        if (selected >= 0) {
          cubes[selected].material.color.set(colors[selected % colors.length]);
        }
        selected = nextSelected;
        if (selected >= 0) cubes[selected].material.color.set(0xffe16b);
      }
      for (let index = 0; index < cubes.length; index++) {
        const scale =
          index === selected ? 1.22 : 1 + Math.sin(time + index * 0.18) * 0.035;
        cubes[index].scale.set(scale, scale, scale);
      }
    },
    [removePointer],
  );
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const camera = new EASEL.OrthographicCamera({ left: -6, right: 6, top: 3.5, bottom: -3.5 });
raycaster.setFromCamera(pointer, camera);
const hit = raycaster.intersectObjects(cubes, false)[0];`;

export const threeSource = `import * as THREE from "three";

const camera = new THREE.OrthographicCamera(-6, 6, 3.5, -3.5);
raycaster.setFromCamera(pointer, camera);
const hit = raycaster.intersectObjects(cubes, false)[0];`;

export const example = { meta, controls, setup, easelSource, threeSource };
