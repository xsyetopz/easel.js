// Adapted from three.js r186 examples/webgl_math_obb.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { OBB } from "three/addons/math/OBB.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";
import { pointerToNdc } from "../../../runtime/example-pointer.ts";

export function setup(canvas) {
  const objects = [];
  const mouse = new THREE.Vector2();

  const camera = new THREE.PerspectiveCamera(
    70,
    canvas.width / canvas.height,
    1,
    1000,
  );
  camera.position.set(0, 0, 75);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const timer = new THREE.Timer();
  timer.connect(canvas.ownerDocument);

  const raycaster = new THREE.Raycaster();

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x222222, 4);
  hemiLight.position.set(1, 1, 1);
  scene.add(hemiLight);

  const size = new THREE.Vector3(10, 5, 6);
  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);

  // setup OBB on geometry level (doing this manually for now)

  geometry.userData.obb = new OBB();
  geometry.userData.obb.halfSize.copy(size).multiplyScalar(0.5);

  for (let i = 0; i < 100; i++) {
    const object = new THREE.Mesh(
      geometry,
      new THREE.MeshLambertMaterial({ color: 0x00ff00 }),
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

  const hitbox = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true }),
  );

  //

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  //

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  //

  canvas.addEventListener("click", onClick);

  function onClick(event) {
    event.preventDefault();

    pointerToNdc(event, canvas, mouse);

    raycaster.setFromCamera(mouse, camera);

    const intersectionPoint = new THREE.Vector3();
    const intersections = [];

    for (let i = 0, il = objects.length; i < il; i++) {
      const object = objects[i];
      const obb = object.userData.obb;

      const ray = raycaster.ray;

      if (obb.intersectRay(ray, intersectionPoint) !== null) {
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

    controls.update();

    // transform cubes

    const delta = timer.getDelta();

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

      object.material.color.setHex(0x00ff00);
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
          object.material.color.setHex(0xff0000);
          objectToTest.material.color.setHex(0xff0000);
        }
      }
    }

    renderer.render(scene, camera);
  });

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    },
    cleanup() {
      animation.cleanup();
      canvas.removeEventListener("click", onClick);
      controls.dispose();
      timer.dispose();
      geometry.dispose();
      for (const object of objects) object.material.dispose();
      hitbox.material.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };
