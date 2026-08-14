import {
  BoxGeometry,
  Color,
  InstancedMesh,
  LambertMaterial,
  Raycaster,
} from "@/index.js";
import {
  createScene,
  instanceMatrix,
  pointerNdc,
  runLoop,
} from "./canvas_interaction_helpers.js";

export const meta = {
  id: "instance-selection",
  name: "Instance Selection",
  category: "interaction",
  animated: true,
  description: "Select one repeated prop inside a dense scene.",
};

export const controls = [];

export function setup(canvas) {
  const { scene, camera, renderer } = createScene(canvas, {
    cameraPosition: [6, 5, 10],
    target: [0, 0, 0],
  });
  const geometry = new BoxGeometry(0.7, 0.7, 0.7);
  const material = new LambertMaterial({ color: 0xffffff });
  const mesh = new InstancedMesh(geometry, material, 49);
  scene.add(mesh);
  const colors = [0x4d8fe3, 0x53b98b, 0xd88a56, 0x9b6cda];
  for (let index = 0; index < mesh.count; index++) {
    const column = index % 7;
    const row = Math.floor(index / 7);
    mesh.setMatrixAt(index, instanceMatrix([column - 3, 0, row - 3], 0, 0.9));
    mesh.setColorAt(index, new Color(colors[index % colors.length]));
  }
  const raycaster = new Raycaster();
  raycaster.pointsThreshold = 0.25;
  let pointer = { x: 0, y: 0 };
  let selected = -1;
  const baseColors = new Array(mesh.count);
  for (let index = 0; index < mesh.count; index++) {
    const color = new Color();
    mesh.getColorAt(index, color);
    baseColors[index] = color;
  }
  const removePointer = pointerNdc(canvas, (next) => {
    pointer = next;
  });

  return runLoop(
    renderer,
    scene,
    camera,
    (time) => {
      for (let index = 0; index < mesh.count; index++) {
        const column = index % 7;
        const row = Math.floor(index / 7);
        mesh.setMatrixAt(
          index,
          instanceMatrix(
            [column - 3, Math.sin(time * 1.5 + index * 0.2) * 0.15, row - 3],
            time * 0.5,
            0.9,
          ),
        );
      }
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(mesh, false)[0];
      const nextSelected = hit?.instanceId ?? -1;
      if (nextSelected !== selected) {
        if (selected >= 0) mesh.setColorAt(selected, baseColors[selected]);
        selected = nextSelected;
        if (selected >= 0) mesh.setColorAt(selected, new Color(0xffdd66));
      }
    },
    [removePointer],
  );
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
raycaster.setFromCamera(pointer, camera);
const hit = raycaster.intersectObject(instancedMesh, false)[0];
const selectedId = hit?.instanceId ?? -1;`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
