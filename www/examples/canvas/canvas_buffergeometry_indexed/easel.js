import {
  Attribute,
  Color,
  Geometry,
  HemisphereLight,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Side,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "canvas_buffergeometry_indexed",
  upstream: "webgl_buffergeometry_indexed",
  name: "buffergeometry / indexed",
  category: "canvas",
  animated: true,
  description:
    "A 10x10 indexed grid Geometry with per-vertex normals and a red-green gradient over full blue tumbles under a hemisphere light, with a wireframe toggle.",
  differences: [
    "MeshPhongMaterial becomes LambertMaterial with Gouraud (per-vertex) lighting, so the grid has no specular highlight.",
    "EASEL has no color management: the sRGB vertex colors are stored as display values and lighting is applied to them directly instead of in linear space.",
    "The wireframe is drawn by the CPU rasterizer without anti-aliasing.",
  ],
};
/** @type {import("../../../types/controls.ts").ControlDefinition[]} */
export const controls = [
  {
    type: "select",
    key: "wireframe",
    label: "wireframe",
    options: ["on", "off"],
    default: "off",
  },
];

export function setup(canvas, params = {}) {
  //

  const camera = new PerspectiveCamera({
    fov: 27,
    aspect: canvas.width / canvas.height,
    near: 1,
    far: 3500,
  });
  camera.position.z = 64;

  const scene = new Scene();
  scene.background = 0x050505;

  //

  const light = new HemisphereLight();
  light.intensity = 3;
  scene.add(light);

  //

  const geometry = new Geometry();

  const indices = [];

  const vertices = [];
  const normals = [];
  const colors = [];

  const size = 20;
  const segments = 10;

  const halfSize = size / 2;
  const segmentSize = size / segments;

  const _color = new Color();

  // generate vertices, normals and color data for a simple grid geometry

  for (let i = 0; i <= segments; i++) {
    const y = i * segmentSize - halfSize;

    for (let j = 0; j <= segments; j++) {
      const x = j * segmentSize - halfSize;

      vertices.push(x, -y, 0);
      normals.push(0, 0, 1);

      const r = x / size + 0.5;
      const g = y / size + 0.5;

      // EASEL colors are display (sRGB) values, so no color-space argument.
      _color.setRGB(r, g, 1);

      colors.push(_color.r, _color.g, _color.b);
    }
  }

  // generate indices (data for element array buffer)

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * (segments + 1) + (j + 1);
      const b = i * (segments + 1) + j;
      const c = (i + 1) * (segments + 1) + j;
      const d = (i + 1) * (segments + 1) + (j + 1);

      // generate two faces (triangles) per iteration

      indices.push(a, b, d); // face one
      indices.push(b, c, d); // face two
    }
  }

  //

  geometry.index = indices;
  geometry.setAttribute(
    "position",
    new Attribute(new Float32Array(vertices), 3),
  );
  geometry.setAttribute("normal", new Attribute(new Float32Array(normals), 3));
  geometry.setAttribute("color", new Attribute(new Float32Array(colors), 3));

  const material = new LambertMaterial({
    side: Side.Double,
    vertexColors: true,
  });
  material.wireframe = params.wireframe === "on";

  const mesh = new Mesh(geometry, material);
  scene.add(mesh);

  //

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  //

  const animation = createExampleAnimationLoop(() => {
    const time = Date.now() * 0.001;

    mesh.rotation.x = time * 0.25;
    mesh.rotation.y = time * 0.5;

    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  });

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    },
    update(next) {
      if (next.wireframe !== undefined) {
        material.wireframe = next.wireframe === "on";
      }
    },
    cleanup() {
      animation.cleanup();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const geometry = new EASEL.Geometry();
geometry.index = indices;
geometry.setAttribute("position", new EASEL.Attribute(new Float32Array(vertices), 3));
geometry.setAttribute("normal", new EASEL.Attribute(new Float32Array(normals), 3));
geometry.setAttribute("color", new EASEL.Attribute(new Float32Array(colors), 3));

const material = new EASEL.LambertMaterial({
  side: EASEL.Side.Double,
  vertexColors: true,
});
const mesh = new EASEL.Mesh(geometry, material);
scene.add(mesh);

mesh.rotation.x = time * 0.25;
mesh.rotation.y = time * 0.5;
renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };
