# Changelog

All notable changes to EASEL.js are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/) and uses semantic versioning.

## [0.5.0] - 2026-04-30

### Added

- Added `renderer.sortObjects`, matching THREE.js-style draw-call sorting control.
- Added THREE-like material depth flags: `transparent`, `depthTest`, and `depthWrite`.
- Added depth-buffered raster paths for opaque scenes and safe sorted/blended paths for transparent materials.
- Added Object3D-style static transform flags and renderer cache paths for static scene traversal.
- Added strict test gates for test TypeScript, playground TypeScript, explicit test `any`, and paired EASEL/THREE example source parity.
- Added shared playground control and docs types.

### Changed

- Opaque depth-buffered meshes now preserve geometry/index order instead of sorting triangles per draw call.
- `renderer.sortObjects = false` now skips avoidable draw-call sorting while keeping transparent rendering safe.
- Playground examples now use paired THREE.js snippets or explicit no-equivalent reasons.
- Playground texture examples now resolve assets from the configured Vite base path.
- API reference data moved out of the old `playground/docs/classes.ts` god file into per-category modules behind the same facade.
- Test fixtures now use shared helper modules instead of repeated local fixtures.
- Package metadata, README, JSR config, and release scripts were updated for the 0.5.0 release gate.

### Fixed

- Fixed duplicate EASEL import warning so it only warns for mismatched loaded revisions.
- Fixed playground React type coverage by using official React type packages.
- Fixed playground strict TypeScript errors exposed by the new playground typecheck gate.
- Fixed texture 404s in playground builds served from non-root base paths.
