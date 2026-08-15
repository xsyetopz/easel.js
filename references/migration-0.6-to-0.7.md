# Migration from EASEL 0.6.1 to 0.7.0

**Status**: DRAFT — Procedural commonality from 0.1 to 0.6. (no price changes within the version set; adjust as needed for specific updates.)

## Executive Summary

EASEL 0.7 (baseline `@xsyetopz/easel@0.7.0`) represents a major API upgrade that adds audio, camera split, controls, curves, exporters, materials, loaders, and physics, while preserving CPU/Canvas2D semantics. The renderer contract remains unchanged—no WebGL/WebGPU, no shader programs, no PBR, no GPU backends.

## High-level increment table (0.1→0.6)

| Category | Core differences (0.1 → 0.6) |
|---------|------------------------------|
| Renderer | `Renderer.render()` + webhook custom hook (0.6) keep same contract; no WebGL/WebGPU |
| SceneGraph | `Mesh`/`Light`/`Material` interfaces retain same signatures; features extend via new factory aliases (`gltf_loader_build_mesh`, `vox_loader_blob`, etc.) |
| Basic Geometry | `BoxGeometry`, `SphereGeometry`, `PlaneGeometry`, `CircleGeometry`, `Texture` & `DataTexture` signatures unchanged |
| Basic Materials | `BasicMaterial`, `LambertMaterial`, `PhongMaterial` constructors unchanged |
| Cameras | `PerspectiveCamera` and `OrthographicCamera` baseline constructor unchanged; new projection presets documented in `cam2/` (0.6) |
| Controls | `OrbitControls` basic class unchanged; advanced presets still available |
| Anim/Tracks | `AnimationClip`, `Animator`, `AnimationTrack` interface unchanged; new animation actions extend capabilities |
| Textures | `Texture`, `DataTexture`, `CanvasTexture`, `VideoTexture` unchanged; all textures still clamp to 128×128 and use nearest-neighbor interpolation |
| List | 0.1: ~160 examples; 0.6: ~180 examples (loader/exporter caps added) |
| Integration |发生在隐式 video-smallest-specific query via API `gltfParserBuilder` (no GPU) |

> **Note**: This document describes the baseline change set; for detailed updiffs, refer to source-level changelog and migration diffs (TODO: attach diff list to tripartite review).

## Remaining Work

- [ ] Supply three.js → easel equivalent for Three.js BoxGeometry + MeshNormalMaterial (full path used in README.md)
- [ ] Enumerate new 0.7 APIs in `migration-0.7.md` plus migration table for each kit
- [ ] Capture changelog snippet for cross-reference (to sources/CHANGELOG.md)
