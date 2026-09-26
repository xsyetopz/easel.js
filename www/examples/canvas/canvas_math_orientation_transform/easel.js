import {
  Attribute,
  BasicMaterial,
  ConeGeometry,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  Quaternion,
  Renderer,
  Scene,
  SphereGeometry,
  Spherical,
  Timer,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "canvas_math_orientation_transform",
  upstream: "webgl_math_orientation_transform",
  name: "math / orientation / transform",
  category: "canvas",
  animated: true,
  description:
    "A cone turns toward a red target that jumps to a random point on a wireframe sphere every two seconds, using Quaternion.rotateTowards or an instant lookAt.",
  differences: [
    "EASEL has no MeshNormalMaterial, so the cone uses a BasicMaterial whose vertex colors are recomputed each frame from its view-space vertex normals and interpolated across each face instead of per pixel.",
    "The wireframe sphere's opacity 0.3 becomes EASEL opacity level 6 of 8, blended in EASEL's quantized color space, so single lines draw at about 89 gray on black where three.js gives about 61.",
    "The lil-gui useLookAt checkbox becomes a select control with on and off options.",
  ],
};

/** @type {import("../../../types/controls.ts").ControlDefinition[]} */
export const controls = [
  {
    type: "select",
    key: "useLookAt",
    label: "useLookAt",
    options: ["on", "off"],
    default: "off",
  },
];

export function setup(canvas, params) {
  const spherical = new Spherical();
  const rotationMatrix = new Matrix4();
  const targetQuaternion = new Quaternion();
  const timer = new Timer();
  timer.connect(canvas.ownerDocument);
  const speed = Math.PI / 2;

  const settings = {
    useLookAt: params.useLookAt === "on",
  };

  const camera = new PerspectiveCamera({
    fov: 70,
    aspect: canvas.width / canvas.height,
    near: 0.01,
    far: 10,
  });
  camera.position.z = 5;

  const scene = new Scene();

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });
  renderer.clearColor = 0x000000;

  const geometry = new ConeGeometry(0.1, 0.5, 8, 1, false);
  geometry.rotateX(Math.PI * 0.5);
  const normals = geometry.getAttribute("normal");
  const normalColors = new Attribute(new Float32Array(normals.count * 3), 3);
  geometry.setAttribute("color", normalColors);
  const material = new BasicMaterial({ color: 0xffffff, vertexColors: true });

  const mesh = new Mesh(geometry, material);
  scene.add(mesh);

  // MeshNormalMaterial stand-in: color each vertex by its view-space normal.
  const normal = new Vector3();
  const viewQuaternion = new Quaternion();
  function updateNormalColors() {
    viewQuaternion.copy(camera.quaternion).invert().multiply(mesh.quaternion);
    for (let i = 0; i < normals.count; i++) {
      normal.fromBufferAttribute(normals, i).applyQuaternion(viewQuaternion);
      normalColors.setXYZ(
        i,
        normal.x * 0.5 + 0.5,
        normal.y * 0.5 + 0.5,
        normal.z * 0.5 + 0.5,
      );
    }
    normalColors.needsUpdate = true;
  }

  //

  const targetGeometry = new SphereGeometry(0.05, 32, 16);
  const targetMaterial = new BasicMaterial({
    color: 0xff0000,
    vertexColors: false,
  });
  const target = new Mesh(targetGeometry, targetMaterial);
  scene.add(target);

  //

  const sphereGeometry = new SphereGeometry(2, 32, 32);
  const sphereMaterial = new BasicMaterial({
    color: 0xcccccc,
    vertexColors: false,
    wireframe: true,
    transparent: true,
    opacity: 6,
  });
  const sphere = new Mesh(sphereGeometry, sphereMaterial);
  scene.add(sphere);

  //

  let targetTimeout;

  generateTarget();

  function animate() {
    timer.update();

    const delta = timer.delta;

    if (mesh.quaternion.equals(targetQuaternion) === false) {
      if (settings.useLookAt === true) {
        // using lookAt() will make the mesh instantly look at the target

        mesh.lookAt(target.position);
      } else {
        // using rotateTowards() will gradually rotate the mesh towards the target
        // the "speed" variable represents the rotation speed in radians per seconds

        const step = speed * delta;
        mesh.quaternion.rotateTowards(targetQuaternion, step);
      }
    }

    updateNormalColors();

    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }

  function generateTarget() {
    // generate a random point on a sphere

    spherical.theta = Math.random() * Math.PI * 2;
    spherical.phi = Math.acos(2 * Math.random() - 1);
    spherical.radius = 2;

    target.position.setFromSpherical(spherical);

    // compute target rotation

    rotationMatrix.lookAt(target.position, mesh.position, mesh.up);
    targetQuaternion.setFromRotationMatrix(rotationMatrix);

    targetTimeout = setTimeout(generateTarget, 2000);
  }

  const animation = createExampleAnimationLoop(animate);

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    },
    update(next) {
      settings.useLookAt = next.useLookAt === "on";
    },
    cleanup() {
      animation.cleanup();
      clearTimeout(targetTimeout);
      timer.dispose();
      geometry.dispose();
      material.dispose();
      targetGeometry.dispose();
      targetMaterial.dispose();
      sphereGeometry.dispose();
      sphereMaterial.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const spherical = new EASEL.Spherical();
const rotationMatrix = new EASEL.Matrix4();
const targetQuaternion = new EASEL.Quaternion();
const timer = new EASEL.Timer();

spherical.theta = Math.random() * Math.PI * 2;
spherical.phi = Math.acos(2 * Math.random() - 1);
spherical.radius = 2;
target.position.setFromSpherical(spherical);
rotationMatrix.lookAt(target.position, mesh.position, mesh.up);
targetQuaternion.setFromRotationMatrix(rotationMatrix);

function animate() {
  const delta = timer.update().delta;
  if (!mesh.quaternion.equals(targetQuaternion)) {
    mesh.quaternion.rotateTowards(targetQuaternion, (Math.PI / 2) * delta);
  }
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
}`;

export const example = { meta, controls, setup, easelSource };
