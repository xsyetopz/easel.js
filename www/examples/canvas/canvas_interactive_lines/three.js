// Adapted from three.js r186 examples/webgl_interactive_lines.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";
import { pointerToNdc } from "../../../runtime/example-pointer.ts";

export function setup(canvas) {
  const pointer = new THREE.Vector2();
  const radius = 100;
  let theta = 0;

  const camera = new THREE.PerspectiveCamera(
    70,
    canvas.width / canvas.height,
    1,
    10000,
  );

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  const geometry = new THREE.SphereGeometry(5);
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });

  const sphereInter = new THREE.Mesh(geometry, material);
  sphereInter.visible = false;
  scene.add(sphereInter);

  const lineGeometry = new THREE.BufferGeometry();
  const points = [];

  const point = new THREE.Vector3();
  const direction = new THREE.Vector3();

  for (let i = 0; i < 50; i++) {
    direction.x += Math.random() - 0.5;
    direction.y += Math.random() - 0.5;
    direction.z += Math.random() - 0.5;
    direction.normalize().multiplyScalar(10);

    point.add(direction);
    points.push(point.x, point.y, point.z);
  }

  lineGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(points, 3),
  );

  const parentTransform = new THREE.Object3D();
  parentTransform.position.x = Math.random() * 40 - 20;
  parentTransform.position.y = Math.random() * 40 - 20;
  parentTransform.position.z = Math.random() * 40 - 20;

  parentTransform.rotation.x = Math.random() * 2 * Math.PI;
  parentTransform.rotation.y = Math.random() * 2 * Math.PI;
  parentTransform.rotation.z = Math.random() * 2 * Math.PI;

  parentTransform.scale.x = Math.random() + 0.5;
  parentTransform.scale.y = Math.random() + 0.5;
  parentTransform.scale.z = Math.random() + 0.5;

  const lineMaterials = [];

  for (let i = 0; i < 50; i++) {
    let object;

    const lineMaterial = new THREE.LineBasicMaterial({
      color: Math.random() * 0xffffff,
    });
    lineMaterials.push(lineMaterial);

    if (Math.random() > 0.5) {
      object = new THREE.Line(lineGeometry, lineMaterial);
    } else {
      object = new THREE.LineSegments(lineGeometry, lineMaterial);
    }

    object.position.x = Math.random() * 400 - 200;
    object.position.y = Math.random() * 400 - 200;
    object.position.z = Math.random() * 400 - 200;

    object.rotation.x = Math.random() * 2 * Math.PI;
    object.rotation.y = Math.random() * 2 * Math.PI;
    object.rotation.z = Math.random() * 2 * Math.PI;

    object.scale.x = Math.random() + 0.5;
    object.scale.y = Math.random() + 0.5;
    object.scale.z = Math.random() + 0.5;

    parentTransform.add(object);
  }

  scene.add(parentTransform);

  const raycaster = new THREE.Raycaster();
  raycaster.params.Line.threshold = 3;

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

    const intersects = raycaster.intersectObjects(
      parentTransform.children,
      true,
    );

    if (intersects.length > 0) {
      sphereInter.visible = true;
      sphereInter.position.copy(intersects[0].point);
    } else {
      sphereInter.visible = false;
    }

    renderer.render(scene, camera);
  }

  const animation = createExampleAnimationLoop(() => {
    render();
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
      geometry.dispose();
      material.dispose();
      lineGeometry.dispose();
      for (const lineMaterial of lineMaterials) lineMaterial.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };
