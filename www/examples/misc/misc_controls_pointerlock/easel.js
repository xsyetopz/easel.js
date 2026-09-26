import {
  Attribute,
  BasicMaterial,
  BoxGeometry,
  Color,
  Fog,
  HemisphereLight,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  PointerLockControls,
  Raycaster,
  Renderer,
  Scene,
  Shading,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "misc_controls_pointerlock",
  upstream: "misc_controls_pointerlock",
  name: "controls / pointerlock",
  category: "misc",
  animated: true,
  description:
    "Click the canvas to lock the pointer, then walk with WASD or the arrow keys, jump with Space, and look around with the mouse over a field of 500 colored boxes.",
  differences: [
    "There is no Click to play overlay with instructions; the canvas locks the pointer when clicked, and the keys listen on the focused canvas instead of document.",
    "MeshPhongMaterial becomes LambertMaterial with flat shading, so the boxes have no white specular highlight.",
  ],
};
export const controls = [];

export function setup(canvas) {
  const objects = [];

  let moveForward = false;
  let moveBackward = false;
  let moveLeft = false;
  let moveRight = false;
  let canJump = false;

  let prevTime = performance.now();
  const velocity = new Vector3();
  const direction = new Vector3();
  const vertex = new Vector3();
  const color = new Color();

  const camera = new PerspectiveCamera({
    fov: 75,
    aspect: canvas.width / canvas.height,
    near: 1,
    far: 1000,
  });
  camera.position.y = 10;

  const scene = new Scene();
  scene.background = 0xffffff;
  scene.fog = new Fog({ color: 0xffffff, near: 0, far: 750 });

  const light = new HemisphereLight(0xeeeeff, 0x777788, 2.5);
  light.position.set(0.5, 1, 0.75);
  scene.add(light);

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  const controls = new PointerLockControls(camera, canvas);

  function onClick() {
    controls.lock();
  }
  canvas.addEventListener("click", onClick);

  scene.add(controls.object);

  function onKeyDown(event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = true;
        break;

      case "ArrowLeft":
      case "KeyA":
        moveLeft = true;
        break;

      case "ArrowDown":
      case "KeyS":
        moveBackward = true;
        break;

      case "ArrowRight":
      case "KeyD":
        moveRight = true;
        break;

      case "Space":
        if (canJump === true) velocity.y += 350;
        canJump = false;
        break;
    }
  }

  function onKeyUp(event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = false;
        break;

      case "ArrowLeft":
      case "KeyA":
        moveLeft = false;
        break;

      case "ArrowDown":
      case "KeyS":
        moveBackward = false;
        break;

      case "ArrowRight":
      case "KeyD":
        moveRight = false;
        break;
    }
  }

  const previousTabIndex = canvas.tabIndex;
  canvas.tabIndex = 0;
  canvas.addEventListener("keydown", onKeyDown);
  canvas.addEventListener("keyup", onKeyUp);

  const raycaster = new Raycaster(new Vector3(), new Vector3(0, -1, 0), 0, 10);

  // floor

  let floorGeometry = new PlaneGeometry(2000, 2000, 100, 100);
  floorGeometry.rotateX(-Math.PI / 2);

  // vertex displacement

  let position = floorGeometry.getAttribute("position");

  for (let i = 0, l = position.count; i < l; i++) {
    vertex.fromBufferAttribute(position, i);

    vertex.x += Math.random() * 20 - 10;
    vertex.y += Math.random() * 2;
    vertex.z += Math.random() * 20 - 10;

    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  const indexedFloorGeometry = floorGeometry;
  floorGeometry = floorGeometry.toNonIndexed(); // ensure each face has unique vertices
  indexedFloorGeometry.dispose();

  position = floorGeometry.getAttribute("position");
  const colorsFloor = [];

  for (let i = 0, l = position.count; i < l; i++) {
    color.setHSL(Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75);
    colorsFloor.push(color.r, color.g, color.b);
  }

  floorGeometry.setAttribute(
    "color",
    new Attribute(new Float32Array(colorsFloor), 3),
  );

  const floorMaterial = new BasicMaterial({
    color: 0xffffff,
    vertexColors: true,
  });

  const floor = new Mesh(floorGeometry, floorMaterial);
  scene.add(floor);

  // objects

  const indexedBoxGeometry = new BoxGeometry(20, 20, 20);
  const boxGeometry = indexedBoxGeometry.toNonIndexed();
  indexedBoxGeometry.dispose();

  position = boxGeometry.getAttribute("position");
  const colorsBox = [];

  for (let i = 0, l = position.count; i < l; i++) {
    color.setHSL(Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75);
    colorsBox.push(color.r, color.g, color.b);
  }

  boxGeometry.setAttribute(
    "color",
    new Attribute(new Float32Array(colorsBox), 3),
  );

  for (let i = 0; i < 500; i++) {
    const boxMaterial = new LambertMaterial({
      color: 0xffffff,
      shading: Shading.Flat,
      vertexColors: true,
    });
    boxMaterial.color.setHSL(
      Math.random() * 0.2 + 0.5,
      0.75,
      Math.random() * 0.25 + 0.75,
    );

    const box = new Mesh(boxGeometry, boxMaterial);
    box.position.x = Math.floor(Math.random() * 20 - 10) * 20;
    box.position.y = Math.floor(Math.random() * 20) * 20 + 10;
    box.position.z = Math.floor(Math.random() * 20 - 10) * 20;

    scene.add(box);
    objects.push(box);
  }

  function animate() {
    const time = performance.now();

    if (controls.isLocked === true) {
      raycaster.ray.origin.copy(controls.object.position);
      raycaster.ray.origin.y -= 10;

      const intersections = raycaster.intersectObjects(objects, false);

      const onObject = intersections.length > 0;

      const delta = (time - prevTime) / 1000;

      velocity.x -= velocity.x * 10.0 * delta;
      velocity.z -= velocity.z * 10.0 * delta;

      velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

      direction.z = Number(moveForward) - Number(moveBackward);
      direction.x = Number(moveRight) - Number(moveLeft);
      direction.normalize(); // this ensures consistent movements in all directions

      if (moveForward || moveBackward)
        velocity.z -= direction.z * 400.0 * delta;
      if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

      if (onObject === true) {
        velocity.y = Math.max(0, velocity.y);
        canJump = true;
      }

      controls.moveRight(-velocity.x * delta);
      controls.moveForward(-velocity.z * delta);

      controls.object.position.y += velocity.y * delta; // new behavior

      if (controls.object.position.y < 10) {
        velocity.y = 0;
        controls.object.position.y = 10;

        canJump = true;
      }
    }

    prevTime = time;

    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }

  const animation = createExampleAnimationLoop(animate);

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
      canvas.removeEventListener("keydown", onKeyDown);
      canvas.removeEventListener("keyup", onKeyUp);
      canvas.tabIndex = previousTabIndex;
      if (canvas.ownerDocument?.pointerLockElement === canvas)
        controls.unlock();
      controls.dispose();
      floorGeometry.dispose();
      floorMaterial.dispose();
      boxGeometry.dispose();
      for (const box of objects) box.material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const controls = new EASEL.PointerLockControls(camera, canvas);
canvas.addEventListener("click", () => controls.lock());

const raycaster = new EASEL.Raycaster(
  new EASEL.Vector3(),
  new EASEL.Vector3(0, -1, 0),
  0,
  10,
);

function animate() {
  if (controls.isLocked) {
    raycaster.ray.origin.copy(controls.object.position);
    raycaster.ray.origin.y -= 10;
    const onObject = raycaster.intersectObjects(objects, false).length > 0;
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
  }
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
}`;

export const example = { meta, controls, setup, easelSource };
