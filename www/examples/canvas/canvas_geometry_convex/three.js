// Adapted from three.js r186 examples/webgl_geometry_convex.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

import discBase64 from "../../../../assets/textures/sprites/disc.png.base64?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export function setup(canvas) {
  const scene = new THREE.Scene();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  // camera

  const camera = new THREE.PerspectiveCamera(
    40,
    canvas.width / canvas.height,
    1,
    1000,
  );
  camera.position.set(15, 20, 30);
  scene.add(camera);

  // controls

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 20;
  controls.maxDistance = 50;
  controls.maxPolarAngle = Math.PI / 2;

  // ambient light

  scene.add(new THREE.AmbientLight(0x666666));

  // point light

  const light = new THREE.PointLight(0xffffff, 3, 0, 0);
  camera.add(light);

  // helper

  const axesHelper = new THREE.AxesHelper(20);
  scene.add(axesHelper);

  // textures

  // The checked-in PNG replaces the relative texture URL, so loading needs no network.
  const loader = new THREE.TextureLoader();
  const texture = loader.load(`data:image/png;base64,${discBase64}`);
  texture.colorSpace = THREE.SRGBColorSpace;

  const group = new THREE.Group();
  scene.add(group);

  // points

  let dodecahedronGeometry = new THREE.DodecahedronGeometry(10);

  // if normal and uv attributes are not removed, mergeVertices() can't consolidate identical vertices with different normal/uv data

  dodecahedronGeometry.deleteAttribute("normal");
  dodecahedronGeometry.deleteAttribute("uv");

  dodecahedronGeometry =
    BufferGeometryUtils.mergeVertices(dodecahedronGeometry);

  const vertices = [];
  const positionAttribute = dodecahedronGeometry.getAttribute("position");

  for (let i = 0; i < positionAttribute.count; i++) {
    const vertex = new THREE.Vector3();
    vertex.fromBufferAttribute(positionAttribute, i);
    vertices.push(vertex);
  }

  const pointsMaterial = new THREE.PointsMaterial({
    color: 0x0080ff,
    map: texture,
    size: 1,
    alphaTest: 0.5,
  });

  const pointsGeometry = new THREE.BufferGeometry().setFromPoints(vertices);

  const points = new THREE.Points(pointsGeometry, pointsMaterial);
  group.add(points);

  // convex hull

  const meshMaterial = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    opacity: 0.5,
    side: THREE.DoubleSide,
    transparent: true,
  });

  const meshGeometry = new ConvexGeometry(vertices);

  const mesh = new THREE.Mesh(meshGeometry, meshMaterial);
  group.add(mesh);

  const animation = createExampleAnimationLoop(() => {
    group.rotation.y += 0.005;

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
      controls.dispose();
      axesHelper.dispose();
      dodecahedronGeometry.dispose();
      pointsGeometry.dispose();
      pointsMaterial.dispose();
      texture.dispose();
      meshGeometry.dispose();
      meshMaterial.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };
