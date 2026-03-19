# Easel.js

[![CI](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml/badge.svg)](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Canvas2D software renderer with a THREE.js-compatible scene graph API. Every pixel is drawn by the CPU using a painter's-algorithm scanline rasterizer — no WebGL, no GPU.

## Quick start

```bash
bun install
bun run dev
```

```js
import {
  Scene, PerspectiveCamera, Mesh,
  BoxGeometry, LambertMaterial, Renderer,
  AmbientLight, DirectionalLight,
} from "easel";

const renderer = new Renderer({
  canvas: document.querySelector("canvas"),
  width: 800,
  height: 600,
});

const scene = new Scene();
const camera = new PerspectiveCamera({
  fov: 45,               // degrees
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

| Category | Classes |
|---|---|
| **Core** | `Scene`, `Node`, `Group`, `Mesh`, `Raycaster`, `Clock` |
| **Cameras** | `PerspectiveCamera`, `OrthographicCamera` |
| **Lights** | `AmbientLight`, `DirectionalLight`, `PointLight`, `SpotLight`, `HemisphereLight` |
| **Materials** | `BasicMaterial`, `LambertMaterial`, `ToonMaterial`, `LineMaterial` |
| **Geometry** | `BoxGeometry`, `SphereGeometry`, `PlaneGeometry`, `CylinderGeometry`, `TorusGeometry`, + 15 more |
| **Textures** | `Texture`, `CanvasTexture`, `DataTexture`, `VideoTexture` |
| **Helpers** | `BoxHelper`, `GridHelper`, `AxesHelper`, `SpotLightHelper` |
| **Controls** | `OrbitControls` |
| **Animation** | `Animator`, `AnimationClip`, `Track` |
| **Math** | `Vector3`, `Matrix4`, `Quaternion`, `Color`, `Ray`, `MathUtils` |

### THREE.js name mapping

| THREE.js | Easel.js | Reason |
|---|---|---|
| `Object3D` | `Node` | Scene graph node |
| `BufferGeometry` | `Geometry` | No GPU buffers |
| `WebGLRenderer` | `Renderer` | Single renderer |
| `MeshBasicMaterial` | `BasicMaterial` | "Mesh" prefix redundant |
| `MeshLambertMaterial` | `LambertMaterial` | Same |
| `MeshToonMaterial` | `ToonMaterial` | Same |
| `AnimationMixer` | `Animator` | Plays clips |
| `KeyframeTrack` | `Track` | All tracks are keyframe |

## Rendering pipeline

```
SceneTraversal → FogCuller → PainterSort → LightBaker → Rasterizer → Framebuffer
```

- **Painter's algorithm** — back-to-front sort by tile distance, Uint16 depth buffer for residual overlap
- **Flat & Gouraud shading** — per-face and per-vertex lighting, no per-pixel
- **Affine UV mapping** — no perspective correction (visible warping on large quads)
- **Linear fog** — per-vertex depth fog with configurable color, near, and far
- **Integer screen coords** — `(x + 0.5) | 0` on projected vertices
- **128x128 max texture** — nearest-neighbor, no mipmaps
- **9-step opacity** — discrete 0-8, not continuous alpha

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
