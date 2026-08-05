# EASEL.js

[![CI](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml/badge.svg)](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@xsyetopz/easel)](https://www.npmjs.com/package/@xsyetopz/easel)
[![JSR](https://jsr.io/badges/@xsyetopz/easel)](https://jsr.io/@xsyetopz/easel)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

EASEL.js is a TypeScript 3D renderer for browser Canvas2D. It provides a
THREE-style scene graph and a CPU rasterization pipeline without WebGL.

The renderer is useful for deterministic pixels, retro 3D, software-rendering
experiments, and code that needs inspectable rasterization stages. It uses
affine UV mapping, nearest-neighbor textures, discrete opacity, and CPU depth
testing. It does not implement PBR, shadow maps, shaders, or GPU resources.

[Website](https://easeljs.org) - [Examples](https://easeljs.org/examples) -
[API](https://easeljs.org/docs) -
[npm](https://www.npmjs.com/package/@xsyetopz/easel) -
[JSR](https://jsr.io/@xsyetopz/easel)

**Languages:** English - [简体中文](README.zh-CN.md) - [Español](README.es.md) -
[Português](README.pt-BR.md) - [Français](README.fr.md) -
[Deutsch](README.de.md) - [日本語](README.ja.md) - [한국어](README.ko.md) -
[Русский](README.ru.md) - [العربية](README.ar.md) - [हिन्दी](README.hi.md)

## Install

```sh
bun add @xsyetopz/easel
```

To install from JSR instead:

```sh
bunx jsr add @xsyetopz/easel
```

## Example

```html
<canvas id="scene"></canvas>
<script type="module" src="/src/main.ts"></script>
```

```ts
import {
    AmbientLight,
    BoxGeometry,
    LambertMaterial,
    Mesh,
    OrthographicCamera,
    Renderer,
    Scene,
} from "@xsyetopz/easel";

const canvas = document.querySelector<HTMLCanvasElement>("#scene");
if (!canvas) throw new Error("Missing #scene canvas");

const renderer = new Renderer({ canvas, width: 640, height: 360 });
const scene = new Scene();
scene.background = 0x18_1c_24;

const camera = new OrthographicCamera({
    left: -3.2,
    right: 3.2,
    top: 1.8,
    bottom: -1.8,
    near: 0.1,
    far: 100,
});
camera.position.set(0, 0, 5);

scene.add(new AmbientLight(0xff_ff_ff, 0.6));
const cube = new Mesh(
    new BoxGeometry(1, 1, 1),
    new LambertMaterial({ color: 0xff_55_44 }),
);
scene.add(cube);

function frame(): void {
    cube.rotation.y += 0.01;
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
}
frame();
```

## Renderer limits

- Canvas2D output through `ImageData`; no WebGL or WebGPU.
- Flat and Gouraud lighting calculated on the CPU.
- Affine UV interpolation. Perspective textures can warp.
- Image textures clamp to 128×128 and use normalized texel-cell
  nearest-neighbor sampling; atlas UVs should target texel centers.
- Geometry RGB color attributes multiply material, texture, instance, and
  baked-light colors. Uniform-color faces retain the flat raster path.
- Transparent objects depend on sorted draw order.
- Opacity uses fixed steps rather than continuous alpha.

See the [API reference](https://easeljs.org/docs) and
[examples](https://easeljs.org/examples) for cameras, geometry, materials,
textures, animation, picking, loaders, helpers, and voxel scenes.

## Agent skills

This repository includes portable skills for EASEL.js development and THREE.js
migration:

```sh
bunx skills add xsyetopz/easel.js --skill using-easeljs
bunx skills add xsyetopz/easel.js --skill threejs-to-easeljs
```

## Development

```sh
bun install
bun test
bun run typecheck
bun run biome:check
bun run www:build
```

Run `bun run release:check` before a release. Publishing is performed only by
the protected GitHub Actions workflow.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Project
structure and renderer boundaries are documented in [AGENTS.md](AGENTS.md).

## Contributing and coding agents

- People: read [`CONTRIBUTING.md`](CONTRIBUTING.md) before submitting a change.
- Coding agents: read [`AGENTS.md`](AGENTS.md) before changing files or using
  repository tools.
- Translations: none.

## License

[MIT](LICENSE)
