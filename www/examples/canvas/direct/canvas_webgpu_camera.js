import {
  BasicMaterial,
  CameraHelper,
  Geometry,
  Group,
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Renderer,
  Scene,
  SphereGeometry,
} from "@/index.js";

export const meta = {
  id: "webgpu_camera",
  name: "Camera",
  category: "canvas",
  description:
    "Canvas2D adaptation of the three.js camera example with perspective and orthographic views, camera helpers, wireframe meshes, and points.",
};

export const controls = [];

function createPointGeometry() {
  const positions = new Float32Array(10000 * 3);
  let state = 0x12345678;
  for (let index = 0; index < positions.length; index++) {
    state = (1664525 * state + 1013904223) >>> 0;
    positions[index] = ((state / 0x100000000) * 2 - 1) * 1000;
  }
  const geometry = new Geometry();
  geometry.setPositions(positions);
  return geometry;
}

export function setup(canvas) {
  const ownerDocument = canvas.ownerDocument ?? globalThis.document;
  const leftCanvas = ownerDocument?.createElement("canvas") ?? canvas;
  const rightCanvas = ownerDocument?.createElement("canvas") ?? canvas;
  const mainContext = canvas.getContext("2d");
  let width = Math.max(1, canvas.width || 640);
  let height = Math.max(1, canvas.height || 360);
  let viewWidth = Math.max(1, Math.floor(width / 2));
  let frame;
  let running = true;

  leftCanvas.width = viewWidth;
  leftCanvas.height = height;
  rightCanvas.width = viewWidth;
  rightCanvas.height = height;

  const leftRenderer = new Renderer({
    canvas: leftCanvas,
    width: viewWidth,
    height,
  });
  const rightRenderer = new Renderer({
    canvas: rightCanvas,
    width: viewWidth,
    height,
  });
  const scene = new Scene();
  const camera = new PerspectiveCamera({
    fov: 50,
    aspect: viewWidth / height,
    near: 1,
    far: 10000,
  });
  camera.position.z = 2500;

  const cameraPerspective = new PerspectiveCamera({
    fov: 50,
    aspect: viewWidth / height,
    near: 150,
    far: 1000,
  });
  const cameraPerspectiveHelper = new CameraHelper(cameraPerspective);
  const frustumSize = 600;
  const cameraOrtho = new OrthographicCamera({
    left: (-0.5 * frustumSize * (width / height)) / 2,
    right: (0.5 * frustumSize * (width / height)) / 2,
    top: frustumSize / 2,
    bottom: -frustumSize / 2,
    near: 150,
    far: 1000,
  });
  const cameraOrthoHelper = new CameraHelper(cameraOrtho);
  let activeCamera = cameraPerspective;
  let activeHelper = cameraPerspectiveHelper;

  cameraPerspective.rotation.y = Math.PI;
  cameraOrtho.rotation.y = Math.PI;
  const cameraRig = new Group();
  cameraRig.add(cameraPerspective, cameraOrtho);
  scene.add(cameraPerspectiveHelper, cameraOrthoHelper, cameraRig);

  const mesh = new Mesh(
    new SphereGeometry(100, 16, 8),
    new BasicMaterial({ color: 0xffffff, wireframe: true }),
  );
  scene.add(mesh);
  const mesh2 = new Mesh(
    new SphereGeometry(50, 16, 8),
    new BasicMaterial({ color: 0x00ff00, wireframe: true }),
  );
  mesh2.position.y = 150;
  mesh.add(mesh2);
  const mesh3 = new Mesh(
    new SphereGeometry(5, 16, 8),
    new BasicMaterial({ color: 0x0000ff, wireframe: true }),
  );
  mesh3.position.z = 150;
  cameraRig.add(mesh3);

  const particles = new Points(
    createPointGeometry(),
    new PointsMaterial({ color: 0xffffff }),
  );
  scene.add(particles);

  function resize() {
    const nextWidth = Math.max(1, canvas.width || width);
    const nextHeight = Math.max(1, canvas.height || height);
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    viewWidth = Math.max(1, Math.floor(width / 2));
    leftRenderer.setSize(viewWidth, height);
    rightRenderer.setSize(viewWidth, height);
    camera.aspect = viewWidth / height;
    camera.updateProjectionMatrix();
    cameraPerspective.aspect = viewWidth / height;
    cameraPerspective.updateProjectionMatrix();
    const aspect = width / height;
    cameraOrtho.left = (-0.5 * frustumSize * aspect) / 2;
    cameraOrtho.right = (0.5 * frustumSize * aspect) / 2;
    cameraOrtho.top = frustumSize / 2;
    cameraOrtho.bottom = -frustumSize / 2;
    cameraOrtho.updateProjectionMatrix();
  }

  function renderFrame() {
    resize();
    const time = Date.now() * 0.0005;
    mesh.position.x = 700 * Math.cos(time);
    mesh.position.z = 700 * Math.sin(time);
    mesh.position.y = 700 * Math.sin(time);
    mesh2.position.x = 70 * Math.cos(2 * time);
    mesh2.position.z = 70 * Math.sin(time);

    if (activeCamera === cameraPerspective) {
      cameraPerspective.fov = 35 + 30 * Math.sin(0.5 * time);
      cameraPerspective.far = mesh.position.length;
      cameraPerspective.updateProjectionMatrix();
      cameraPerspectiveHelper.visible = true;
      cameraOrthoHelper.visible = false;
    } else {
      cameraOrtho.far = mesh.position.length;
      cameraOrtho.updateProjectionMatrix();
      cameraOrthoHelper.visible = true;
      cameraPerspectiveHelper.visible = false;
    }

    cameraRig.lookAt(mesh.position);
    activeHelper.visible = false;
    leftRenderer.prepare(scene, activeCamera);
    activeHelper.update();
    scene.background = 0x000000;
    leftRenderer.render(scene, activeCamera);
    activeHelper.visible = true;
    rightRenderer.prepare(scene, camera);
    scene.background = 0x111111;
    rightRenderer.render(scene, camera);
    mainContext?.clearRect(0, 0, width, height);
    mainContext?.drawImage(leftCanvas, 0, 0, viewWidth, height);
    mainContext?.drawImage(
      rightCanvas,
      viewWidth,
      0,
      width - viewWidth,
      height,
    );
  }

  function animate() {
    if (!running) return;
    renderFrame();
    if (typeof globalThis.requestAnimationFrame === "function") {
      frame = globalThis.requestAnimationFrame(animate);
    }
  }

  function onKeyDown(event) {
    const key = String(event.key ?? "").toLowerCase();
    if (key === "o") {
      activeCamera = cameraOrtho;
      activeHelper = cameraOrthoHelper;
    } else if (key === "p") {
      activeCamera = cameraPerspective;
      activeHelper = cameraPerspectiveHelper;
    }
  }

  globalThis.document?.addEventListener("keydown", onKeyDown);
  animate();

  return {
    cleanup() {
      running = false;
      if (
        frame !== undefined &&
        typeof globalThis.cancelAnimationFrame === "function"
      ) {
        globalThis.cancelAnimationFrame(frame);
      }
      globalThis.document?.removeEventListener("keydown", onKeyDown);
      leftRenderer.dispose();
      rightRenderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const cameraPerspective = new EASEL.PerspectiveCamera({ fov: 50, aspect, near: 150, far: 1000 });
const cameraOrtho = new EASEL.OrthographicCamera({ left, right, top, bottom, near: 150, far: 1000 });
const cameraPerspectiveHelper = new EASEL.CameraHelper(cameraPerspective);
const cameraOrthoHelper = new EASEL.CameraHelper(cameraOrtho);
const mesh = new EASEL.Mesh(new EASEL.SphereGeometry(100, 16, 8), new EASEL.BasicMaterial({ color: 0xffffff, wireframe: true }));
const particles = new EASEL.Points(pointsGeometry, new EASEL.PointsMaterial({ color: 0xffffff }));

const leftRenderer = new EASEL.Renderer({ canvas: leftCanvas, width: viewWidth, height });
const rightRenderer = new EASEL.Renderer({ canvas: rightCanvas, width: viewWidth, height });
leftRenderer.render(scene, activeCamera);
rightRenderer.render(scene, camera);`;

export const threeSource = `import * as THREE from "three";

const cameraPerspective = new THREE.PerspectiveCamera(50, aspect, 150, 1000);
const cameraOrtho = new THREE.OrthographicCamera(left, right, top, bottom, 150, 1000);
const cameraPerspectiveHelper = new THREE.CameraHelper(cameraPerspective);
const cameraOrthoHelper = new THREE.CameraHelper(cameraOrtho);
const mesh = new THREE.Mesh(new THREE.SphereGeometry(100, 16, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true }));
const particles = new THREE.Points(pointsGeometry, new THREE.PointsMaterial({ color: 0xffffff }));

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setScissorTest(true);
renderer.render(scene, activeCamera);
renderer.render(scene, camera);`;

export const threeAdapterId = meta.id;
export const example = { meta, controls, setup, easelSource, threeSource };
