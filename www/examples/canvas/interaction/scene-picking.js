import { BoxGeometry, LambertMaterial, Mesh, Raycaster } from "@/index.js";
import {
  createScene,
  pointerNdc,
  runLoop,
} from "./canvas_interaction_helpers.js";

export const meta = {
  id: "scene-picking",
  name: "Scene Picking",
  category: "interaction",
  animated: true,
  description: "Pick a scene object and highlight the current selection.",
};

export const controls = [];

export function setup(canvas) {
  const { scene, camera, renderer } = createScene(canvas, {
    cameraPosition: [6, 5, 9],
    target: [0, 0, 0],
  });
  const cubes = [];
  const materials = [];
  const colors = [0xd96060, 0x5c9fe4, 0x63bf86, 0xe2b75c];
  for (let index = 0; index < 36; index++) {
    const material = new LambertMaterial({
      color: colors[index % colors.length],
    });
    const cube = new Mesh(new BoxGeometry(0.8, 0.8, 0.8), material);
    cube.position.set((index % 6) - 2.5, 0, Math.floor(index / 6) - 2.5);
    scene.add(cube);
    cubes.push(cube);
    materials.push(material);
  }
  const raycaster = new Raycaster();
  let pointer = { x: 0, y: 0 };
  let selected = -1;
  const removePointer = pointerNdc(canvas, (next) => {
    pointer = next;
  });
  const highlight = 0xffe16b;

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
          materials[selected].color.set(colors[selected % colors.length]);
        }
        selected = nextSelected;
        if (selected >= 0) materials[selected].color.set(highlight);
      }
      for (let index = 0; index < cubes.length; index++) {
        const pulse = 1 + Math.sin(time * 1.8 + index * 0.24) * 0.04;
        const scale = index === selected ? 1.18 : pulse;
        cubes[index].scale.set(scale, scale, scale);
      }
    },
    [removePointer],
  );
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
raycaster.setFromCamera(pointer, camera);
const hit = raycaster.intersectObjects(cubes, false)[0];
selected.material.color.set(0xffe16b);`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
