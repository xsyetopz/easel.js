// Adapted from three.js r186 examples/webgl_interactive_cubes_ortho.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";
import { pointerToNdc } from "../../../runtime/example-pointer.ts";

export function setup(canvas) {
  let theta = 0;
  let INTERSECTED = null;

  const pointer = new THREE.Vector2();
  const radius = 25;
  const frustumSize = 50;

  const aspect = canvas.width / canvas.height;
  const camera = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    100,
  );

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(1, 1, 1).normalize();
  scene.add(light);

  const geometry = new THREE.BoxGeometry();
  const materials = [];

  for (let i = 0; i < 2000; i++) {
    const material = new THREE.MeshLambertMaterial({
      color: Math.random() * 0xffffff,
    });
    materials.push(material);
    const object = new THREE.Mesh(geometry, material);

    object.position.x = Math.random() * 40 - 20;
    object.position.y = Math.random() * 40 - 20;
    object.position.z = Math.random() * 40 - 20;

    object.rotation.x = Math.random() * 2 * Math.PI;
    object.rotation.y = Math.random() * 2 * Math.PI;
    object.rotation.z = Math.random() * 2 * Math.PI;

    object.scale.x = Math.random() + 0.5;
    object.scale.y = Math.random() + 0.5;
    object.scale.z = Math.random() + 0.5;

    scene.add(object);
  }

  const raycaster = new THREE.Raycaster();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  canvas.addEventListener("pointermove", onPointerMove);

  function onPointerMove(event) {
    pointerToNdc(event, canvas, pointer);
  }

  //

  function render() {
    theta += 0.1;

    camera.position.x = radius * Math.sin(THREE.MathUtils.degToRad(theta));
    camera.position.y = radius * Math.sin(THREE.MathUtils.degToRad(theta));
    camera.position.z = radius * Math.cos(THREE.MathUtils.degToRad(theta));
    camera.lookAt(scene.position);

    camera.updateMatrixWorld();

    // find intersections

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(scene.children, false);

    if (intersects.length > 0) {
      if (INTERSECTED !== intersects[0].object) {
        if (INTERSECTED)
          INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);

        INTERSECTED = intersects[0].object;
        INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
        INTERSECTED.material.emissive.setHex(0xff0000);
      }
    } else {
      if (INTERSECTED)
        INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);

      INTERSECTED = null;
    }

    renderer.render(scene, camera);
  }

  const animation = createExampleAnimationLoop(() => {
    render();
  });

  return {
    ...animation,
    resize(width, height) {
      const aspect = width / height;

      camera.left = (-frustumSize * aspect) / 2;
      camera.right = (frustumSize * aspect) / 2;
      camera.top = frustumSize / 2;
      camera.bottom = -frustumSize / 2;

      camera.updateProjectionMatrix();

      renderer.setSize(width, height, false);
    },
    cleanup() {
      animation.cleanup();
      canvas.removeEventListener("pointermove", onPointerMove);
      geometry.dispose();
      for (const material of materials) material.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };
