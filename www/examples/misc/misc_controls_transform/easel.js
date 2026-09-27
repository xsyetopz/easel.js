import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  GridHelper,
  LambertMaterial,
  Mesh,
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
  Renderer,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  TransformControls,
  toRadians,
} from "@/index.js";

import crateBase64 from "../../../../assets/textures/crate.gif.base64?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "misc_controls_transform",
  upstream: "misc_controls_transform",
  name: "controls / transform",
  category: "misc",
  animated: true,
  description:
    "Drag the TransformControls gizmo to translate, rotate, or scale a textured crate; keys switch mode, space, snapping, camera, and gizmo size.",
  differences: [
    "Keyboard shortcuts listen on the focused canvas instead of window, so click the canvas before pressing keys; each side of the comparison reacts only to its own keys.",
    "The gizmo keeps the three.js handle layout, picking, and constant screen size, but draws its shafts and rotation rings as lines and its arrow cones with fewer segments so the CPU renderer stays fast.",
    "The 256 x 256 crate texture is scaled to 128 x 128 and sampled with nearest-neighbor, affine UVs, and no anisotropic filtering.",
    "The scene is redrawn every frame instead of only on change events.",
  ],
};
export const controls = [];

export function setup(canvas) {
  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });
  renderer.clearColor = 0x000000;

  let width = canvas.width;
  let height = canvas.height;
  const aspect = width / height;

  const frustumSize = 5;

  const cameraPersp = new PerspectiveCamera({
    fov: 50,
    aspect,
    near: 0.1,
    far: 100,
  });
  const cameraOrtho = new OrthographicCamera({
    left: -frustumSize * aspect,
    right: frustumSize * aspect,
    top: frustumSize,
    bottom: -frustumSize,
    near: 0.1,
    far: 100,
  });
  let currentCamera = cameraPersp;

  currentCamera.position.set(5, 2.5, 5);

  const scene = new Scene();
  const grid = new GridHelper(5, 10, 0x888888, 0x444444);
  scene.add(grid);

  const ambientLight = new AmbientLight(0xffffff, 1);
  scene.add(ambientLight);

  const light = new DirectionalLight(0xffffff, 4);
  light.position.set(1, 1, 1);
  scene.add(light);

  const geometry = new BoxGeometry(1, 1, 1);
  const material = new LambertMaterial({
    color: 0xffffff,
    vertexColors: false,
  });

  let texture;
  let disposed = false;
  new TextureLoader().load(`data:image/gif;base64,${crateBase64}`, (map) => {
    if (disposed) {
      map.dispose();
      return;
    }
    map.colorSpace = SRGBColorSpace;
    map.update().buildBrightnessLevels();
    texture = map;
    material.map = map;
  });

  // Key shortcuts need a focusable canvas; restore its tabIndex on cleanup.
  const previousTabIndex = canvas.tabIndex;

  const orbit = new OrbitControls(currentCamera, canvas);
  orbit.update();

  const control = new TransformControls(currentCamera, canvas);
  const onDraggingChanged = (event) => {
    orbit.enabled = !event.value;
  };
  control.addEventListener("dragging-changed", onDraggingChanged);

  const mesh = new Mesh(geometry, material);
  scene.add(mesh);

  control.attach(mesh);

  const gizmo = control.helper;
  scene.add(gizmo);

  function onWindowResize() {
    const aspect = width / height;

    cameraPersp.aspect = aspect;
    cameraPersp.updateProjectionMatrix();

    cameraOrtho.left = cameraOrtho.bottom * aspect;
    cameraOrtho.right = cameraOrtho.top * aspect;
    cameraOrtho.updateProjectionMatrix();

    renderer.setSize(width, height);
  }

  function onKeyDown(event) {
    switch (event.key) {
      case "q":
        control.space = control.space === "local" ? "world" : "local";
        break;

      case "Shift":
        control.translationSnap = 1;
        control.rotationSnap = toRadians(15);
        control.scaleSnap = 0.25;
        break;

      case "w":
        control.mode = "translate";
        break;

      case "e":
        control.mode = "rotate";
        break;

      case "r":
        control.mode = "scale";
        break;

      case "c": {
        const position = currentCamera.position.clone();

        currentCamera =
          currentCamera instanceof PerspectiveCamera
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
        control.size = control.size + 0.1;
        break;

      case "-":
      case "_":
        control.size = Math.max(control.size - 0.1, 0.1);
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
        control.translationSnap = undefined;
        control.rotationSnap = undefined;
        control.scaleSnap = undefined;
        break;
    }
  }

  canvas.tabIndex = 0;
  canvas.addEventListener("keydown", onKeyDown);
  canvas.addEventListener("keyup", onKeyUp);

  const animation = createExampleAnimationLoop(() => {
    orbit.update();
    renderer.prepare(scene, currentCamera);
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
      disposed = true;
      animation.cleanup();
      canvas.removeEventListener("keydown", onKeyDown);
      canvas.removeEventListener("keyup", onKeyUp);
      control.removeEventListener("dragging-changed", onDraggingChanged);
      control.detach();
      control.dispose();
      orbit.dispose();
      canvas.tabIndex = previousTabIndex;
      grid.dispose();
      geometry.dispose();
      material.dispose();
      texture?.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const orbit = new EASEL.OrbitControls(camera, canvas);
const control = new EASEL.TransformControls(camera, canvas);
control.addEventListener("dragging-changed", (event) => {
  orbit.enabled = !event.value;
});

const mesh = new EASEL.Mesh(
  new EASEL.BoxGeometry(1, 1, 1),
  new EASEL.LambertMaterial({ color: 0xffffff, vertexColors: false }),
);
scene.add(mesh);
control.attach(mesh);
scene.add(control.helper);

canvas.addEventListener("keydown", (event) => {
  if (event.key === "e") control.mode = "rotate";
  if (event.key === "Shift") control.rotationSnap = EASEL.toRadians(15);
});`;

export const example = { meta, controls, setup, easelSource };
