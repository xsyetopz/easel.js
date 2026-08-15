# Three.js r185 to EASEL.js 0.7.0 reference

This is a routing page, not a parity table. The verified reference source is
`three@0.185.1` (`REVISION = "185"`); the verified target is
`@xsyetopz/easel@0.7.0` (`REVISION = "0.7.0"`). A consuming project's resolved
packages override these reference assumptions.

## Lookup order

1. Inventory the source project and determine its actual Three revision and
   add-on import paths.
2. Use [`references/threejs-migration.md`](references/threejs-migration.md) for
   the audit ledger and subsystem mappings.
3. Use [`references/grounding.md`](references/grounding.md) for verified package,
   export, declaration, and main-renderer anchors.
4. Inspect the consumer's resolved Three runtime/JSDoc and EASEL
   `dist/index.d.ts` plus owning declarations/source.
5. Record `UNKNOWN` with exact files checked when evidence does not establish
   the required behavior.

The installed `three@0.185.1` package has no bundled `.d.ts`. Do not report an
external `@types/three` surface as r185 runtime evidence unless its installed
version is recorded and checked separately.

## Quick subsystem map

| Source area | Target starting point | First question |
| --- | --- | --- |
| `WebGLRenderer` / WebGPU renderer | `Renderer` | Can the result be expressed by the fixed CPU scanline + Canvas2D pipeline? |
| `Object3D`, scene graph | `Node`, `Scene`, `Group` | Are transforms/hierarchy enough, or does code rely on Three-specific events, serialization, callbacks, or subclasses? |
| Cameras | `PerspectiveCamera`, `OrthographicCamera` | Is this a single full-frame view? Multi-view, cube, XR, viewport and scissor behavior require separate decisions. |
| `BufferGeometry`, attributes | `Geometry`, `Attribute`, `InterleavedData`, `InterleavedAttribute` | Which channels, groups, draw ranges, morphs, skinning, update ranges, and index types are actually used? |
| Mesh/line/points/instances | `Mesh`, line classes, `Points`, `InstancedMesh` | Is the object/material pair consumed by the main `Renderer`, not merely exported? |
| Materials | Basic/Lambert/Toon/line/points families | Which shader/PBR/maps/blending/clipping fields lack CPU meaning? |
| Textures | `Texture`, `DataTexture`, `CanvasTexture`, `VideoTexture`, `FramebufferTexture` | Can RGBA unsigned-byte, nearest, no-mipmap, maximum 128×128 cached image sampling preserve the intent? |
| Lights/fog | CPU-baked lights, `Fog`, `FogExp2` | Are shadows, PBR, environment lighting, or per-pixel response required? |
| Animation | `Animator`, `AnimationClip`, typed tracks, `AnimationGroup`, `Timer` | Do track grammar, interpolation, morph/skinning consumption, and action lifecycle match? |
| Controls | Nine EASEL root control classes | Do used properties/events/update arguments and DOM pointer behavior match this control, not just its name? |
| Picking | `Raycaster` | Are matrices prepared and do required object types expose a verified `raycast` path? |
| Loaders | EASEL root loader classes | Does the exact file variant/extension fit the bounded CPU parser and result type? |
| Exporters | GLTF/OBJ/PLY/STL/EXR plus MTL/GCode | Does the EASEL output shape and supported scene subset fit the downstream consumer? |
| CSS/SVG add-ons | CSS2D/CSS3D/SVG renderers and objects | Which node/material subset is rendered and who owns its DOM lifecycle? |
| Audio | `Audio`, `AudioListener`, `PositionalAudio`, `AudioAnalyzer`, `AudioLoader` | Is browser Web Audio behavior needed, and is the analyzer spelling/API adapted? |
| Physics | EASEL CPU physics or retained external engine | Can the existing engine continue to update EASEL transforms? Do not equate unrelated physics APIs. |
| Postprocessing/XR/shaders | No direct main-renderer equivalent | Remove, prebake, approximate outside the renderer, retain the old backend, or mark `UNKNOWN`. |

## Completion gate

- The source package, runtime revision, type source, add-on imports, asset
  variants, and browser/runtime are recorded.
- Every imported symbol and every relied-on non-default behavior has a status,
  target anchor, consequence, and verification case.
- A target typecheck passes, and a real browser canvas rendered representative
  object/material and asset combinations.
- Resize, matrices, transparency/order, texture limits, animation, controls,
  picking, loading failures, disposal, performance, and visual differences were
  either checked or marked **UNVERIFIED**.
- GPU/PBR/postprocessing behavior was not silently represented as target parity.
