import {
  Attribute,
  DashedLineMaterial,
  Geometry,
  Line,
  LineMaterial,
  PerspectiveCamera,
  Scene,
  SVGRenderer,
} from "@/index.js";

export const meta = {
  id: "svg_lines",
  name: "SVG Lines",
  category: "svg",
  description:
    "CPU SVG output for the three.js SVG lines example without WebGL.",
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
  renderer.setClearColor(0x000000);
  const scene = new Scene();
  const camera = new PerspectiveCamera({
    fov: 33,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.z = 10;
  const geometry = new Geometry();
  const vertices = [];
  for (let index = 0; index <= 50; index++) {
    const angle = (index / 50) * Math.PI * 2;
    vertices.push(Math.sin(angle), 0, Math.cos(angle));
  }
  geometry.setAttribute("position", new Attribute(vertices, 3));
  const lines = [];
  for (let index = 1; index <= 3; index++) {
    const line = new Line(
      geometry,
      new LineMaterial({
        color: [0x4ecdc4, 0xffd166, 0xef476f][index - 1],
        linewidth: 3,
      }),
    );
    line.scale.setScalar(index / 3);
    lines.push(line);
    scene.add(line);
  }
  const dashed = new Line(
    geometry,
    new DashedLineMaterial({
      color: 0x4d8cff,
      linewidth: 1,
      dashSize: 10,
      gapSize: 10,
    }),
  );
  dashed.scale.setScalar(2);
  lines.push(dashed);
  scene.add(dashed);
  let frame;
  function animate(timestamp) {
    const time = timestamp / 1000;
    lines.forEach((line, index) => {
      line.rotation.x = index + time / 3;
      line.rotation.z = index + time / 4;
    });
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
const line = new EASEL.Line(geometry, new EASEL.LineMaterial({ color: 0x4ecdc4, linewidth: 3 }));
renderer.render(scene, camera);`;

export const threeSource = `import * as THREE from "three";
import { SVGRenderer } from "three/addons/renderers/SVGRenderer.js";

const renderer = new SVGRenderer();
const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: Math.random() * 0xffffff, linewidth: 10 }));
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource, threeSource };
