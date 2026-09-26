import {
  BasicMaterial,
  BoxGeometry,
  HemisphereLight,
  LambertMaterial,
  Mesh,
  OBB,
  OrbitControls,
  PerspectiveCamera,
  Raycaster,
  Renderer,
  Scene,
  Timer,
  Vector2,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";
import { pointerToNdc } from "../../../runtime/example-pointer.ts";

export const meta = {
  id: "canvas_math_obb",
  upstream: "webgl_math_obb",
  name: "math / obb",
  category: "canvas",
  animated: true,
  description:
    "One hundred rotating boxes test oriented bounding boxes against each other every frame, turning red on collision; click a box to pick it with an OBB ray test.",
  differences: [
    "EASEL bakes Lambert and hemisphere lighting per vertex on the CPU, so box faces show flat shading instead of per-pixel lighting.",
    "With the upstream hemisphere intensity of 4, EASEL's vertex lighting saturates nearly every face to full green or red, so the boxes look flatter than in three.js, where faces turned toward the ground color stay darker.",
    "The black wireframe hitbox is drawn with EASEL's CPU wireframe rasterizer without anti-aliasing.",
    "Both sides place, rotate, and scale the boxes with Math.random as upstream does, so the two canvases show different layouts and collisions.",
  ],
};
export const controls = [];

export function setup(canvas) {
  const objects = [];
  const mouse = new Vector2();

  const camera = new PerspectiveCamera({
    fov: 70,
    aspect: canvas.width / canvas.height,
    near: 1,
    far: 1000,
  });
  camera.position.set(0, 0, 75);

  const scene = new Scene();
  scene.background = 0xffffff;

  const timer = new Timer();
  timer.connect(canvas.ownerDocument);

  const raycaster = new Raycaster();

  const hemiLight = new HemisphereLight(0xffffff, 0x222222, 4);
  hemiLight.position.set(1, 1, 1);
  scene.add(hemiLight);

  const size = new Vector3(10, 5, 6);
  const geometry = new BoxGeometry(size.x, size.y, size.z);

  // setup OBB on geometry level (doing this manually for now)

  geometry.userData.obb = new OBB();
  geometry.userData.obb.halfSize.copy(size).multiplyScalar(0.5);

  for (let i = 0; i < 100; i++) {
    const object = new Mesh(
      geometry,
      new LambertMaterial({ color: 0x00ff00, vertexColors: false }),
    );
    object.matrixAutoUpdate = false;

    object.position.x = Math.random() * 80 - 40;
    object.position.y = Math.random() * 80 - 40;
    object.position.z = Math.random() * 80 - 40;

    object.rotation.x = Math.random() * 2 * Math.PI;
    object.rotation.y = Math.random() * 2 * Math.PI;
    object.rotation.z = Math.random() * 2 * Math.PI;

    object.scale.x = Math.random() + 0.5;
    object.scale.y = Math.random() + 0.5;
    object.scale.z = Math.random() + 0.5;

    scene.add(object);

    // bounding volume on object level (this will reflect the current world transform)

    object.userData.obb = new OBB();

    objects.push(object);
  }

  //

  const hitbox = new Mesh(
    geometry,
    new BasicMaterial({
      color: 0x000000,
      wireframe: true,
      vertexColors: false,
    }),
  );

  //

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  //

  const orbit = new OrbitControls(camera, canvas);
  orbit.enableDamping = true;

  //

  canvas.addEventListener("click", onClick);

  function onClick(event) {
    event.preventDefault();

    pointerToNdc(event, canvas, mouse);

    raycaster.setFromCamera(mouse, camera);

    const intersectionPoint = new Vector3();
    const intersections = [];

    for (let i = 0, il = objects.length; i < il; i++) {
      const object = objects[i];
      const obb = object.userData.obb;

      const ray = raycaster.ray;

      if (obb.intersectRay(ray, intersectionPoint) !== undefined) {
        const distance = ray.origin.distanceTo(intersectionPoint);
        intersections.push({ distance: distance, object: object });
      }
    }

    if (intersections.length > 0) {
      // determine closest intersection and highlight the respective 3D object

      intersections.sort(sortIntersections);

      intersections[0].object.add(hitbox);
    } else {
      const parent = hitbox.parent;

      if (parent) parent.remove(hitbox);
    }
  }

  function sortIntersections(a, b) {
    return a.distance - b.distance;
  }

  //

  const animation = createExampleAnimationLoop(() => {
    timer.update();

    orbit.update();

    // transform cubes

    const delta = timer.delta;

    for (let i = 0, il = objects.length; i < il; i++) {
      const object = objects[i];

      object.rotation.x += delta * Math.PI * 0.2;
      object.rotation.y += delta * Math.PI * 0.1;

      object.updateMatrix();
      object.updateMatrixWorld();

      // update OBB

      object.userData.obb.copy(object.geometry.userData.obb);
      object.userData.obb.applyMatrix4(object.matrixWorld);

      // reset

      object.material.color.hex = 0x00ff00;
    }

    // collision detection

    for (let i = 0, il = objects.length; i < il; i++) {
      const object = objects[i];
      const obb = object.userData.obb;

      for (let j = i + 1, jl = objects.length; j < jl; j++) {
        const objectToTest = objects[j];
        const obbToTest = objectToTest.userData.obb;

        // now perform intersection test

        if (obb.intersectsOBB(obbToTest) === true) {
          object.material.color.hex = 0xff0000;
          objectToTest.material.color.hex = 0xff0000;
        }
      }
    }

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
      canvas.removeEventListener("click", onClick);
      orbit.dispose();
      timer.dispose();
      geometry.dispose();
      for (const object of objects) object.material.dispose();
      hitbox.material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const geometry = new EASEL.BoxGeometry(10, 5, 6);
geometry.userData.obb = new EASEL.OBB();
geometry.userData.obb.halfSize.set(5, 2.5, 3);

const object = new EASEL.Mesh(
  geometry,
  new EASEL.LambertMaterial({ color: 0x00ff00, vertexColors: false }),
);
object.userData.obb = new EASEL.OBB();

object.updateMatrix();
object.updateMatrixWorld();
object.userData.obb.copy(geometry.userData.obb);
object.userData.obb.applyMatrix4(object.matrixWorld);

if (object.userData.obb.intersectsOBB(other.userData.obb)) {
  object.material.color.hex = 0xff0000;
}

const hit = object.userData.obb.intersectRay(raycaster.ray, point);
if (hit !== undefined) object.add(hitbox);`;

export const example = { meta, controls, setup, easelSource };
