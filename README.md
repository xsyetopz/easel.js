# EASEL.js

[![CI status](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml/badge.svg)](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@xsyetopz/easel)](https://www.npmjs.com/package/@xsyetopz/easel)
[![MIT license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

EASEL.js is a TypeScript 3D software renderer with a three.js-style scene graph. It rasterizes on the CPU and uploads `ImageData` to browser Canvas2D.

The renderer uses CPU scanline rasterization with flat or Gouraud lighting and
affine UVs. Image textures are clamped to 128×128 and sampled with nearest
neighbor. Opacity uses fixed steps. Opaque fragments can use a 16-bit CPU depth
buffer; transparent materials rely on sorted draw order. There is no WebGL,
WebGPU, shader pipeline, PBR materials, or shadow mapping.

[Documentation](https://easeljs.org/manual/) ·
[API reference](https://easeljs.org/docs/) ·
[Examples](https://easeljs.org/examples/) ·
[npm](https://www.npmjs.com/package/@xsyetopz/easel)

## Install

```sh
npm install @xsyetopz/easel
```

## First Canvas2D scene

Add a `<canvas></canvas>` element to the page, then render a box:

```ts
import * as EASEL from "@xsyetopz/easel";

const canvas = document.querySelector("canvas");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("A canvas element is required.");
}

const width = 640;
const height = 360;
const renderer = new EASEL.Renderer({ canvas, width, height });
const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
  fov: 70,
  aspect: width / height,
  near: 0.01,
  far: 10,
});
camera.position.z = 2;

const mesh = new EASEL.Mesh(
  new EASEL.BoxGeometry(),
  new EASEL.BasicMaterial({ color: 0x4c8bf5 }),
);
scene.add(mesh);

renderer.prepare(scene, camera);
renderer.render(scene, camera);
```

The [first-scene guide](https://easeljs.org/manual/first-scene/) covers animation
and resizing.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and contribution requirements.

## License

[MIT](LICENSE)
