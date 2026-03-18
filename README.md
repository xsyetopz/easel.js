# Easel.js

[![CI](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml/badge.svg)](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Canvas2D software renderer with a THREE.js-like scene graph API. Every polygon is drawn by the CPU using a painter's-algorithm scanline rasterizer — no WebGL, no GPU. Rendering constraints are modeled after the RuneTek 3 engine as observed in Old School RuneScape.

## Quick start

```bash
bun install
bun run dev
```

```js
import { Scene, Camera, Mesh, BoxGeometry, BasicMaterial, Renderer } from "easel";

const renderer = new Renderer({ canvas: document.querySelector("canvas"), width: 800, height: 600 });
const scene = new Scene();
const camera = new Camera({ left: -400, right: 400, top: 300, bottom: -300, near: 0.1, far: 1000 });

const box = new Mesh(new BoxGeometry(1, 1, 1), new BasicMaterial({ color: 0xff0000 }));
scene.add(box);

renderer.render(scene, camera);
```

## Development

```bash
bun run dev            # Vite dev server
bun run test:run       # Run tests
bun run typecheck      # Type check (tsc --noEmit)
bun run biome:check    # Lint + format
```

## Design

- Painter's algorithm (no z-buffer)
- Affine UV mapping (no perspective correction)
- HSL16 color space (16-bit packed)
- Integer screen coordinates (vertex snapping)
- Flat and Gouraud shading (no per-pixel lighting)
- Orthographic projection only

See [`docs/EASEL_vs_THREE.md`](docs/EASEL_vs_THREE.md) for the full design reference and THREE.js API mapping.

## License

[MIT](LICENSE)
