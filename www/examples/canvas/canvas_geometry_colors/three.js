// Adapted from three.js r186 examples/webgl_geometry_colors.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export function setup(canvas) {
  let mouseX = 0;
  let mouseY = 0;

  const camera = new THREE.PerspectiveCamera(
    20,
    canvas.width / canvas.height,
    1,
    10000,
  );
  camera.position.z = 1800;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(0, 0, 1);
  scene.add(light);

  // shadow

  const shadowCanvas = canvas.ownerDocument.createElement("canvas");
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;

  const context = shadowCanvas.getContext("2d");
  const gradient = context.createRadialGradient(
    shadowCanvas.width / 2,
    shadowCanvas.height / 2,
    0,
    shadowCanvas.width / 2,
    shadowCanvas.height / 2,
    shadowCanvas.width / 2,
  );
  gradient.addColorStop(0.1, "rgba(210,210,210,1)");
  gradient.addColorStop(1, "rgba(255,255,255,1)");

  context.fillStyle = gradient;
  context.fillRect(0, 0, shadowCanvas.width, shadowCanvas.height);

  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);

  const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture });
  const shadowGeo = new THREE.PlaneGeometry(300, 300, 1, 1);

  let shadowMesh;

  shadowMesh = new THREE.Mesh(shadowGeo, shadowMaterial);
  shadowMesh.position.y = -250;
  shadowMesh.rotation.x = -Math.PI / 2;
  scene.add(shadowMesh);

  shadowMesh = new THREE.Mesh(shadowGeo, shadowMaterial);
  shadowMesh.position.y = -250;
  shadowMesh.position.x = -400;
  shadowMesh.rotation.x = -Math.PI / 2;
  scene.add(shadowMesh);

  shadowMesh = new THREE.Mesh(shadowGeo, shadowMaterial);
  shadowMesh.position.y = -250;
  shadowMesh.position.x = 400;
  shadowMesh.rotation.x = -Math.PI / 2;
  scene.add(shadowMesh);

  const radius = 200;

  const geometry1 = new THREE.IcosahedronGeometry(radius, 1);

  const count = geometry1.attributes.position.count;
  const arrayType =
    typeof Float16Array !== "undefined" ? Float16Array : Float32Array;
  geometry1.setAttribute(
    "color",
    new THREE.BufferAttribute(new arrayType(count * 3), 3),
  );

  const geometry2 = geometry1.clone();
  const geometry3 = geometry1.clone();

  const color = new THREE.Color();
  const positions1 = geometry1.attributes.position;
  const positions2 = geometry2.attributes.position;
  const positions3 = geometry3.attributes.position;
  const colors1 = geometry1.attributes.color;
  const colors2 = geometry2.attributes.color;
  const colors3 = geometry3.attributes.color;

  for (let i = 0; i < count; i++) {
    color.setHSL(
      (positions1.getY(i) / radius + 1) / 2,
      1.0,
      0.5,
      THREE.SRGBColorSpace,
    );
    colors1.setXYZ(i, color.r, color.g, color.b);

    color.setHSL(
      0,
      (positions2.getY(i) / radius + 1) / 2,
      0.5,
      THREE.SRGBColorSpace,
    );
    colors2.setXYZ(i, color.r, color.g, color.b);

    color.setRGB(
      1,
      0.8 - (positions3.getY(i) / radius + 1) / 2,
      0,
      THREE.SRGBColorSpace,
    );
    colors3.setXYZ(i, color.r, color.g, color.b);
  }

  const material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    flatShading: true,
    vertexColors: true,
    shininess: 0,
  });

  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    wireframe: true,
    transparent: true,
  });

  let mesh = new THREE.Mesh(geometry1, material);
  let wireframe = new THREE.Mesh(geometry1, wireframeMaterial);
  mesh.add(wireframe);
  mesh.position.x = -400;
  mesh.rotation.x = -1.87;
  scene.add(mesh);

  mesh = new THREE.Mesh(geometry2, material);
  wireframe = new THREE.Mesh(geometry2, wireframeMaterial);
  mesh.add(wireframe);
  mesh.position.x = 400;
  scene.add(mesh);

  mesh = new THREE.Mesh(geometry3, material);
  wireframe = new THREE.Mesh(geometry3, wireframeMaterial);
  mesh.add(wireframe);
  scene.add(mesh);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  // The upstream page listens on document and centers on the window; the
  // embedded stage listens on its canvas and centers on the canvas.
  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left - rect.width / 2;
    mouseY = event.clientY - rect.top - rect.height / 2;
  }
  canvas.addEventListener("pointermove", onPointerMove);

  //

  function render() {
    camera.position.x += (mouseX - camera.position.x) * 0.05;
    camera.position.y += (-mouseY - camera.position.y) * 0.05;

    camera.lookAt(scene.position);

    renderer.render(scene, camera);
  }

  const animation = createExampleAnimationLoop(render);

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
      shadowGeo.dispose();
      shadowTexture.dispose();
      shadowMaterial.dispose();
      geometry1.dispose();
      geometry2.dispose();
      geometry3.dispose();
      material.dispose();
      wireframeMaterial.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };
