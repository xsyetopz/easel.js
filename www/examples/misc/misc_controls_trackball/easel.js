import {
  AmbientLight,
  ConeGeometry,
  DirectionalLight,
  FogExp2,
  InstancedMesh,
  LambertMaterial,
  Node,
  OrthographicCamera,
  PerspectiveCamera,
  Renderer,
  Scene,
  Shading,
  TrackballControls,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "misc_controls_trackball",
  upstream: "misc_controls_trackball",
  name: "controls / trackball",
  category: "misc",
  animated: true,
  description:
    "Rotate, zoom, and pan TrackballControls through a fogged cloud of 500 instanced cones, with a switch between perspective and orthographic cameras.",
  differences: [
    "MeshPhongMaterial becomes LambertMaterial with flat shading, so the cones have no specular highlights.",
    "EASEL FogExp2 evaluates fog per vertex from a lookup table, so the fog fades across each face instead of per pixel.",
  ],
};

/** @type {import("../../../types/controls.ts").ControlDefinition[]} */
export const controls = [
  {
    type: "select",
    key: "orthographicCamera",
    label: "use orthographic",
    options: ["on", "off"],
    default: "off",
  },
  {
    type: "select",
    key: "multiTouchRoll",
    label: "multi touch roll",
    options: ["on", "off"],
    default: "off",
  },
];

export function setup(canvas, params) {
  let trackball;

  const state = {
    orthographicCamera: params.orthographicCamera === "on",
    multiTouchRoll: params.multiTouchRoll === "on",
  };

  const frustumSize = 400;

  const aspect = canvas.width / canvas.height;

  const perspectiveCamera = new PerspectiveCamera({
    fov: 60,
    aspect,
    near: 1,
    far: 1000,
  });
  perspectiveCamera.position.z = 500;

  const orthographicCamera = new OrthographicCamera({
    left: (frustumSize * aspect) / -2,
    right: (frustumSize * aspect) / 2,
    top: frustumSize / 2,
    bottom: frustumSize / -2,
    near: 1,
    far: 1000,
  });
  orthographicCamera.position.z = 500;

  // world

  const scene = new Scene();
  scene.background = 0xcccccc;
  scene.fog = new FogExp2(0xcccccc, 0.002);

  const geometry = new ConeGeometry(10, 30, 4, 1);
  const material = new LambertMaterial({
    color: 0xffffff,
    shading: Shading.Flat,
    vertexColors: false,
  });

  const mesh = new InstancedMesh(geometry, material, 500);
  const dummy = new Node();

  for (let i = 0; i < 500; i++) {
    dummy.position.x = (Math.random() - 0.5) * 1000;
    dummy.position.y = (Math.random() - 0.5) * 1000;
    dummy.position.z = (Math.random() - 0.5) * 1000;

    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  scene.add(mesh);

  // lights

  const dirLight1 = new DirectionalLight(0xffffff, 3);
  dirLight1.position.set(1, 1, 1);
  scene.add(dirLight1);

  const dirLight2 = new DirectionalLight(0x002288, 3);
  dirLight2.position.set(-1, -1, -1);
  scene.add(dirLight2);

  const ambientLight = new AmbientLight(0x555555, 1);
  scene.add(ambientLight);

  // renderer

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  function createControls(camera) {
    trackball = new TrackballControls(camera, canvas);

    trackball.rotateSpeed = 1.0;
    trackball.zoomSpeed = 1.2;
    trackball.panSpeed = 0.8;

    trackball.multiTouchRoll = state.multiTouchRoll;

    trackball.keys = ["KeyA", "KeyS", "KeyD"];
  }

  createControls(
    state.orthographicCamera ? orthographicCamera : perspectiveCamera,
  );

  function render() {
    const camera = state.orthographicCamera
      ? orthographicCamera
      : perspectiveCamera;

    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }

  const animation = createExampleAnimationLoop(() => {
    trackball.update();

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

      renderer.setSize(width, height);

      trackball.handleResize();
    },
    update(next) {
      if (next.orthographicCamera !== undefined) {
        const value = next.orthographicCamera === "on";
        if (value !== state.orthographicCamera) {
          state.orthographicCamera = value;

          trackball.dispose();

          createControls(value ? orthographicCamera : perspectiveCamera);
        }
      }
      if (next.multiTouchRoll !== undefined) {
        state.multiTouchRoll = next.multiTouchRoll === "on";

        trackball.multiTouchRoll = state.multiTouchRoll;
      }
    },
    cleanup() {
      animation.cleanup();
      trackball.dispose();
      mesh.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const orthographicCamera = new EASEL.OrthographicCamera({
  left: (frustumSize * aspect) / -2,
  right: (frustumSize * aspect) / 2,
  top: frustumSize / 2,
  bottom: frustumSize / -2,
  near: 1,
  far: 1000,
});

const controls = new EASEL.TrackballControls(perspectiveCamera, canvas);
controls.rotateSpeed = 1.0;
controls.zoomSpeed = 1.2;
controls.panSpeed = 0.8;

function animate() {
  controls.update();
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
}`;

export const example = { meta, controls, setup, easelSource };
