// Adapted from three.js r186 examples/webgl_morphtargets_sphere.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import sphereBinBase64 from "../../../../assets/gltf/AnimatedMorphSphere/AnimatedMorphSphere.bin.base64?raw";
import sphereGltf from "../../../../assets/gltf/AnimatedMorphSphere/AnimatedMorphSphere.gltf?raw";
import discBase64 from "../../../../assets/textures/sprites/disc.png.base64?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export function setup(canvas) {
  let mesh;

  let sign = 1;
  const speed = 0.5;

  const camera = new THREE.PerspectiveCamera(
    45,
    canvas.width / canvas.height,
    0.2,
    100,
  );
  camera.position.set(0, 5, 5);

  const scene = new THREE.Scene();

  const timer = new THREE.Timer();
  timer.connect(canvas.ownerDocument);

  const light1 = new THREE.PointLight(0xff2200, 50000);
  light1.position.set(100, 100, 100);
  scene.add(light1);

  const light2 = new THREE.PointLight(0x22ff00, 10000);
  light2.position.set(-100, -100, -100);
  scene.add(light2);

  scene.add(new THREE.AmbientLight(0x111111));

  // The checked-in buffer replaces the relative .bin URL, so parsing needs no network.
  const json = JSON.parse(sphereGltf);
  json.buffers[0].uri = `data:application/octet-stream;base64,${sphereBinBase64}`;

  const loader = new GLTFLoader();
  loader.parse(JSON.stringify(json), "", (gltf) => {
    mesh = gltf.scene.getObjectByName("AnimatedMorphSphere");
    mesh.rotation.z = Math.PI / 2;
    scene.add(mesh);

    //

    const pointsMaterial = new THREE.PointsMaterial({
      size: 10,
      sizeAttenuation: false,
      map: new THREE.TextureLoader().load(
        `data:image/png;base64,${discBase64}`,
      ),
      alphaTest: 0.5,
    });

    const points = new THREE.Points(mesh.geometry, pointsMaterial);
    points.morphTargetInfluences = mesh.morphTargetInfluences;
    points.morphTargetDictionary = mesh.morphTargetDictionary;
    mesh.add(points);
  });

  //

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setSize(canvas.width, canvas.height, false);

  //

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 1;
  controls.maxDistance = 20;

  function render() {
    const delta = timer.getDelta();

    if (mesh !== undefined) {
      const step = delta * speed;

      mesh.rotation.y += step;

      mesh.morphTargetInfluences[1] =
        mesh.morphTargetInfluences[1] + step * sign;

      if (
        mesh.morphTargetInfluences[1] <= 0 ||
        mesh.morphTargetInfluences[1] >= 1
      ) {
        sign *= -1;
      }
    }

    renderer.render(scene, camera);
  }

  const animation = createExampleAnimationLoop(() => {
    timer.update();
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
      controls.dispose();
      timer.dispose();
      if (mesh !== undefined) {
        mesh.geometry.dispose();
        mesh.material.dispose();
        for (const child of mesh.children) {
          child.material.map?.dispose();
          child.material.dispose();
        }
      }
      renderer.dispose();
    },
  };
}

export const example = { setup };
