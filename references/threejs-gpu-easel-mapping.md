# Three.js to EASEL GPU-Only Example Parity Mapping

Defines taxonomy for GPU-only three.js examples that do not have CPU Canvas2D equivalents per `js-softrast-optguide.md`.

## Classification Methodology

### Audit Tool

Run from project root:

```bash
node scripts/audit-threejs-parity.mjs
```

The authoritative classification is `references/three-examples-classification.csv` (595 IDs from the official `examples/files.json` manifest). See `references/three-examples-audit.md` for the full audit methodology and per-family counts.

### Status Counts (official `dev` manifest, 595 IDs)

| Status | Count | Meaning |
|--------|-------|---------|
| `direct` | 6 | Render feature maps directly to existing EASEL primitives. |
| `adapt` | 71 | CPU rendering is plausible with EASEL primitives; source needs adaptation. |
| `unsupported_gpu` | 369 | Requires shaders, GPU compute, render targets, postprocessing, shadow maps, PBR/env maps, or other GPU-only capabilities. |
| `external` | 149 | Depends on a non-renderer integration (DOM, Web Audio, WebXR, physics, importer/exporter, game input). CPU/browser equivalent may exist. |

### GPU-Only Categories (369 `unsupported_gpu` entries)

| Category | GPU Feature Out of Scope | CPU Alternative / Annotation |
|----------|--------------------------|------------------------------|
| **Post-Processing** | Shader passes (BloomPass, AfterimagePass, BokehPass, OutlineEffect, AnaglyphEffect, StereoEffect) | No CPU scanline pass. Tag: `gpuOnly: true`. |
| **Shaders/TSL** | ShaderMaterial, ShaderLib, Node-based shading (TSL) | Baked lighting or flat materials only. Tag: `gpuOnly: true`. |
| **GPGPU** | Compute shaders (CSM, clustering, particle physics) | CPU grid/lookup approximations. Tag: `gpuOnly: true`. |
| **Shadow Maps** | PCF, VSM, contact shadows, CSM | No CPU shadow mapping in renderer contract. Tag: `gpuOnly: true`. |
| **PBR/Environment** | Env maps, PMREM, cubemaps, transmission, clearcoat, subssurface scattering | Baked flat or Lambert lighting only. Tag: `gpuOnly: true`. |
| **Render Targets** | MRT, framebuffer readback, depth textures, texture arrays, 3D textures | No GPU render target in CPU rasterizer. Tag: `gpuOnly: true`. |
| **Advanced/GPU Features** | Raymarching, volumetric, instanced buffers with GPU wiring, WebGPU native, texture compression (KTX2/DRACO) | CPU fallback at renderer contract limits. Tag: `gpuOnly: true`. |

### Tagging Format

Each GPU-only example file `www/examples/{category}/{name}.js` must include:

```typescript
import { ... } from "@/index.js";

export const meta = {
  id: "threejs_example_id",
  name: "Example title",
  category: "category",
  description: "... GPU-only behavior description and CPU substitute explanation.",
  gpuOnly: true,
  outOfScopeReason: "GPU-Only category reason string per taxonomy table.",
};

export const controls = [];

export function setup(canvas) {
  // ... CPU Canvas2D implementation with input mapping only.
}

export const example = { meta, controls, setup };
```

### Naming and Canonical Mapping

- `id` field: Same `threejs` ID as canonical source.
- No `experimental/features/standalone` categories; GPU-only items placed in applicable categories (`xr`, `canvas`, etc.).

## Current Status

### Implemented gpuOnly Stubs (11 files in `www/examples/xr/`)

All 11 are WebXR session/device-bound and genuinely require GPU framebuffer submission:

| File | ID |
|------|----|
| `xr/webxr_vr_handinput.js` | `webxr_vr_handinput` |
| `xr/webxr_vr_handinput_cubes.js` | `webxr_vr_handinput_cubes` |
| `xr/webxr_vr_handinput_pointerclick.js` | `webxr_vr_handinput_pointerclick` |
| `xr/webxr_vr_handinput_pointerdrag.js` | `webxr_vr_handinput_pointerdrag` |
| `xr/webxr_vr_handinput_pressbutton.js` | `webxr_vr_handinput_pressbutton` |
| `xr/webxr_vr_handinput_profiles.js` | `webxr_vr_handinput_profiles` |
| `xr/webxr_xr_controls_transform.js` | `webxr_xr_controls_transform` |
| `xr/webxr_xr_cubes.js` | `webxr_xr_cubes` |
| `xr/webxr_xr_dragging.js` | `webxr_xr_dragging` |
| `xr/webxr_xr_haptics.js` | `webxr_xr_haptics` |
| `xr/xr_input_helpers.js` | (helper module) |

### GPU-Bound Examples Without Stubs (37 IDs)

These 37 `external`/`unsupported_gpu` CSV entries have no file in `www/examples/`. They are excluded by absence. See `.tmp/parity-audit-findings.md` §7b for the full list.

15 are WebXR examples that need `gpuOnly` stubs. 8 are GPU-only texture/compression formats. 14 are WebGPU renderer/compute/XR examples.

### CPU-Feasible Gaps (29 IDs)

These 29 `external` CSV entries have no file and are CPU-feasible (loaders, exporters, helpers). See `.tmp/parity-audit-findings.md` §7a for the full list.

## Validation

Run parity gate after tagging updates:

```bash
bun run examples:source-parity
bun run typecheck:website
bun run biome:check
```

All three gates must pass (exit 0).
