// Adapted from three.js r186 examples/webgl_buffergeometry_indexed.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export function setup(canvas, params = {}) {
  //

  const camera = new THREE.PerspectiveCamera(
    27,
    canvas.width / canvas.height,
    1,
    3500,
  );
  camera.position.z = 64;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  //

  const light = new THREE.HemisphereLight();
  light.intensity = 3;
  scene.add(light);

  //

  const geometry = new THREE.BufferGeometry();

  const indices = [];

  const vertices = [];
  const normals = [];
  const colors = [];

  const size = 20;
  const segments = 10;

  const halfSize = size / 2;
  const segmentSize = size / segments;

  const _color = new THREE.Color();

  // generate vertices, normals and color data for a simple grid geometry

  for (let i = 0; i <= segments; i++) {
    const y = i * segmentSize - halfSize;

    for (let j = 0; j <= segments; j++) {
      const x = j * segmentSize - halfSize;

      vertices.push(x, -y, 0);
      normals.push(0, 0, 1);

      const r = x / size + 0.5;
      const g = y / size + 0.5;

      _color.setRGB(r, g, 1, THREE.SRGBColorSpace);

      colors.push(_color.r, _color.g, _color.b);
    }
  }

  // generate indices (data for element array buffer)

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * (segments + 1) + (j + 1);
      const b = i * (segments + 1) + j;
      const c = (i + 1) * (segments + 1) + j;
      const d = (i + 1) * (segments + 1) + (j + 1);

      // generate two faces (triangles) per iteration

      indices.push(a, b, d); // face one
      indices.push(b, c, d); // face two
    }
  }

  //

  geometry.setIndex(indices);
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.MeshPhongMaterial({
    side: THREE.DoubleSide,
    vertexColors: true,
  });
  material.wireframe = params.wireframe === "on";

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  //

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  //

  const animation = createExampleAnimationLoop(() => {
    const time = Date.now() * 0.001;

    mesh.rotation.x = time * 0.25;
    mesh.rotation.y = time * 0.5;

    renderer.render(scene, camera);
  });

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    },
    update(next) {
      if (next.wireframe !== undefined) {
        material.wireframe = next.wireframe === "on";
      }
    },
    cleanup() {
      animation.cleanup();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };
