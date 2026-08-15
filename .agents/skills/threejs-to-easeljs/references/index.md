# Three.js r185 to EASEL.js 0.7.0 reference router

The checked baseline is `three@0.185.1` (`REVISION = "185"`) and `@xsyetopz/easel@0.7.0` (`REVISION = "0.7.0"`). A consumer's resolved packages override it. Choose the row that owns the source behavior, then load that file directly.

| Audit area | Reference | First decision |
| --- | --- | --- |
| Versions, declarations, imports, evidence, status ledger | [Baseline and audit](baseline-audit.md) | What is actually installed, and what evidence would close each row? |
| `WebGLRenderer`, `Object3D`, scenes, fog ownership, cameras | [Renderer, scene, and cameras](renderer-scene-cameras.md) | Can one CPU framebuffer and the target graph/camera contract represent the use? |
| `BufferGeometry`, attributes, primitives, mesh, lines, points, instances, skin/morph surfaces | [Geometry and objects](geometry-objects.md) | Is the data copied correctly, and does the main renderer consume the object path? |
| Materials, transparency, lighting, fog response, textures | [Materials, textures, and lights](materials-textures-lights.md) | Which shader, map, blend, or sampling behavior must be adapted or removed? |
| Mixers, tracks, controls, raycasting, audio, physics | [Animation, controls, picking, audio, and physics](animation-controls-picking-audio-physics.md) | Does the integration contract match beyond the exported class name? |
| Core and format loaders, exporters, DOM renderers, asset preflight | [Loaders, exporters, DOM, and assets](loaders-exporters-dom-assets.md) | Does each exact asset variant or downstream consumer fit the target subset? |
| GPU/PBR/postprocess exclusions, port order, browser and acceptance evidence | [Unsupported behavior and validation](unsupported-validation.md) | What is retained, approximated, prebaked, omitted, measured, or left `UNKNOWN`? |

## Lookup order

1. Record the consumer's resolved Three version, runtime revision, declaration source, add-on paths, and EASEL version.
2. Open [Baseline and audit](baseline-audit.md) and create the ledger.
3. Load only the subsystem references needed by the inventory.
4. Inspect the consumer's installed Three runtime/JSDoc and EASEL declarations plus owning source.
5. Record `UNKNOWN` with exact files checked when the required behavior is not established.

The checked Three package contains JavaScript with JSDoc and no bundled `.d.ts` files. Do not report an external `@types/three` surface as r185 runtime evidence unless its installed version is recorded separately.
