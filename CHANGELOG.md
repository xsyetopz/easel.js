# Changelog

All notable changes to EASEL.js are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/) and uses
semantic versioning.

## [Unreleased]

### Added

- Added side-by-side website examples that mirror three.js r186 examples.
  Each page runs the three.js original on WebGL beside its EASEL port on
  Canvas2D and lists every difference between them. Upstream `webgl_*` ids
  appear as `canvas_*`, with the three.js id kept in `meta.upstream`.

### Changed

- The triangle rasterizer reuses one options and shading record per renderer
  instead of allocating per triangle and per scanline callback. Output is
  pixel-identical; in the render benchmark, frame time drops by about 20% to
  55% on triangle- and point-heavy workloads (100,000 points: 14.8 ms to
  7.0 ms per frame).
- Regenerated `api-comparison/three-core.txt` against three.js r186
  (`three@0.186.1`).

### Removed

- Removed the custom website examples in favor of the three.js mirror.
- Removed example assets that no example or test uses anymore.
- Removed `@astrojs/check`, the `typescript-compiler-api` alias, and the Bun
  patches for `@volar/kit` and `@astrojs/language-server`. No script ran
  `astro check`, and `@astrojs/check` still requires TypeScript 5 or 6.

### Fixed

- `PointLight` and `SpotLight` now apply their documented `decay` exponent,
  using three.js's `1 / max(distance^decay, 0.01)` falloff. Before, a light
  with `distance` 0 had no falloff, and `decay` was ignored. Scenes with such
  lights render darker away from the light.
- `Box3.setFromObject` now bounds meshes built from `Geometry`. It read
  `geometry.attributes.position`, which a `Geometry` never has, so every mesh
  gave an empty box.
- `Points` with `vertexColors` now draw each point in its own vertex color.
  Before, each group of three points shared their averaged color.
- New nodes now copy `DEFAULT_UP` into `up`, as documented.
- `Node.rotation` now follows in-place `quaternion` changes such as
  `setFromAxisAngle`, as in three.js. Before, it kept the old angles, and the
  next `rotation` write discarded the quaternion change.
- `GCodeLoader` materials now use three.js's colors, as documented: `0xff0000`
  for travel paths and `0x00ff00` for extrusion.
- `PolyhedronGeometry` and its tetrahedron, octahedron, dodecahedron, and
  icosahedron subclasses now subdivide each face into `(detail + 1)^2`
  triangles with three.js's vertex order, normals, and UVs. Before, `detail`
  meant `4^detail` recursive splits, so `detail` above 1 produced more vertices
  than three.js and large values never finished. `detail` 0 now has flat
  normals, and UVs change.
- Wireframe materials now use the triangle's baked lighting and fog instead of
  drawing the unlit base color.
- SVG path parsing accepts arc flags written without separators, treats extra
  coordinate pairs after an absolute `M` as absolute line-tos, and draws arcs
  with sweep flag 0 from their start point instead of backwards from the end.
- `TTFFont.generateShapes` no longer throws on glyphs without an outline, such
  as space in three.js typeface JSON; `TTFGlyph.o` is now optional.
- The `Fog` constructor documentation now says the lookup table is built at
  construction.
- Raycasting now honors `Material.side` as three.js does: front-sided meshes
  are no longer hit from behind, and back-sided meshes are hit only from
  behind.
- `Euler.setFromRotationMatrix` now handles gimbal lock as three.js does. It
  sets the free axis to zero instead of keeping the previous angle, which made
  `lookAt` near a yaw of ±90° roll the camera. The `XZY` order also used the
  wrong matrix elements in gimbal lock.
- `Points` now fade into scene fog by each point's own fog factor; before,
  they ignored fog.
- A mesh whose material has `visible: false` is no longer drawn, as
  documented; its children still render.
- `Renderer` now draws `Sprite` objects as camera-facing quads, as their
  documentation describes; before, sprites produced no pixels.
- `Sprite.raycast` now uses the camera-facing quad and
  `SpriteMaterial.rotation`, so picking matches rendered pixels and three.js.
  A zero-area sprite no longer reports hits.
- Restored the `typescript-api` alias to TypeScript 6.0.3. TypeScript 7 exports
  no JavaScript compiler API from its package root, so the API comparison,
  modern-API, public-JSDoc, and docs generation scripts failed on 7.0.2.
- Mapped `MeshToonMaterial` and the typed `*KeyframeTrack` classes to their
  EASEL names in the API comparison, which had listed each pair as unrelated
  one-sided classes.
- Fixed the benchmark `ImageData` polyfill to accept the `(width, height)`
  constructor form, which crashed `bun run bench` on scene workloads.

## [0.7.0] - 2026-08-15

### Added

- Added a linked API symbol table of contents and live Canvas2D figures to the
  documentation manual.
- Added locally pinned, license-documented example assets with integrity tests
  for glTF, OBJ, PCD, PDB, PLY, STL, VOX, XYZ, and G-code workflows.

### Changed

- Consolidated geometry JSON parsing under the CPU-named `GeometryLoader` and
  removed the misleading `BufferGeometryLoader` export. The canonical loader
  preserves supported typed attributes, index width, morph data, ranges,
  bounds, names, parameters, and user data from nested serialized geometry.
- Standardized clamped nearest-neighbor texture lookup to normalized texel
  cells and documented texel-center atlas UVs.
- Refined the website examples with concise explanations, compact shared
  controls, reliable source excerpts, and practical loader scenes.
- Updated the `using-easeljs` and `threejs-to-easeljs` agent skills for the
  EASEL.js 0.7.0 API and Three.js r185 migration baseline.

### Fixed

- Made `Geometry.setColors()` RGB attributes render automatically with basic,
  lit, textured, and instanced meshes without splitting geometry by color.
- Fixed light and dark syntax highlighting, example source loading, and
  Canvas2D example framing and orientation issues.
- Fixed orbit and map damping, pointer-lock activation, transform-gizmo
  picking and layering, and repeated opaque overlay rendering.
- Fixed glTF primitives without explicit materials and added explicit
  extrusion and toolpath modes for G-code loading.

## [0.6.1] - 2026-08-02

### Changed

- Changed package metadata and project docs back to the MIT license.

### Fixed

- Fixed scanline clipping so triangles entirely outside the framebuffer
  horizontally no longer collapse into persistent edge pixels.

## [0.6.0] - 2026-07-09

### Added

- Added screen-space `Texture` scene backgrounds while preserving fog-color
  override behavior.
- Added the Astro/Starlight docs and examples site with generated API reference
  pages, crawlable routes, and source-adjacent examples.
- Added `@astrojs/check` coverage with Bun patches that let Astro/Volar use a
  TypeScript 6 compiler-API alias while the project stays on TypeScript 7.
- Added GitHub issue forms, PR template, governance/release/deploy workflows,
  and Dependabot coverage for GitHub Actions.

### Changed

- Changed package metadata and project docs to the ISC license.
- Replaced the React/Vite playground surface with the `www/` Astro website and
  docs-generation pipeline.
- Updated README, AGENTS, CONTRIBUTING, and generated API docs to match current
  renderer behavior, package commands, TypeScript source, and release gates.
- Updated website styling and copy for consistent light/dark palettes,
  business-like cards, icon-prefixed cards, footer links, examples pages, docs
  navigation, code blocks, and mobile brand sizing.
- Updated release/dependency checks to allow the pinned TypeScript compiler-API
  compatibility alias required by Astro check.

### Fixed

- Fixed `/docs` routing and generated Starlight output so the docs root builds
  and resolves.
- Fixed website strict typing errors in Astro code blocks, sidebars, example
  gallery/viewer scripts, theme toggles, and footer links.
- Fixed light-mode code block contrast, dark-mode tab color mismatches, giant
  shadows, narrow count bubbles, footer package buttons, and card icon
  placement.
- Fixed stale docs that said scene backgrounds accepted only flat colors or that
  cameras were orthographic-only.

## [0.5.0] - 2026-04-30

### Added

- Added `renderer.sortObjects`, matching THREE.js-style draw-call sorting
  control.
- Added THREE-like material depth flags: `transparent`, `depthTest`, and
  `depthWrite`.
- Added depth-buffered raster paths for opaque scenes and safe sorted/blended
  paths for transparent materials.
- Added Object3D-style static transform flags and renderer cache paths for
  static scene traversal.
- Added strict test gates for test TypeScript, website TypeScript, explicit test
  `any`, and paired EASEL/THREE example source parity.
- Added shared website control and docs types.

### Changed

- Opaque depth-buffered meshes now preserve geometry/index order instead of
  sorting triangles per draw call.
- `renderer.sortObjects = false` now skips avoidable draw-call sorting while
  keeping transparent rendering safe.
- Website examples now use paired THREE.js snippets or explicit no-equivalent
  reasons.
- Texture examples now resolve assets from the configured site base path.
- API reference data moved out of the old `www/docs/classes.ts` god file into
  per-category modules behind the same facade.
- Test fixtures now use shared helper modules instead of repeated local
  fixtures.
- Package metadata, README, JSR config, and release scripts were updated for the
  0.5.0 release gate.

### Fixed

- Fixed duplicate EASEL import warning so it only warns for mismatched loaded
  revisions.
- Fixed website type coverage for the current website stack.
- Fixed website strict TypeScript errors exposed by the new website typecheck
  gate.
- Fixed texture 404s in website builds served from non-root base paths.
