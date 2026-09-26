// Adapted from three.js r186 examples/webgl_raycaster_sprite.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";
import { pointerToNdc } from "../../../runtime/example-pointer.ts";

export function setup(canvas) {
  let selectedObject = null;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const group = new THREE.Group();
  scene.add(group);

  const camera = new THREE.PerspectiveCamera(
    50,
    canvas.width / canvas.height,
    1,
    1000,
  );
  camera.position.set(15, 15, 15);
  camera.lookAt(scene.position);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 15;
  controls.maxDistance = 250;

  const sprite1 = new THREE.Sprite(new THREE.SpriteMaterial({ color: "#69f" }));
  sprite1.position.set(6, 5, 5);
  sprite1.scale.set(2, 5, 1);
  group.add(sprite1);

  const sprite2 = new THREE.Sprite(
    new THREE.SpriteMaterial({ color: "#69f", sizeAttenuation: false }),
  );
  sprite2.material.rotation = (Math.PI / 3) * 4;
  sprite2.position.set(8, -2, 2);
  sprite2.center.set(0.5, 0);
  sprite2.scale.set(0.1, 0.5, 0.1);
  group.add(sprite2);

  const group2 = new THREE.Object3D();
  group2.scale.set(1, 2, 1);
  group2.position.set(-5, 0, 0);
  group2.rotation.set(Math.PI / 2, 0, 0);
  group.add(group2);

  const sprite3 = new THREE.Sprite(new THREE.SpriteMaterial({ color: "#69f" }));
  sprite3.position.set(0, 2, 5);
  sprite3.scale.set(10, 2, 3);
  sprite3.center.set(-0.1, 0);
  sprite3.material.rotation = Math.PI / 3;
  group2.add(sprite3);

  function onPointerMove(event) {
    if (selectedObject) {
      selectedObject.material.color.set("#69f");
      selectedObject = null;
    }

    pointerToNdc(event, canvas, pointer);
    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObject(group, true);
    if (intersects.length > 0) {
      const res = intersects.filter((res) => res?.object)[0];
      if (res?.object) {
        selectedObject = res.object;
        selectedObject.material.color.set("#f00");
      }
    }
  }
  canvas.addEventListener("pointermove", onPointerMove);

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
      controls.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };
