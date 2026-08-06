import {
  CSS3DObject,
  CSS3DRenderer,
  PerspectiveCamera,
  Renderer,
  Scene,
  TrackballControls,
} from "@/index.js";

export const meta = {
  id: "css3d_youtube",
  name: "CSS3D YouTube",
  category: "css3d",
  description:
    "Arrange browser video embeds on four CPU-positioned CSS3D panels.",
};

export const controls = [];

function Element(id, x, y, z, rotationY) {
  const div = globalThis.document.createElement("div");
  div.style.width = "480px";
  div.style.height = "360px";
  div.style.backgroundColor = "#000";
  const iframe = globalThis.document.createElement("iframe");
  iframe.style.width = "480px";
  iframe.style.height = "360px";
  iframe.style.border = "0";
  iframe.loading = "lazy";
  iframe.title = "YouTube video";
  iframe.src = `https://www.youtube.com/embed/${id}?rel=0`;
  div.append(iframe);
  const object = new CSS3DObject(div);
  object.position.set(x, y, z);
  object.rotation.y = rotationY;
  return object;
}

export function setup(canvas) {
  const stage = canvas.parentElement;
  if (!stage || typeof globalThis.document === "undefined") return;
  const width = Math.max(300, stage.clientWidth || canvas.width || 640);
  const height = Math.max(240, stage.clientHeight || canvas.height || 360);
  const previousPosition = stage.style.position;
  stage.style.position = "relative";
  const camera = new PerspectiveCamera({
    fov: 50,
    aspect: width / height,
    near: 1,
    far: 5000,
  });
  camera.position.set(500, 350, 750);
  const scene = new Scene();
  scene.background = 0xffffff;
  const renderer = new Renderer({ canvas, width, height });
  const overlay = new CSS3DRenderer({ width, height });
  if (!overlay.domElement) return;
  overlay.domElement.style.position = "absolute";
  overlay.domElement.style.inset = "0";
  overlay.domElement.style.zIndex = "2";
  stage.append(overlay.domElement);
  const group = new Scene();
  group.add(
    Element("SJOz3qjfQXU", 0, 0, 240, 0),
    Element("Y2-xZ-1HE-Q", 240, 0, 0, Math.PI / 2),
    Element("IrydklNpcFI", 0, 0, -240, Math.PI),
    Element("9ubytEsCaS0", -240, 0, 0, -Math.PI / 2),
  );
  scene.add(group);
  const controls = new TrackballControls(camera, overlay.domElement);
  controls.rotateSpeed = 4;
  const blocker = globalThis.document.createElement("div");
  blocker.style.position = "absolute";
  blocker.style.inset = "0";
  blocker.style.zIndex = "3";
  blocker.style.display = "none";
  blocker.style.cursor = "grabbing";
  stage.append(blocker);
  const onStart = () => {
    blocker.style.display = "";
  };
  const onEnd = () => {
    blocker.style.display = "none";
  };
  controls.addEventListener("start", onStart);
  controls.addEventListener("end", onEnd);
  let frame;
  const onResize = () => {
    const nextWidth = Math.max(300, stage.clientWidth || width);
    const nextHeight = Math.max(240, stage.clientHeight || height);
    camera.aspect = nextWidth / nextHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(nextWidth, nextHeight);
    overlay.setSize(nextWidth, nextHeight);
  };
  globalThis.addEventListener?.("resize", onResize);
  function animate() {
    frame = globalThis.requestAnimationFrame(animate);
    controls.update();
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
    overlay.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (frame !== undefined) globalThis.cancelAnimationFrame(frame);
      globalThis.removeEventListener?.("resize", onResize);
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end", onEnd);
      controls.dispose();
      overlay.dispose();
      overlay.domElement?.remove();
      blocker.remove();
      stage.style.position = previousPosition;
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const iframe = globalThis.document.createElement("iframe");
iframe.src = new URL("/embed/SJOz3qjfQXU?rel=0", "https:" + String.fromCharCode(47, 47) + "www.youtube.com").href;
const object = new EASEL.CSS3DObject(iframe);
scene.add(object);
const renderer = new EASEL.CSS3DRenderer({ width, height });
renderer.render(scene, camera);`;

export const threeSource = `import * as THREE from "three";
import { TrackballControls } from "three/addons/controls/TrackballControls.js";
import { CSS3DObject, CSS3DRenderer } from "three/addons/renderers/CSS3DRenderer.js";

const object = new CSS3DObject(div);
object.position.set(0, 0, 240);
scene.add(object);
const renderer = new CSS3DRenderer();
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource, threeSource };
