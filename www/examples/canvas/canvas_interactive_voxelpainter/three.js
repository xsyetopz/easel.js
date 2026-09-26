// Adapted from three.js r186 examples/webgl_interactive_voxelpainter.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";

import squareOutlineBase64 from "../../../../assets/textures/square-outline-textured.png.base64?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";
import { pointerToNdc } from "../../../runtime/example-pointer.ts";

export function setup(canvas) {
  let isShiftDown = false;

  const objects = [];

  const camera = new THREE.PerspectiveCamera(
    45,
    canvas.width / canvas.height,
    1,
    10000,
  );
  camera.position.set(500, 800, 1300);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  // roll-over helpers

  const rollOverGeo = new THREE.BoxGeometry(50, 50, 50);
  const rollOverMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    opacity: 0.5,
    transparent: true,
  });
  const rollOverMesh = new THREE.Mesh(rollOverGeo, rollOverMaterial);
  scene.add(rollOverMesh);

  // cubes

  const map = new THREE.TextureLoader().load(
    `data:image/png;base64,${squareOutlineBase64}`,
  );
  map.colorSpace = THREE.SRGBColorSpace;
  const cubeGeo = new THREE.BoxGeometry(50, 50, 50);
  const cubeMaterial = new THREE.MeshLambertMaterial({
    color: 0xfeb74c,
    map: map,
  });

  // grid

  const gridHelper = new THREE.GridHelper(1000, 20);
  scene.add(gridHelper);

  //

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const geometry = new THREE.PlaneGeometry(1000, 1000);
  geometry.rotateX(-Math.PI / 2);

  const planeMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const plane = new THREE.Mesh(geometry, planeMaterial);
  scene.add(plane);

  objects.push(plane);

  // lights

  const ambientLight = new THREE.AmbientLight(0x606060, 3);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
  directionalLight.position.set(1, 0.75, 0.5).normalize();
  scene.add(directionalLight);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  function onPointerMove(event) {
    pointerToNdc(event, canvas, pointer);

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(objects, false);

    if (intersects.length > 0) {
      const intersect = intersects[0];

      rollOverMesh.position.copy(intersect.point).add(intersect.face.normal);
      rollOverMesh.position
        .divideScalar(50)
        .floor()
        .multiplyScalar(50)
        .addScalar(25);
    }
  }

  function onPointerDown(event) {
    // The upstream page tracks Shift with document key listeners; the
    // embedded stage reads it from the pointer event on its canvas.
    isShiftDown = event.shiftKey === true;

    pointerToNdc(event, canvas, pointer);

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(objects, false);

    if (intersects.length > 0) {
      const intersect = intersects[0];

      // delete cube

      if (isShiftDown) {
        if (intersect.object !== plane) {
          scene.remove(intersect.object);

          objects.splice(objects.indexOf(intersect.object), 1);
        }

        // create cube
      } else {
        const voxel = new THREE.Mesh(cubeGeo, cubeMaterial);
        voxel.position.copy(intersect.point).add(intersect.face.normal);
        voxel.position
          .divideScalar(50)
          .floor()
          .multiplyScalar(50)
          .addScalar(25);
        scene.add(voxel);

        objects.push(voxel);
      }
    }
  }

  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerdown", onPointerDown);

  // The upstream page renders on demand; the site drives every example with
  // an animation loop.
  const animation = createExampleAnimationLoop(() => {
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
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      rollOverGeo.dispose();
      rollOverMaterial.dispose();
      cubeGeo.dispose();
      cubeMaterial.dispose();
      map.dispose();
      gridHelper.dispose();
      geometry.dispose();
      planeMaterial.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };
