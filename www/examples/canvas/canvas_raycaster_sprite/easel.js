import {
  Group,
  Node,
  OrbitControls,
  PerspectiveCamera,
  Raycaster,
  Renderer,
  Scene,
  Sprite,
  SpriteMaterial,
  Vector2,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";
import { pointerToNdc } from "../../../runtime/example-pointer.ts";

export const meta = {
  id: "canvas_raycaster_sprite",
  upstream: "webgl_raycaster_sprite",
  name: "raycaster / sprite",
  category: "canvas",
  animated: true,
  description:
    "Hover the pointer over rotated, offset, and nested sprites to pick them with a Raycaster.",
  differences: [
    "EASEL sprites have no sizeAttenuation option, so the small sprite scales with distance instead of keeping a fixed screen size.",
  ],
};
export const controls = [];

export function setup(canvas) {
  let selectedObject;
  const raycaster = new Raycaster();
  const pointer = new Vector2();

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  const scene = new Scene();
  scene.background = 0xffffff;

  const group = new Group();
  scene.add(group);

  const camera = new PerspectiveCamera({
    fov: 50,
    aspect: canvas.width / canvas.height,
    near: 1,
    far: 1000,
  });
  camera.position.set(15, 15, 15);
  camera.lookAt(scene.position);

  const orbit = new OrbitControls(camera, canvas);
  orbit.minDistance = 15;
  orbit.maxDistance = 250;

  const sprite1 = new Sprite(new SpriteMaterial({ color: "#69f" }));
  sprite1.position.set(6, 5, 5);
  sprite1.scale.set(2, 5, 1);
  group.add(sprite1);

  const sprite2 = new Sprite(new SpriteMaterial({ color: "#69f" }));
  sprite2.material.rotation = (Math.PI / 3) * 4;
  sprite2.position.set(8, -2, 2);
  sprite2.center.set(0.5, 0);
  sprite2.scale.set(0.1, 0.5, 0.1);
  group.add(sprite2);

  const group2 = new Node();
  group2.scale.set(1, 2, 1);
  group2.position.set(-5, 0, 0);
  group2.rotation.set(Math.PI / 2, 0, 0);
  group.add(group2);

  const sprite3 = new Sprite(new SpriteMaterial({ color: "#69f" }));
  sprite3.position.set(0, 2, 5);
  sprite3.scale.set(10, 2, 3);
  sprite3.center.set(-0.1, 0);
  sprite3.material.rotation = Math.PI / 3;
  group2.add(sprite3);

  function onPointerMove(event) {
    if (selectedObject) {
      selectedObject.material.color.set("#69f");
      selectedObject = undefined;
    }

    pointerToNdc(event, canvas, pointer);
    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObject(group, true);
    const res = intersects.find((hit) => hit?.object);
    if (res) {
      selectedObject = res.object;
      selectedObject.material.color.set("#f00");
    }
  }
  canvas.addEventListener("pointermove", onPointerMove);

  const animation = createExampleAnimationLoop(() => {
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
      canvas.removeEventListener("pointermove", onPointerMove);
      orbit.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const raycaster = new EASEL.Raycaster();
const pointer = new EASEL.Vector2();
const sprite = new EASEL.Sprite(new EASEL.SpriteMaterial({ color: "#69f" }));
sprite.center.set(-0.1, 0);
sprite.material.rotation = Math.PI / 3;
group.add(sprite);

canvas.addEventListener("pointermove", (event) => {
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(group, true)[0];
  if (hit) hit.object.material.color.set("#f00");
});`;

export const example = { meta, controls, setup, easelSource };
