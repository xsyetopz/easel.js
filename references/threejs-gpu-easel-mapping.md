# Three.js to EASEL GPU-Only Example Parity Mapping

Defines taxonomy for GPU-only three.js examples that do not have CPU Canvas2D equivalents per `js-softrast-optguide.md`.

## Classification Methodology

### Audit Tool

Run from project root:

```bash
node scripts/audit-threejs-parity.mjs
```

Output: Classifies 252 CPU-compatible vs 173 GPU-only examples based on shader/GPGPU/XR presence.

### GPU-Only Categories

| Category | GPU Feature Out of Scope | CPU Alternative / Annotation |
|----------|--------------------------|------------------------------|
| **XR** | WebXR sessions, XR Controllers / Hands, Haptics, AR sessions | Desktop Canvas2D camera/orbit controls; input mapping hearts only. Tag: `gpuOnly: true`, Reason: "WebXR framebuffer submission required; client input simulation possible." |
| **Post-Processing** | Shader passes (BloomPass, AfterimagePass, BokehPass, OutlineEffect, AnaglyphEffect, StereoEffect) | No CPU scanline pass. Implemented scene contents shown directly via Canvas2D rasterization. Tag: `gpuOnly: true`, Reason: "GPU shader programs for fullscreen post-processing not replacable in CPU Canvas2D." |
| **Shaders/TSL** | ShaderMaterial, ShaderLib, Node-based shading (TSL) | Baked lighting or flat materials only. Tag: `gpuOnly: true`, Reason: "GPU-specified materials/passes beyond EASEL contract." |
| **GPGPU** | Compute shaders (CSM, clustering, particle physics) | CPU grid/lookup approximations; perfragment contributions via table lookups. Tag: `gpuOnly: true`, Reason: "GPU compute required; CPU fallback approximation not restores exact behavior." |
| **Advanced/GPU Features** | Raymarching, Volumetric, InstancedBuffer with GPU wiring, WebGPUNative, Texture compression (KTX2/DRACO) | CPU fallback approximations at renderer contract limits (affine UV, 128x128 texel sampling). Tag: `gpuOnly: true`, Reason: "GPU hardware-specific computation not resolvable in CPU rasterizer." |

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

// Optional: easelSource for CPU equivalent representation (sub-components)
// Optional: threeSource for reference GPU-implementation snippets.

export const easelSource = `...`;
export const threeSource = `...`;

export const example = { meta, controls, setup, easelSource, threeSource };
```

### Naming and Canonical Mapping

- `id` field: Same `threejs` ID as canonical source.
- `threeSource` content: Direct `import { ... } from "three";` blocks for reference.
- `easelSource` content: Targeted CPU-skeletal code mapping the GPU patterns to Canvas2D APIs (e.g., grid lookups, sprite scaling).
- No `experimental/features/standalone` categories; GPU-only items placed in applicable categories (`xr`, `examples`, `webxr`).

## Current Status

### Completed Tagging

| Category | Count | Notes |
|----------|-------|-------|
| xr | 11 | `webxr_vr_handinput*.js`, `webxr_xr_*.js`, `xr_input_helpers.js`. All tagged with `gpuOnly: true` and `outOfScopeReason="WebXR framebuffer/rendering required."` |
| examples (XR) | 0 | Remote-only GPU-features not replicated yet. |
| effects | 0 | Complex shader passes; CPU equivalent approximations not in scope without breaking renderer contract. |
| webxr | 0 | Native WebXR driven by browser; no EASEL equivalent. |

### Pending Tagging (173+ GPU-only examples identified)

Categories not yet tagged:

- Effects (107 examples) - Post-processing passes.
- Advanced rendering lines/quad (12 examples) - GPU buffers, fullscreen quads.
- Audio rendering & loaders (9 examples) - GPU-based codec buffers.

**Strategy:** GPU-only examples with simple geometry+mixed lighting and no shader pass can implement CPU-skimmed versions using sampled textures; those with fullscreen shader paths (bloom, DOF, SSAA) are out-of-scope per contract.

## Validation

Run parity gate after tagging updates:

```bash
bun run examples:source-parity
```

Expected: Non-GPU-only examples respect watchers for `threeSource`/`easelSource`; GPU-only items show proper `gpuOnly: true` flags in registry.ts output.

## Minimum Viable GPU-Only Examples

Before broad GPU-only tagging rollout, maintain at least one demonstrator per category:

- `www/examples/xr/webxr_vr_translates.js` - Basic XR input mapping with `gpuOnly: true` and input simulation.
- `www/examples/canvas/effects_bloom_approx.js` - Docker node-based lighting with simulated bloom via sprite scaling (if feasible).
- `www/examples/core/tex_load_textures.js` - GPU texture loader replacement using DOM bitmap decoding, marked GPU-only if required buffers can't map to CPU ImageData.

Define CPU fallback approaches in each `outOfScopeReason` field for transparency.

## Integration with Registry

Update `www/examples/registry.ts` to extract GPU-only markers:

- Use `grep -h "gpuOnly:" www/examples/ | wc -l` for coverage reporting.
- Mark completed GPU-only tagging via registry badge appending `gpu-excluded={count}`.
