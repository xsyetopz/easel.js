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

## Code conventions

- JSDoc for all public types (`@param`, `@returns`, `@type`, `@typedef`)
- `@override` on members that override a parent class
- No inline lint suppressions - fix the code or adjust the rule
- Class hierarchy: `EventDispatcher` → `Node` → `Mesh`/`Light`/`Camera`/etc.
- Materials: `Material` base → `BasicMaterial`, `LambertMaterial`, `ToonMaterial`, etc.
- Pipeline stages: `SceneTraversal` → `PainterSort` → `Shading` → `Rasterizer` → `Framebuffer`

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

## Design docs

See [`docs/EASEL_vs_THREE.md`](docs/EASEL_vs_THREE.md) for the full API reference, RuneTek 3 engine study, and THREE.js divergence rationale.
