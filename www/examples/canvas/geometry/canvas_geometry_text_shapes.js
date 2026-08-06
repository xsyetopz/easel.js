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
  Vector3,
} from "@/index.js";

export const meta = {
  id: "webgl_geometry_text_shapes",
  name: "Text Shapes",
  category: "canvas",
  description:
    "Vector glyph rectangles are authored as ShapeGeometry contours, avoiding font and SVG loaders while keeping CPU triangulation visible.",
};

export const controls = [];

function rectangle(x, y, width, height) {
  const shape = new Shape();
  shape.moveTo(x, y);
  shape.lineTo(x + width, y);
  shape.lineTo(x + width, y + height);
  shape.lineTo(x, y + height);
  shape.lineTo(x, y);
  return shape;
}

function makeGlyphShapes() {
  const patterns = {
    C: ["111", "100", "100", "100", "111"],
    P: ["110", "101", "110", "100", "100"],
    U: ["101", "101", "101", "101", "111"],
  };
  const shapes = [];
  const text = "CPU";
  for (let letter = 0; letter < text.length; letter++) {
    const pattern = patterns[text[letter]];
    for (let row = 0; row < pattern.length; row++) {
      for (let column = 0; column < pattern[row].length; column++) {
        if (pattern[row][column] !== "1") continue;
        shapes.push(
          rectangle(
            -2.25 + letter * 1.55 + column * 0.4,
            1 - row * 0.4,
            0.32,
            0.32,
          ),
        );
      }
    }
  }
  return shapes;
}

export function setup(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const scene = new Scene();
  scene.background = 0x131a28;
  const camera = new PerspectiveCamera({
    fov: 40,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(0, 0.2, 7.4);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.45));
  const light = new DirectionalLight(0xffffff, 0.85);
  light.position.set(2, 5, 6);
  scene.add(light);
  const text = new Mesh(
    new ShapeGeometry(makeGlyphShapes()),
    new LambertMaterial({ color: 0xefb65f }),
  );
  scene.add(text);
  const clock = new Timer();
  let animationFrame;
  function animate() {
    animationFrame = requestAnimationFrame(animate);
    text.rotation.y += clock.update().delta * 0.22;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const glyphShapes = [rectangle(...), rectangle(...)];
const geometry = new EASEL.ShapeGeometry(glyphShapes);
const mesh = new EASEL.Mesh(geometry, material);`;

export const threeSource = `import * as THREE from "three";

const geometry = new THREE.ShapeGeometry(fontShapes);
const mesh = new THREE.Mesh(geometry, material);`;

export const example = { meta, controls, setup, easelSource, threeSource };
