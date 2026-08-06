import {
  BasicMaterial,
  CSS3DObject,
  CSS3DRenderer,
  Mesh,
  OrbitControls,
  OrthographicCamera,
  PlaneGeometry,
  Renderer,
  Scene,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "css3d_orthographic",
  name: "CSS3D orthographic",
  category: "css3d",
  description:
    "Compare an orthographic Canvas2D scene with positioned CSS3D planes.",
};

export const controls = [];

export function setup(canvas) {
  const stage = canvas.parentElement;
  if (!stage || typeof globalThis.document === "undefined") return;
  const width = Math.max(300, stage.clientWidth || canvas.width || 640);
  const height = Math.max(240, stage.clientHeight || canvas.height || 360);
  const previousPosition = stage.style.position;
  stage.style.position = "relative";
  const scene = new Scene();
  scene.background = 0xf0f0f0;
  const frustumSize = 500;
  const camera = new OrthographicCamera({
    left: (frustumSize * width) / height / -2,
    right: (frustumSize * width) / height / 2,
    top: frustumSize / 2,
    bottom: frustumSize / -2,
    near: 1,
    far: 1000,
  });
  camera.position.set(-200, 200, 200);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  const overlay = new CSS3DRenderer({ width, height });
  if (!overlay.domElement) return;
  overlay.domElement.style.position = "absolute";
  overlay.domElement.style.inset = "0";
  overlay.domElement.style.zIndex = "2";
  stage.append(overlay.domElement);
  const material = new BasicMaterial({ color: 0x111111, wireframe: true });
  const planes = [
    [100, 100, "chocolate", [-50, 0, 0], [0, -Math.PI / 2, 0]],
    [100, 100, "saddlebrown", [0, 0, 50], [0, 0, 0]],
    [100, 100, "yellowgreen", [0, 50, 0], [-Math.PI / 2, 0, 0]],
    [300, 300, "seagreen", [0, -50, 0], [-Math.PI / 2, 0, 0]],
  ];
  for (const [planeWidth, planeHeight, color, position, rotation] of planes) {
    const element = globalThis.document.createElement("div");
    element.style.width = `${planeWidth}px`;
    element.style.height = `${planeHeight}px`;
    element.style.opacity = "0.75";
    element.style.background = color;
    const object = new CSS3DObject(element);
    object.position.set(...position);
    object.rotation.set(...rotation);
    scene.add(object);
    const mesh = new Mesh(new PlaneGeometry(planeWidth, planeHeight), material);
    mesh.position.copy(object.position);
    mesh.rotation.copy(object.rotation);
    scene.add(mesh);
  }
  const orbit = new OrbitControls(camera, overlay.domElement);
  orbit.minDistance = 200;
  orbit.maxDistance = 800;
  orbit.enableDamping = true;
  let frame;
  const onResize = () => {
    const nextWidth = Math.max(300, stage.clientWidth || width);
    const nextHeight = Math.max(240, stage.clientHeight || height);
    camera.left = (frustumSize * nextWidth) / nextHeight / -2;
    camera.right = (frustumSize * nextWidth) / nextHeight / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
    renderer.setSize(nextWidth, nextHeight);
    overlay.setSize(nextWidth, nextHeight);
  };
  globalThis.addEventListener?.("resize", onResize);
  function animate() {
    frame = globalThis.requestAnimationFrame(animate);
    orbit.update();
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
    overlay.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (frame !== undefined) globalThis.cancelAnimationFrame(frame);
      globalThis.removeEventListener?.("resize", onResize);
      orbit.dispose();
      overlay.dispose();
      overlay.domElement?.remove();
      stage.style.position = previousPosition;
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const camera = new EASEL.OrthographicCamera({ left: -500, right: 500, top: 250, bottom: -250 });
const renderer = new EASEL.CSS3DRenderer({ width, height });
const object = new EASEL.CSS3DObject(element);
scene.add(object);
renderer.render(scene, camera);`;

export const threeSource = `import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS3DObject, CSS3DRenderer } from "three/addons/renderers/CSS3DRenderer.js";

const camera = new THREE.OrthographicCamera(-500, 500, 250, -250, 1, 1000);
const object = new CSS3DObject(element);
scene2.add(object);
const renderer2 = new CSS3DRenderer();
renderer2.render(scene2, camera);`;

export const example = { meta, controls, setup, easelSource, threeSource };
