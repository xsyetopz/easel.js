# Easel.js

Canvas2D software renderer with a THREE.js-like scene graph API, constrained by the RuneTek 3 engine as observed in Old School RuneScape.

## Stack

- **Language**: JavaScript with JSDoc types (no TypeScript source files)
- **Bundler**: Vite 8
- **Tests**: Vitest 4 (`tests/**/*.test.js`)
- **Linter/Formatter**: Biome 2 (tabs, double quotes)
- **Package manager**: Bun
- **Type checking**: TypeScript (`checkJs: true`, strict mode, `@/` path alias → `./src/`)

## Commands

```bash
bun run dev            # Vite dev server
bun run build          # Vite production build
bun run test:run       # Vitest (single run)
bun run typecheck      # tsc --noEmit
bun run biome:check    # Biome lint + format (with --write)
```

## Rendering constraints

These are architectural, not bugs. Do not "fix" them.

- **Painter's algorithm primary** - back-to-front sort by tile distance + layer integer, `Uint16Array` depth buffer for early-Z rejection within sorted draw calls
- **Affine UV mapping** - no perspective-correct textures, visible with PerspectiveCamera
- **HSL16 color** - 16-bit packed (6H/3S/7L), precomputed LUT to RGB
- **Integer screen coords** - round-half `(x + 0.5) | 0` on projected vertices (vertex wobble is correct)
- **Flat/Gouraud shading only** - no per-pixel lighting
- **9-step opacity** - discrete 0–8 integer, not continuous alpha
- **128x128 max texture** - nearest-neighbor downsample, no mipmaps
- **Tile-radius fog** - hard cutoff to black, no gradient

## Playground

- **Framework**: React 19 + Mantine 8 (AppShell, code-highlight, hooks)
- **Syntax highlighting**: highlight.js via `@mantine/code-highlight` adapter — token colors in `playground/hljs-theme.css` (Mantine's CSS has none)
- **Theme**: light/dark/system via `defaultColorScheme="auto"`, toggle in NavHeader
- **Routing**: hash-based (`useHashRoute`), pages: Home, ExamplesGallery, ExampleViewer, DocsLanding, DocViewer
- **Textures**: files in `public/textures/`, loaded via `TextureLoader` which uses `ImageBitmapLoader` (fetch + createImageBitmap) — NOT `ImageLoader` (HTMLImageElement), because Canvas2D `getImageData()` is subject to CORS taint that WebGL `texImage2D()` avoids
- **Dev server**: `bun run dev` — restart required after `vite.config.js` changes (Vite reads config at startup only)

## Code conventions

- JSDoc for all public types (`@param`, `@returns`, `@type`, `@typedef`)
- `@override` on members that override a parent class
- No inline lint suppressions - fix the code or adjust the rule
- Class hierarchy: `EventDispatcher` → `Node` → `Mesh`/`Light`/`Camera`/etc.
- Materials: `Material` base → `BasicMaterial`, `LambertMaterial`, `ToonMaterial`, etc.
- Pipeline stages: `SceneTraversal` → `FogCuller` → `PainterSort` → `LightBaker` → `Rasterizer` → `Framebuffer` (with `DepthBuffer`)

## THREE.js name mapping

| THREE.js             | Easel.js             | Why                     |
| -------------------- | -------------------- | ----------------------- |
| `Object3D`           | `Node`               | Scene graph node        |
| `BufferGeometry`     | `Geometry`           | No GPU buffers          |
| `WebGLRenderer`      | `Renderer`           | One renderer            |
| `OrthographicCamera` | `OrthographicCamera` | Same name               |
| `PerspectiveCamera`  | `PerspectiveCamera`  | Same name               |
| `AnimationMixer`     | `Animator`           | Plays clips             |
| `MeshBasicMaterial`  | `BasicMaterial`      | "Mesh" prefix redundant |
| `KeyframeTrack`      | `Track`              | All tracks are keyframe |

## Loader architecture

`TextureLoader` uses `ImageBitmapLoader` (fetch + `createImageBitmap`), not `ImageLoader` (`new Image()`). This is a deliberate divergence from THREE.js because:

1. We read pixels via `getImageData()` (CPU renderer) — HTMLImageElement + `crossOrigin` taints the canvas
2. `fetch()` needs `Accept: image/*` header to bypass Vite/SPA history API fallback (default `*/*` matches `text/html`)
3. `ImageBitmap` drawn to OffscreenCanvas never taints — `getImageData()` always succeeds

`Loader.crossOrigin` defaults to `""` (not `"anonymous"` like THREE.js). `ImageLoader` only sets `image.crossOrigin` when the value is truthy.

## Design docs

See [`docs/EASEL_vs_THREE.md`](docs/EASEL_vs_THREE.md) for the full API reference, RuneTek 3 engine study, and THREE.js divergence rationale.
