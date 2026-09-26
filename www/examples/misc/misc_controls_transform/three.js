// Adapted from three.js r186 examples/misc_controls_transform.html.
// Copyright 2010-2026 three.js authors. MIT License.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";

import crateBase64 from "../../../../assets/textures/crate.gif.base64?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export function setup(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);

  let width = canvas.width;
  let height = canvas.height;
  const aspect = width / height;

  const frustumSize = 5;

  const cameraPersp = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
  const cameraOrtho = new THREE.OrthographicCamera(
    -frustumSize * aspect,
    frustumSize * aspect,
    frustumSize,
    -frustumSize,
    0.1,
    100,
  );
  let currentCamera = cameraPersp;

  currentCamera.position.set(5, 2.5, 5);

  const scene = new THREE.Scene();
  const grid = new THREE.GridHelper(5, 10, 0x888888, 0x444444);
  scene.add(grid);

  const ambientLight = new THREE.AmbientLight(0xffffff);
  scene.add(ambientLight);

  const light = new THREE.DirectionalLight(0xffffff, 4);
  light.position.set(1, 1, 1);
  scene.add(light);

  const texture = new THREE.TextureLoader().load(
    `data:image/gif;base64,${crateBase64}`,
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshLambertMaterial({ map: texture });

  const orbit = new OrbitControls(currentCamera, renderer.domElement);
  orbit.update();

  const control = new TransformControls(currentCamera, renderer.domElement);
  control.addEventListener("dragging-changed", (event) => {
    orbit.enabled = !event.value;
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  control.attach(mesh);

  const gizmo = control.getHelper();
  scene.add(gizmo);

  function onWindowResize() {
    const aspect = width / height;

    cameraPersp.aspect = aspect;
    cameraPersp.updateProjectionMatrix();

    cameraOrtho.left = cameraOrtho.bottom * aspect;
    cameraOrtho.right = cameraOrtho.top * aspect;
    cameraOrtho.updateProjectionMatrix();

    renderer.setSize(width, height, false);
  }

  function onKeyDown(event) {
    switch (event.key) {
      case "q":
        control.setSpace(control.space === "local" ? "world" : "local");
        break;

      case "Shift":
        control.setTranslationSnap(1);
        control.setRotationSnap(THREE.MathUtils.degToRad(15));
        control.setScaleSnap(0.25);
        break;

      case "w":
        control.setMode("translate");
        break;

      case "e":
        control.setMode("rotate");
        break;

      case "r":
        control.setMode("scale");
        break;

      case "c": {
        const position = currentCamera.position.clone();

        currentCamera = currentCamera.isPerspectiveCamera
          ? cameraOrtho
          : cameraPersp;
        currentCamera.position.copy(position);

        orbit.object = currentCamera;
        control.camera = currentCamera;

        currentCamera.lookAt(orbit.target.x, orbit.target.y, orbit.target.z);
        onWindowResize();
        break;
      }

      case "v": {
        const randomFoV = Math.random() + 0.1;
        const randomZoom = Math.random() + 0.1;

        cameraPersp.fov = randomFoV * 160;
        cameraOrtho.bottom = -randomFoV * 500;
        cameraOrtho.top = randomFoV * 500;

        cameraPersp.zoom = randomZoom * 5;
        cameraOrtho.zoom = randomZoom * 5;
        onWindowResize();
        break;
      }

      case "+":
      case "=":
        control.setSize(control.size + 0.1);
        break;

      case "-":
      case "_":
        control.setSize(Math.max(control.size - 0.1, 0.1));
        break;

      case "x":
        control.showX = !control.showX;
        break;

      case "y":
        control.showY = !control.showY;
        break;

      case "z":
        control.showZ = !control.showZ;
        break;

      case " ":
        control.enabled = !control.enabled;
        break;

      case "Escape":
        control.reset();
        break;
    }
  }

  function onKeyUp(event) {
    switch (event.key) {
      case "Shift":
        control.setTranslationSnap(null);
        control.setRotationSnap(null);
        control.setScaleSnap(null);
        break;
    }
  }

  const previousTabIndex = canvas.tabIndex;
  canvas.tabIndex = 0;
  canvas.addEventListener("keydown", onKeyDown);
  canvas.addEventListener("keyup", onKeyUp);

  const animation = createExampleAnimationLoop(() => {
    renderer.render(scene, currentCamera);
  });

  return {
    ...animation,
    resize(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
      onWindowResize();
    },
    cleanup() {
      animation.cleanup();
      canvas.removeEventListener("keydown", onKeyDown);
      canvas.removeEventListener("keyup", onKeyUp);
      canvas.tabIndex = previousTabIndex;
      control.detach();
      control.dispose();
      orbit.dispose();
      grid.dispose();
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
    },
  };
}

export const example = { setup };
