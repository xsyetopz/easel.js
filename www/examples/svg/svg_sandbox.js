import {
  BasicMaterial,
  BoxGeometry,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  parseSVGPath,
  Scene,
  SVGObject,
  SVGRenderer,
  serializeSVGPath,
} from "@/index.js";

export const meta = {
  id: "svg_sandbox",
  name: "SVG Sandbox",
  category: "svg",
  description:
    "CPU SVG scene graph output with meshes, custom SVG nodes, and parsed paths.",
};

export const controls = [];

export function setup(canvas) {
  const stage = canvas.parentElement;
  if (!stage) return;
  const width = Math.max(300, stage.clientWidth || canvas.width || 640);
  const height = Math.max(240, stage.clientHeight || canvas.height || 360);
  canvas.hidden = true;
  const renderer = new SVGRenderer({ width, height });
  const svg = renderer.domElement;
  if (!svg) return;
  stage.append(svg);
  renderer.setClearColor(0xf0f0f0);
  const scene = new Scene();
  const camera = new PerspectiveCamera({
    fov: 75,
    aspect: width / height,
    near: 1,
    far: 10000,
  });
  camera.position.z = 500;
  const boxGeometry = new BoxGeometry(100, 100, 100);
  const blueBox = new Mesh(boxGeometry, new BasicMaterial({ color: 0x0000ff }));
  blueBox.position.x = 180;
  blueBox.position.y = 80;
  blueBox.scale.setScalar(1.6);
  scene.add(blueBox);
  const plane = new Mesh(
    new PlaneGeometry(160, 100),
    new BasicMaterial({ color: 0x4d8cff }),
  );
  plane.position.y = -150;
  scene.add(plane);
  const custom = globalThis.document?.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle",
  );
  if (custom) {
    custom.setAttribute("stroke", "black");
    custom.setAttribute("fill", "red");
    custom.setAttribute("r", "40");
    const object = new SVGObject(custom);
    object.position.x = -180;
    object.position.y = 80;
    scene.add(object);
  }
  const shapePath = parseSVGPath(
    "M -110 -20 C -70 -90 20 -90 80 -20 S 70 50 0 40 Z",
  );
  const pathElement = globalThis.document?.createElementNS(
    "http://www.w3.org/2000/svg",
    "path",
  );
  if (pathElement) {
    const firstPath = shapePath.subPaths[0];
    if (firstPath)
      pathElement.setAttribute(
        "d",
        serializeSVGPath(firstPath, { close: true }),
      );
    pathElement.setAttribute("fill", "none");
    pathElement.setAttribute("stroke", "#111827");
    pathElement.setAttribute("stroke-width", "4");
    const pathObject = new SVGObject(pathElement);
    pathObject.position.y = 170;
    scene.add(pathObject);
  }
  let frame;
  function animate() {
    blueBox.rotation.x += 0.01;
    blueBox.rotation.y += 0.013;
    renderer.render(scene, camera);
    frame = globalThis.requestAnimationFrame(animate);
  }
  frame = globalThis.requestAnimationFrame(animate);
  return {
    cleanup() {
      if (frame !== undefined) globalThis.cancelAnimationFrame(frame);
      svg.remove();
      canvas.hidden = false;
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const renderer = new EASEL.SVGRenderer({ width, height });
const object = new EASEL.SVGObject(pathNode);
scene.add(object);
renderer.render(scene, camera);`;

export const threeSource = `import * as THREE from "three";
import { SVGObject, SVGRenderer } from "three/addons/renderers/SVGRenderer.js";

const renderer = new SVGRenderer();
const object = new SVGObject(node.cloneNode());
scene.add(object);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource, threeSource };
