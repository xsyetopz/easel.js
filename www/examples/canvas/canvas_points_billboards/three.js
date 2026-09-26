// Adapted from three.js r186 examples/webgl_points_billboards.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";

import discBase64 from "../../../../assets/textures/sprites/disc.png.base64?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export function setup(canvas, params = {}) {
  let mouseX = 0;
  let mouseY = 0;

  const camera = new THREE.PerspectiveCamera(
    55,
    canvas.width / canvas.height,
    2,
    2000,
  );
  camera.position.z = 1000;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.001);

  const geometry = new THREE.BufferGeometry();
  const vertices = [];

  const sprite = new THREE.TextureLoader().load(
    `data:image/png;base64,${discBase64}`,
  );
  sprite.colorSpace = THREE.SRGBColorSpace;

  for (let i = 0; i < 10000; i++) {
    const x = 2000 * Math.random() - 1000;
    const y = 2000 * Math.random() - 1000;
    const z = 2000 * Math.random() - 1000;

    vertices.push(x, y, z);
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );

  const material = new THREE.PointsMaterial({
    size: 35,
    sizeAttenuation: (params.sizeAttenuation ?? "on") === "on",
    map: sprite,
    alphaTest: 0.5,
    transparent: true,
  });
  material.color.setHSL(1.0, 0.3, 0.7, THREE.SRGBColorSpace);

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  //

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setSize(canvas.width, canvas.height, false);

  //

  // The upstream page centers the pointer on the window; the embedded stage
  // listens on its canvas and centers on the canvas.
  function onPointerMove(event) {
    if (event.isPrimary === false) return;

    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left - rect.width / 2;
    mouseY = event.clientY - rect.top - rect.height / 2;
  }
  canvas.addEventListener("pointermove", onPointerMove);

  //

  function render() {
    const time = Date.now() * 0.00005;

    camera.position.x += (mouseX - camera.position.x) * 0.05;
    camera.position.y += (-mouseY - camera.position.y) * 0.05;

    camera.lookAt(scene.position);

    const h = ((360 * (1.0 + time)) % 360) / 360;
    material.color.setHSL(h, 0.5, 0.5);

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
    update(next) {
      if (next.sizeAttenuation !== undefined) {
        material.sizeAttenuation = next.sizeAttenuation === "on";
        material.needsUpdate = true;
      }
    },
    cleanup() {
      animation.cleanup();
      canvas.removeEventListener("pointermove", onPointerMove);
      geometry.dispose();
      material.dispose();
      sprite.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };
