// Adapted from three.js r186 examples/misc_exporter_obj.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { OBJExporter } from "three/addons/exporters/OBJExporter.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

const GEOMETRY_OPTIONS = [
  "Triangle",
  "Cube",
  "Cylinder",
  "Multiple objects",
  "Transformed objects",
  "Point Cloud",
];

export function setup(canvas, params) {
  let geometryName = params.geometry ?? "Triangle";
  let exportAction = params.export ?? "Idle";

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  const camera = new THREE.PerspectiveCamera(
    70,
    canvas.width / canvas.height,
    1,
    1000,
  );
  camera.position.set(0, 0, 400);

  const scene = new THREE.Scene();

  const ambientLight = new THREE.AmbientLight(0xffffff);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
  directionalLight.position.set(0, 1, 1);
  scene.add(directionalLight);

  addGeometry(GEOMETRY_OPTIONS.indexOf(geometryName) + 1);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;

  function exportToObj() {
    const exporter = new OBJExporter();
    const result = exporter.parse(scene);
    console.info(`three.js object.obj: ${result.length} characters`);
  }

  function addGeometry(type) {
    for (let i = 0; i < scene.children.length; i++) {
      const child = scene.children[i];

      if (child.isMesh || child.isPoints) {
        child.geometry.dispose();
        scene.remove(child);
        i--;
      }
    }

    if (type === 1) {
      const material = new THREE.MeshLambertMaterial({ color: 0x00cc00 });
      const geometry = generateTriangleGeometry();

      scene.add(new THREE.Mesh(geometry, material));
    } else if (type === 2) {
      const material = new THREE.MeshLambertMaterial({ color: 0x00cc00 });
      const geometry = new THREE.BoxGeometry(100, 100, 100);
      scene.add(new THREE.Mesh(geometry, material));
    } else if (type === 3) {
      const material = new THREE.MeshLambertMaterial({ color: 0x00cc00 });
      const geometry = new THREE.CylinderGeometry(50, 50, 100, 30, 1);
      scene.add(new THREE.Mesh(geometry, material));
    } else if (type === 4 || type === 5) {
      const material = new THREE.MeshLambertMaterial({ color: 0x00cc00 });
      const geometry = generateTriangleGeometry();

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.x = -200;
      scene.add(mesh);

      const geometry2 = new THREE.BoxGeometry(100, 100, 100);
      const mesh2 = new THREE.Mesh(geometry2, material);
      scene.add(mesh2);

      const geometry3 = new THREE.CylinderGeometry(50, 50, 100, 30, 1);
      const mesh3 = new THREE.Mesh(geometry3, material);
      mesh3.position.x = 200;
      scene.add(mesh3);

      if (type === 5) {
        mesh.rotation.y = Math.PI / 4.0;
        mesh2.rotation.y = Math.PI / 4.0;
        mesh3.rotation.y = Math.PI / 4.0;
      }
    } else if (type === 6) {
      const points = [0, 0, 0, 100, 0, 0, 100, 100, 0, 0, 100, 0];
      const colors = [0.5, 0, 0, 0.5, 0, 0, 0, 0.5, 0, 0, 0.5, 0];

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(points, 3),
      );
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3),
      );

      const material = new THREE.PointsMaterial({
        size: 10,
        vertexColors: true,
      });

      const pointCloud = new THREE.Points(geometry, material);
      pointCloud.name = "point cloud";
      scene.add(pointCloud);
    }
  }

  function generateTriangleGeometry() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];

    vertices.push(-50, -50, 0);
    vertices.push(50, -50, 0);
    vertices.push(50, 50, 0);

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.computeVertexNormals();

    return geometry;
  }

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
    update(next) {
      if (next.geometry !== undefined && next.geometry !== geometryName) {
        geometryName = next.geometry;
        addGeometry(GEOMETRY_OPTIONS.indexOf(geometryName) + 1);
      }
      if (next.export !== undefined && next.export !== exportAction) {
        exportAction = next.export;
        if (exportAction === "Export OBJ") exportToObj();
      }
    },
    cleanup() {
      animation.cleanup();
      controls.dispose();
      addGeometry(0);
      renderer.dispose();
    },
  };
}

export const example = { setup };
