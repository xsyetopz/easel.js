# Changelog

All notable changes to EASEL.js are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/) and uses
semantic versioning.

## [Unreleased]

### Added

- Added a linked API symbol table of contents and live Canvas2D figures to the
  documentation manual.
- Added locally pinned, license-documented example assets with integrity tests
  for glTF, OBJ, PCD, PDB, PLY, STL, VOX, XYZ, and G-code workflows.

### Changed

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
