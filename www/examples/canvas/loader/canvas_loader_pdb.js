import {
  LineMaterial,
  LineSegments,
  PDBLoader,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_loader_pdb",
  name: "PDB loader",
  category: "canvas",
  description: "Protein Data Bank atoms and bonds decoded on the CPU.",
};
export const controls = [];

const source = `ATOM      1  C   MOL A   1      -1.000   0.000   0.000                      C
ATOM      2  O   MOL A   1       1.000   0.000   0.000                      O
ATOM      3  N   MOL A   1       0.000   1.000   0.000                      N
CONECT    1    2    3
CONECT    2    1
CONECT    3    1`;

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
  camera.position.set(0, 0, 4.4);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  const result = new PDBLoader().parse(source);
  const atoms = new Points(
    result.geometryAtoms,
    new PointsMaterial({ color: 0xffffff, size: 8 }),
  );
  const bonds = new LineSegments(
    result.geometryBonds,
    new LineMaterial({ color: 0xa7b7ca, linewidth: 1 }),
  );
  scene.add(bonds);
  scene.add(atoms);
  const timer = new Timer();
  let animationFrame;
  function animate() {
    animationFrame = globalThis.requestAnimationFrame(animate);
    atoms.rotation.y += timer.update().delta * 0.35;
    bonds.rotation.y = atoms.rotation.y;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (animationFrame !== undefined)
        globalThis.cancelAnimationFrame(animationFrame);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
import { PDBLoader } from "@xsyetopz/easel";

const pdb = new PDBLoader().parse(text);
const atoms = new EASEL.Points(pdb.geometryAtoms, atomMaterial);
const bonds = new EASEL.LineSegments(pdb.geometryBonds, bondMaterial);`;

export const threeSource = `import * as THREE from "three";
import { PDBLoader } from "three/addons/loaders/PDBLoader.js";

const loader = new PDBLoader();
const pdb = loader.parse(text);
const atoms = new THREE.Points(pdb.geometryAtoms, atomMaterial);
const bonds = new THREE.LineSegments(pdb.geometryBonds, bondMaterial);`;

export const example = { meta, controls, setup, easelSource, threeSource };
