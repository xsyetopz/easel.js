// Adapted from three.js r186 examples/misc_controls_trackball.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";
import { TrackballControls } from "three/addons/controls/TrackballControls.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export function setup(canvas, params) {
  let controls;

  const state = {
    orthographicCamera: params.orthographicCamera === "on",
    multiTouchRoll: params.multiTouchRoll === "on",
  };

  const frustumSize = 400;

  const aspect = canvas.width / canvas.height;

  const perspectiveCamera = new THREE.PerspectiveCamera(60, aspect, 1, 1000);
  perspectiveCamera.position.z = 500;

  const orthographicCamera = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    1,
    1000,
  );
  orthographicCamera.position.z = 500;

  // world

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcccccc);
  scene.fog = new THREE.FogExp2(0xcccccc, 0.002);

  const geometry = new THREE.ConeGeometry(10, 30, 4, 1);
  const material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    flatShading: true,
  });

  const mesh = new THREE.InstancedMesh(geometry, material, 500);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < 500; i++) {
    dummy.position.x = (Math.random() - 0.5) * 1000;
    dummy.position.y = (Math.random() - 0.5) * 1000;
    dummy.position.z = (Math.random() - 0.5) * 1000;

    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  scene.add(mesh);

  // lights

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 3);
  dirLight1.position.set(1, 1, 1);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0x002288, 3);
  dirLight2.position.set(-1, -1, -1);
  scene.add(dirLight2);

  const ambientLight = new THREE.AmbientLight(0x555555);
  scene.add(ambientLight);

  // renderer

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  function createControls(camera) {
    controls = new TrackballControls(camera, renderer.domElement);

    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;

    controls.multiTouchRoll = state.multiTouchRoll;

    controls.keys = ["KeyA", "KeyS", "KeyD"];
  }

  createControls(
    state.orthographicCamera ? orthographicCamera : perspectiveCamera,
  );

  function render() {
    const camera = state.orthographicCamera
      ? orthographicCamera
      : perspectiveCamera;

    renderer.render(scene, camera);
  }

  const animation = createExampleAnimationLoop(() => {
    controls.update();

    render();
  });

  return {
    ...animation,
    resize(width, height) {
      const aspect = width / height;

      perspectiveCamera.aspect = aspect;
      perspectiveCamera.updateProjectionMatrix();

      orthographicCamera.left = (-frustumSize * aspect) / 2;
      orthographicCamera.right = (frustumSize * aspect) / 2;
      orthographicCamera.top = frustumSize / 2;
      orthographicCamera.bottom = -frustumSize / 2;
      orthographicCamera.updateProjectionMatrix();

      renderer.setSize(width, height, false);

      controls.handleResize();
    },
    update(next) {
      if (next.orthographicCamera !== undefined) {
        const value = next.orthographicCamera === "on";
        if (value !== state.orthographicCamera) {
          state.orthographicCamera = value;

          controls.dispose();

          createControls(value ? orthographicCamera : perspectiveCamera);
        }
      }
      if (next.multiTouchRoll !== undefined) {
        state.multiTouchRoll = next.multiTouchRoll === "on";

        controls.multiTouchRoll = state.multiTouchRoll;
      }
    },
    cleanup() {
      animation.cleanup();
      controls.dispose();
      mesh.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };
