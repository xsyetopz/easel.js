import {
  CSS3DObject,
  CSS3DRenderer,
  CSS3DSprite,
  PerspectiveCamera,
  PDBLoader,
  Quaternion,
  Renderer,
  Scene,
  Timer,
  TrackballControls,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "css3d_molecules",
  name: "CSS3D molecules",
  category: "css3d",
  description:
    "Inspect CPU-parsed atom and bond data as DOM sprites and CSS3D rods.",
};

export const controls = [];

const MOLECULE = `ATOM      1  C1  MOL A   1       0.000   0.000   0.000  1.00 20.00           C
ATOM      2  C2  MOL A   1       1.540   0.000   0.000  1.00 20.00           C
ATOM      3  O1  MOL A   1       2.100   1.220   0.000  1.00 20.00           O
ATOM      4  N1  MOL A   1       2.100  -1.220   0.000  1.00 20.00           N
ATOM      5  C3  MOL A   1      -0.770   1.330   0.000  1.00 20.00           C
ATOM      6  C4  MOL A   1      -0.770  -1.330   0.000  1.00 20.00           C
ATOM      7  H1  MOL A   1       1.540   0.000   1.050  1.00 20.00           H
ATOM      8  H2  MOL A   1       1.540   0.000  -1.050  1.00 20.00           H
ATOM      9  H3  MOL A   1      -1.310   2.260   0.000  1.00 20.00           H
ATOM     10  H4  MOL A   1      -1.310  -2.260   0.000  1.00 20.00           H
CONECT    1    2    5    6
CONECT    2    3    4    7    8
CONECT    5    9
CONECT    6   10
END`;

export function setup(canvas) {
  const stage = canvas.parentElement;
  if (!stage || typeof globalThis.document === "undefined") return;
  const width = Math.max(300, stage.clientWidth || canvas.width || 640);
  const height = Math.max(240, stage.clientHeight || canvas.height || 360);
  const previousPosition = stage.style.position;
  stage.style.position = "relative";
  const camera = new PerspectiveCamera({
    fov: 70,
    aspect: width / height,
    near: 1,
    far: 5000,
  });
  camera.position.z = 1000;
  const scene = new Scene();
  scene.background = 0x050505;
  const root = new Scene();
  scene.add(root);
  const renderer = new Renderer({ canvas, width, height });
  const overlay = new CSS3DRenderer({ width, height });
  if (!overlay.domElement) return;
  overlay.domElement.style.position = "absolute";
  overlay.domElement.style.inset = "0";
  overlay.domElement.style.zIndex = "2";
  stage.append(overlay.domElement);
  const controls = new TrackballControls(camera, overlay.domElement);
  controls.rotateSpeed = 0.5;
  const parsed = new PDBLoader().parse(MOLECULE);
  const objects = [];
  const positionAtoms = parsed.geometryAtoms.getAttribute("position");
  for (let index = 0; index < parsed.json.atoms.length; index++) {
    const atom = parsed.json.atoms[index];
    const element = globalThis.document.createElement("div");
    element.style.width = "52px";
    element.style.height = "52px";
    element.style.borderRadius = "50%";
    element.style.border = "2px solid rgba(255,255,255,0.8)";
    element.style.boxSizing = "border-box";
    element.style.display = "grid";
    element.style.placeItems = "center";
    element.style.font = "700 15px system-ui";
    element.style.color =
      atom[4].toLowerCase() === "hydrogen" ? "#222" : "#fff";
    element.style.background = `rgb(${atom[3][0]},${atom[3][1]},${atom[3][2]})`;
    element.textContent = atom[4];
    const object = new CSS3DSprite(element);
    object.position.set(
      positionAtoms?.getX(index) ?? 0,
      positionAtoms?.getY(index) ?? 0,
      positionAtoms?.getZ(index) ?? 0,
    );
    object.position.multiplyScalar(150);
    root.add(object);
    objects.push({ object, kind: "atom" });
  }
  const positionBonds = parsed.geometryBonds.getAttribute("position");
  const up = new Vector3(0, 1, 0);
  for (let index = 0; index < (positionBonds?.count ?? 0); index += 2) {
    const start = new Vector3(
      positionBonds.getX(index),
      positionBonds.getY(index),
      positionBonds.getZ(index),
    ).multiplyScalar(150);
    const end = new Vector3(
      positionBonds.getX(index + 1),
      positionBonds.getY(index + 1),
      positionBonds.getZ(index + 1),
    ).multiplyScalar(150);
    const direction = end.clone().sub(start);
    const length = direction.length - 48;
    if (length <= 0) continue;
    const element = globalThis.document.createElement("div");
    element.style.width = "8px";
    element.style.height = `${length}px`;
    element.style.background = "linear-gradient(90deg,#ddd,#777,#ddd)";
    element.style.borderRadius = "4px";
    const object = new CSS3DObject(element);
    object.position.copy(start).add(end).multiplyScalar(0.5);
    object.quaternion.copy(
      new Quaternion().setFromUnitVectors(up, direction.normalize()),
    );
    root.add(object);
    objects.push({ object, kind: "bond" });
  }
  const menu = globalThis.document.createElement("div");
  menu.style.position = "absolute";
  menu.style.left = "12px";
  menu.style.top = "12px";
  menu.style.zIndex = "4";
  menu.style.display = "flex";
  menu.style.gap = "5px";
  const setVisibility = (mode) => {
    for (const entry of objects)
      entry.object.visible = mode === "both" || entry.kind === mode;
  };
  for (const [label, mode] of [
    ["Atoms", "atom"],
    ["Bonds", "bond"],
    ["Atoms + Bonds", "both"],
  ]) {
    const button = globalThis.document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => setVisibility(mode));
    menu.append(button);
  }
  stage.append(menu);
  setVisibility("both");
  const timer = new Timer();
  let frame;
  function animate() {
    frame = globalThis.requestAnimationFrame(animate);
    timer.update();
    root.rotation.x = timer.elapsedTime * 0.4;
    root.rotation.y = timer.elapsedTime * 0.28;
    controls.update();
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
    overlay.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (frame !== undefined) globalThis.cancelAnimationFrame(frame);
      controls.dispose();
      overlay.dispose();
      overlay.domElement?.remove();
      menu.remove();
      stage.style.position = previousPosition;
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const pdb = new EASEL.PDBLoader().parse(text);
const atom = new EASEL.CSS3DSprite(globalThis.document.createElement("div"));
scene.add(atom);
const renderer = new EASEL.CSS3DRenderer({ width, height });
renderer.render(scene, camera);`;

export const threeSource = `import * as THREE from "three";
import { TrackballControls } from "three/addons/controls/TrackballControls.js";
import { PDBLoader } from "three/addons/loaders/PDBLoader.js";
import { CSS3DSprite, CSS3DRenderer } from "three/addons/renderers/CSS3DRenderer.js";

const loader = new PDBLoader();
loader.load(url, (pdb) => {
  const atom = new CSS3DSprite(baseSprite.cloneNode());
  root.add(atom);
});`;

export const example = { meta, controls, setup, easelSource, threeSource };
