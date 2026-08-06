import {
  AmbientLight,
  BoxGeometry,
  GCodeExporter,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "misc_exporter_gcode",
  name: "G-code exporter",
  category: "misc",
  description:
    "Slices EASEL mesh geometry on the CPU and exports deterministic G-code paths.",
};
export const controls = [];

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x121826;
  const camera = new PerspectiveCamera({
    fov: 42,
    aspect: width / height,
    near: 0.1,
    far: 50,
  });
  camera.position.set(0, 0, 4);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.7));
  const mesh = new Mesh(
    new BoxGeometry(1.8, 1.8, 1.8),
    new LambertMaterial({ color: 0x85d1a7 }),
  );
  scene.add(mesh);
  const gcode = new GCodeExporter().parse(mesh, {
    layerHeight: 0.25,
    extrusionPerUnit: 0.04,
  });
  mesh.userData.exportedLength = gcode.length;
  const timer = new Timer();
  let frame;
  function animate() {
    frame = globalThis.requestAnimationFrame(animate);
    mesh.rotation.y += timer.update().delta * 0.4;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (frame !== undefined) globalThis.cancelAnimationFrame(frame);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const exporter = new EASEL.GCodeExporter();
const text = exporter.parse(scene, { layerHeight: 0.2 });`;

export const threeSource = `import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import polyslice from "@jgphilpott/polyslice";

const controls = new OrbitControls(camera, renderer.domElement);
const { Polyslice, Printer, Filament } = polyslice;
const slicer = new Polyslice({
  printer: new Printer("Ender3"),
  filament: new Filament("GenericPLA"),
});
const text = slicer.slice(mesh);`;

export const example = { meta, controls, setup, easelSource, threeSource };
