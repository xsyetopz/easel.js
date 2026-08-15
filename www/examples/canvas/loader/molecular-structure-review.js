import {
  Group,
  LineMaterial,
  LineSegments,
  PDBLoader,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Renderer,
  Scene,
  Timer,
} from "@/index.js";

import source from "../../../../assets/pdb/caffeine.pdb?raw";
import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "molecular-structure-review",
  name: "Molecular Structure Review",
  category: "data",
  animated: true,
  description:
    "Inspect the atoms, CPK colors, and bonds in a caffeine PDB structure.",
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
  camera.position.z = 7.5;
  const renderer = new Renderer({ canvas, width, height });
  const result = new PDBLoader().parse(source);
  const atomsMaterial = new PointsMaterial({ vertexColors: true, size: 7 });
  const bondsMaterial = new LineMaterial({ color: 0xa7b7ca, linewidth: 2 });
  const atoms = new Points(result.geometryAtoms, atomsMaterial);
  const bonds = new LineSegments(result.geometryBonds, bondsMaterial);
  const molecule = new Group();
  molecule.scale.setScalar(0.75);
  molecule.add(bonds, atoms);
  result.geometryAtoms.computeBoundingBox();
  const bounds = result.geometryAtoms.boundingBox;
  if (bounds) {
    molecule.position.set(
      -(bounds.min.x + bounds.max.x) / 2,
      -(bounds.min.y + bounds.max.y) / 2,
      -(bounds.min.z + bounds.max.z) / 2,
    );
  }
  scene.add(molecule);
  const timer = new Timer();
  const animation = createExampleAnimationLoop(() => {
    molecule.rotation.y += timer.update().delta * 0.2;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    cleanup() {
      animation.cleanup();
      result.geometryAtoms.dispose();
      result.geometryBonds.dispose();
      atomsMaterial.dispose();
      bondsMaterial.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const pdb = new EASEL.PDBLoader().parse(pdbText);
const atoms = new EASEL.Points(
  pdb.geometryAtoms,
  new EASEL.PointsMaterial({ vertexColors: true, size: 7 }),
);
const bonds = new EASEL.LineSegments(pdb.geometryBonds, bondMaterial);`;
export const example = { meta, controls, setup, easelSource };
