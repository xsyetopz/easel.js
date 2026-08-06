import { BasicMaterial, BoxGeometry, Group, Mesh } from "@/index.js";
import { createScene, runLoop } from "./canvas_interaction_helpers.js";

export const meta = {
  id: "webgl_multiple_elements_text",
  name: "Multiple Text Elements",
  category: "canvas",
  description:
    "Block glyph meshes spell EASEL using authored geometry; this replaces unavailable TextGeometry/font assets while retaining multiple text-like elements.",
};

export const controls = [];

const glyphs = {
  E: ["111", "100", "110", "100", "111"],
  A: ["010", "101", "111", "101", "101"],
  S: ["111", "100", "111", "001", "111"],
  L: ["100", "100", "100", "100", "111"],
};

export function setup(canvas) {
  const { scene, camera, renderer } = createScene(canvas, {
    cameraPosition: [5.2, 4.4, 10],
    target: [0, 0, 0],
  });
  const group = new Group();
  scene.add(group);
  const colors = [0xe26b70, 0x5da7df, 0x6ac28c, 0xe4bd63, 0xa682db];
  const letters = "EASEL";
  const geometry = new BoxGeometry(0.42, 0.42, 0.28);
  for (let letterIndex = 0; letterIndex < letters.length; letterIndex++) {
    const pattern =
      glyphs[
        letters[letterIndex] === "E" && letterIndex === 4
          ? "L"
          : letters[letterIndex]
      ];
    const material = new BasicMaterial({ color: colors[letterIndex] });
    const originX = (letterIndex - 2) * 2.1;
    for (let row = 0; row < pattern.length; row++) {
      for (let column = 0; column < pattern[row].length; column++) {
        if (pattern[row][column] !== "1") continue;
        const block = new Mesh(geometry, material);
        block.position.set(originX + (column - 1) * 0.48, (2 - row) * 0.48, 0);
        group.add(block);
      }
    }
  }

  return runLoop(renderer, scene, camera, (time) => {
    group.rotation.y = Math.sin(time * 0.45) * 0.35;
    group.rotation.x = Math.cos(time * 0.35) * 0.08;
  });
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const glyph = new EASEL.Mesh(new EASEL.BoxGeometry(0.42, 0.42, 0.28), material);
glyph.position.set(x, y, z);
textGroup.add(glyph);`;

export const threeSource = `import * as THREE from "three";

const glyph = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.28), material);
glyph.position.set(x, y, z);
textGroup.add(glyph);`;

export const example = { meta, controls, setup, easelSource, threeSource };
