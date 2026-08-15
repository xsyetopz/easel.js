import {
  AmbientLight,
  DirectionalLight,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Shape,
  ShapeGeometry,
  Timer,
  TTFFont,
  TTFLoader,
  Vector3,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";
import { aimCamera } from "../../../runtime/example-camera.ts";

export const meta = {
  id: "font-specimen",
  name: "Font Specimen",
  category: "assets",
  animated: true,
  description: "Turn TTF glyph outlines into a readable 3D specimen.",
};

export const controls = [];

const FIXTURE_PARTS = [
  "AAEAAAAJAIAAAwAQY21hcABIAK0AAACcAAAAPGdseWYLRw+jAAAA2AAAAIRoZWFkAlsK8AAAAVwAAAA2aGhlYQZDAZ",
  "QAAAGUAAAAJGhtdHgINAAAAAABuAAAAAxsb2NhAAAA0AAAAcQAAAAQbWF4cAAEAAAAAAHUAAAABm5hbWUAmgT7AAAB",
  "3AAAABxwb3N0/58AMgAAAfgAAAAgAAAAAQADAAEAAAAMAAQAMAAAAAgAAAAAAAAAIAA/AEX//wAAACAAPwBF////4P",
  "/D/7wAAQAAAAAAAAAAAAEAAAAAAlgDIAALAAABAQEBAQEBAQEBAQEAAAJYAAD+NAAAAXwAAP6EAAABzAAA/agAAAAA",
  "AHgAAADcAAAAeAAAANwAAAB4AAAAAAABAAAAAAH0AyAABwAAAQEBAQEBAQEAAAH0AAD+ogAAAV4AAP4MAAAAAACWAA",
  "AB9AAAAJYAAAAAAAEAAAABAAAAAAAAAAAD6AAAA+gAAAAAAAAAAAAAAAAAAAAAAAAAAAJYAyAAAAAAAAAAAAABAAAA",
  "AQAAAyD/OAAAAyADIP84AAAAAQAAAAAAAAAAAAAAAAAAAAMCvAAAArwAAAK8AAAAAAAAAAAAAAAAAEwAAACEAAEAAA",
  "ADAAAAAAABABIAAwABBAkAAQAKAAAARQBBAFMARQBMAAMAAAAAAAD/nAAyAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
].join("");

function fixtureBytes() {
  return Uint8Array.from(globalThis.atob(FIXTURE_PARTS), (character) =>
    character.charCodeAt(0),
  );
}

function block(x, y, width, height) {
  const shape = new Shape();
  shape.moveTo(x, y);
  shape.lineTo(x + width, y);
  shape.lineTo(x + width, y + height);
  shape.lineTo(x, y + height);
  shape.lineTo(x, y);
  return shape;
}

function fallbackSpecimenShapes() {
  const shapes = [];
  const origin = 0;
  const advance = 0.95;
  const bar = 0.18;
  const height = 1.8;
  const width = 0.72;
  for (const [index, glyph] of Array.from("EASEL").entries()) {
    const x = origin + index * advance;
    if (glyph === "E" || glyph === "L") {
      shapes.push(block(x, -height / 2, bar, height));
      shapes.push(block(x, height / 2 - bar, width, bar));
      if (glyph === "E") {
        shapes.push(block(x, -bar / 2, width * 0.8, bar));
        shapes.push(block(x, -height / 2, width, bar));
      }
    } else if (glyph === "A") {
      shapes.push(block(x, -height / 2, bar, height));
      shapes.push(block(x + width - bar, -height / 2, bar, height));
      shapes.push(block(x, height / 2 - bar, width, bar));
      shapes.push(block(x, -bar / 2, width, bar));
    } else if (glyph === "S") {
      shapes.push(block(x, height / 2 - bar, width, bar));
      shapes.push(block(x, -bar / 2, width, bar));
      shapes.push(block(x, -height / 2, width, bar));
      shapes.push(block(x, -height / 2, bar, height / 2));
      shapes.push(block(x + width - bar, 0, bar, height / 2));
    }
  }
  return shapes;
}

export function setup(canvas) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x101622;
  const camera = new PerspectiveCamera({
    fov: 40,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 0, 8);
  aimCamera(camera, new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.35));
  const light = new DirectionalLight(0xffffff, 0.9);
  light.position.set(2, 3, 5);
  scene.add(light);
  const data = new TTFLoader().parse(fixtureBytes());
  const font = new TTFFont(data);
  const shapes = font.generateShapes("EASEL", 2.4);
  const geometry = new ShapeGeometry(
    shapes.length > 0 ? shapes : fallbackSpecimenShapes(),
  ).center();
  const material = new LambertMaterial({ color: 0xf0b35f, side: 2 });
  const text = new Mesh(geometry, material);
  text.scale.y = -1;
  text.geometry.boundingSphere = undefined;
  scene.add(text);
  const timer = new Timer();
  const animation = createExampleAnimationLoop((_timestamp) => {
    text.rotation.y += timer.update().delta * 0.2;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });
  return {
    ...animation,
    cleanup() {
      animation.cleanup();
      timer.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";
const data = new EASEL.TTFLoader().parse(arrayBuffer);
const font = new EASEL.TTFFont(data);
const geometry = new EASEL.ShapeGeometry(font.generateShapes("EASEL", 100));
const mesh = new EASEL.Mesh(geometry, material);
mesh.scale.y = -1; // Convert font coordinates to scene-up coordinates.`;

export const example = {
  meta,
  controls,
  setup,
  easelSource,
};
