# EASEL.js

[![CI](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml/badge.svg)](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@xsyetopz/easel)](https://www.npmjs.com/package/@xsyetopz/easel)
[![npm downloads](https://img.shields.io/npm/dm/@xsyetopz/easel)](https://www.npmjs.com/package/@xsyetopz/easel)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@xsyetopz/easel)](https://bundlephobia.com/package/@xsyetopz/easel)
[![JSR](https://jsr.io/badges/@xsyetopz/easel)](https://jsr.io/@xsyetopz/easel)
[![JSR Score](https://jsr.io/badges/@xsyetopz/easel/score)](https://jsr.io/@xsyetopz/easel)
[![jsDelivr hits](https://img.shields.io/jsdelivr/npm/hm/@xsyetopz/easel)](https://www.jsdelivr.com/package/npm/@xsyetopz/easel)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

A software renderer using HTML5 Canvas2D with a THREE.js-compatible scene graph API. Every pixel is drawn by the CPU using a painter's-algorithm scanline rasterizer - no WebGL, no GPU.

## Install

### npm

```bash
# npmjs.com
npm install @xsyetopz/easel

# jsr.io
npx jsr add @xsyetopz/easel
```

### yarn

```bash
yarn install @xsyetopz/easel
```

### pnpm

```bash
pnpm install @xsyetopz/easel
```

### Bun

```bash
# npmjs.com
bun install @xsyetopz/easel

# jsr.io
bunx jsr add @xsyetopz/easel
```

### Deno

```bash
# npmjs.com
deno add npm:@xsyetopz/easel

# jsr.io
deno add jsr:@xsyetopz/easel
```

## Quick start

```js
import {
  Scene, PerspectiveCamera, Mesh,
  BoxGeometry, LambertMaterial, Renderer,
  AmbientLight, DirectionalLight,
} from "@xsyetopz/easel";

const renderer = new Renderer({
  canvas: document.querySelector("canvas"),
  width: 800,
  height: 600,
});

const scene = new Scene();
const camera = new PerspectiveCamera({
  fov: 45,
  aspect: 800 / 600,
  near: 0.1,
  far: 100,
});
camera.position.set(0, 2, 5);

scene.add(new AmbientLight(0xffffff, 0.4));
const sun = new DirectionalLight(0xffffff, 0.8);
sun.position.set(3, 5, 4);
scene.add(sun);

const box = new Mesh(
  new BoxGeometry(1, 1, 1),
  new LambertMaterial({ color: 0xff4444 }),
);
scene.add(box);

function animate() {
  requestAnimationFrame(animate);
  box.rotation.y += 0.01;
  renderer.render(scene, camera);
}
animate();
```

## Scene graph

Easel.js mirrors the THREE.js API wherever it makes sense. If you know THREE.js, you already know the basics.

| Category      | Classes                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------ |
| **Core**      | `Scene`, `Node`, `Group`, `Mesh`, `Raycaster`, `Clock`                                           |
| **Cameras**   | `PerspectiveCamera`, `OrthographicCamera`                                                        |
| **Lights**    | `AmbientLight`, `DirectionalLight`, `PointLight`, `SpotLight`, `HemisphereLight`                 |
| **Materials** | `BasicMaterial`, `LambertMaterial`, `ToonMaterial`, `LineMaterial`                               |
| **Geometry**  | `BoxGeometry`, `SphereGeometry`, `PlaneGeometry`, `CylinderGeometry`, `TorusGeometry`, + 15 more |
| **Textures**  | `Texture`, `CanvasTexture`, `DataTexture`, `VideoTexture`                                        |
| **Helpers**   | `BoxHelper`, `GridHelper`, `AxesHelper`, `SpotLightHelper`                                       |
| **Controls**  | `OrbitControls`                                                                                  |
| **Animation** | `Animator`, `AnimationClip`, `Track`                                                             |
| **Math**      | `Vector3`, `Matrix4`, `Quaternion`, `Color`, `Ray`, `MathUtils`                                  |

### THREE.js name mapping

| THREE.js              | Easel.js          | Reason                  |
| --------------------- | ----------------- | ----------------------- |
| `Object3D`            | `Node`            | Scene graph node        |
| `BufferGeometry`      | `Geometry`        | No GPU buffers          |
| `WebGLRenderer`       | `Renderer`        | Single renderer         |
| `MeshBasicMaterial`   | `BasicMaterial`   | "Mesh" prefix redundant |
| `MeshLambertMaterial` | `LambertMaterial` | Same                    |
| `MeshToonMaterial`    | `ToonMaterial`    | Same                    |
| `AnimationMixer`      | `Animator`        | Plays clips             |
| `KeyframeTrack`       | `Track`           | All tracks are keyframe |

## Rendering pipeline

```mermaid
graph LR
  ST["SceneTraversal"]
  FC["FogCuller"]
  PS["PainterSort"]
  LB["LightBaker"]
  R["Rasterizer"]
  FB["Framebuffer"]
  ST --> FC --> PS --> LB --> R --> FB
```

- **Painter's algorithm** - back-to-front sort by tile distance, Uint16 depth buffer for residual overlap
- **Flat & Gouraud shading** - per-face and per-vertex lighting, no per-pixel
- **Affine UV mapping** - no perspective correction (visible warping on large quads)
- **Linear fog** - per-vertex depth fog with configurable color, near, and far
- **Integer screen coords** - `(x + 0.5) | 0` on projected vertices
- **128x128 max texture** - nearest-neighbor, no mipmaps
- **9-step opacity** - discrete 0-8, not continuous alpha

## Development

```bash
bun run dev            # Vite dev server + playground
bun run build          # Production build
bun run test:run       # Vitest (single run)
bun run typecheck      # tsc --noEmit
bun run biome:check    # Biome lint + format
```

## License

[MIT](LICENSE)
