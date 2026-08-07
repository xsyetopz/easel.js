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

### Example

```ts
import * as EASEL from "@xsyetopz/easel";

const width = globalThis.innerWidth, height = globalThis.innerHeight;

// init

const camera = new EASEL.PerspectiveCamera({
  fov: 70,
  aspect: width / height,
  near: 0.01,
  far: 10,
});
camera.position.z = 1;

const scene = new EASEL.Scene();

const geometry = new EASEL.BoxGeometry(0.2, 0.2, 0.2);
const material = new EASEL.BasicMaterial();

const mesh = new EASEL.Mesh(geometry, material);
scene.add(mesh);

const renderer = new EASEL.Renderer({ width, height });
document.body.appendChild(renderer.domElement);

// animation

function animate(time) {
  mesh.rotation.x = time / 2000;
  mesh.rotation.y = time / 1000;
  renderer.render(scene, camera);

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
```

If done right, you'll see a [white rotating square](https://jsfiddle.net/v34j18zf/1/)

See [migration-0.7.md](references/migration-0.7.md) for upgrades from 0.6 to 0.7.

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
[examples](https://easeljs.org/examples) aligned to supported three.js animation,
controls, and raycaster concepts without WebGL or WebGPU-only demos.

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
bun run biome:lint
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
