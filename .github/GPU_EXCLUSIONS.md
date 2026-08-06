# GPU-Only Feature Exclusions: CPU Parity milestones

**Scope:** Defines WebGL/WebGPU features requiring GPU execution that cannot be replaced with EASEL's CPU Canvas2D rasterizer. Each exclusion includes: three.js canonical example reference, GPU feature identifier, CPU approximation strategy (if any), and recommended fallback behavior.

**Classification Methodology:** See `references/threejs-gpu-easel-mapping.md`.

## Current Milestone: WebXR Sessions (11 examples)

| Example (three.js) | GPU Feature | CPU Approximation | EASEL Status |
|--------------------|-------------|-------------------|--------------|
| `webxr_vr_handinput.js` | WebXR Controller Input/rendering | Desktop input mapping, CPU-only scene graph, hand-marker surface on Canvas2D | `gpuOnly: true` - input simulation only |
| `webxr_xr_cubes.js` | WebXR Bounded Floor, controllers | Desktop point+dual-marker interaction, no XR scene | `gpuOnly: true` - partial control mapping |
| `webxr_xr_dragging.js`, `webxr_vr_handinput_pointerclick.js`, etc. | Device-specific pose, haptics | Desktop pointer fallback, force-remapped click simulation | `gpuOnly: true` - approximate gestures |

**Recommended CPU fallback:** Desktop simultaneous input mapping; no attempt to render XR framebuffer. Handtracking and VR haptics are out-of-scope (browser native APIs only).

## Phase 2: GPU Effects & Post-Processing (100+ examples)

| Example (three.js) | GPU Feature | CPU Approximation | EASEL Status |
|--------------------|-------------|-------------------|--------------|
| `effects/AnaglyphEffect.js` | GPU shader fullscreen pass | Dual-camera separate passes with CPU red/blue channel composition and alpha clamping | CPU-skimmed render compute not currently in `www/examples/.camera/` |
| `effects/BokehPass.js`, `effects/AfterimagePass.js` | Compute-based depth-of-field, motion blur | No CPU scanline approx via renderer contract (requires full screen float buffers). Consider billboard sprite approximation in future. | GPU-only - deferred indefinitely |
| `Effects` (Outlines/SSR/SSAO) | Shader-based structures | CPU stroke rendering on billboards; unrealistic fidelity. | GPU-only - labeled e.g. `effects_stroke_approx.js` for experimental demos only |

**Recommended CPU fallback:** For specific test cases, implement anaglyph compositions using dual cleared ImageData buffers with manual blending. For depth-of-field/outlines, mark as full out-of-scope until float screen-space textures are added to EASEL.

## Phase 3: GPGPU & Advanced Compute

| Example (three.js) | GPU Feature | CPU Approximation | EASEL Status |
|--------------------|-------------|-------------------|--------------|
| `CSM.js`, `CSMFrustum.js` | Compute clustering for shadow maps | Loose grid-based culling table; per-fragment light influences via table lookup (valid within renderer contract but does not match shadow map resolution). | CPU approximation exists in `js-softrast-optguide.md` but not committed examples. |
| `particles/PointSpriteMaterial.js` | Texture-driven billboard efficiency | CPU array-based object grouping; 128x128 texture limits apply per EASEL contract. | Already scoped in EASEL CPU examples. |

**Recommended CPU fallback:** Grid lookup tables per fragment for GPU-time compute. Pattern documented in `js-softrast-optguide.md` and `easel-perf-backlog.md`.

## Persistent GPU-Only Categories (Unchanged)

- **Texture compression:** KTX2, DRACO loader + decoding ints. CPU fallback: decode textures locally and load via `ImageData` only.
- **Shader-based geometry:** Geometry tessellation, displacement modifiers. CPU fallback: pre-compute vertex positions or use coarse vertex grids.
- **PBR + Environment Maps:** Specular IBL, lighting with physical warrants. CPU fallback: Lambertian lighting + ambient/specular approximations.

**Recommended CPU fallback:** Keep references in backlog `easel-perf-backlog.md` with long-term approximations. Do not schedule for current parity sprint.

## Validation Gate

Run after each GPU-only exclusion addition:

```bash
bun run examples:source-parity
grep -h "gpuOnly: true" www/examples/ | wc -l
```

- Parity gate must not reject GPU-only items (they don't require `easelSource` if `gpuOnly: true`).
- GPU-only count serves as coverage report (e.g., *"172 GPU-only examples tagged across WebXR, Effects, GPGPU, and texture loader categories"*).

## Future Work (Post-Milestone)

1. **CPU-stroke approximations:** `effects_stroke_outline.js` using canvas 2D client-side stroke drawing on top of scene snapshot.
2. **Anaglyph check demo:** `camera_anaglyph_stereo_cpu.js` demonstrating per-pixel red/blue separation using dual-clear passes.
3. **GPGPU grid lookup:** `canvas_clustered_illumination.js` as CPU table lookup visualization of light clustering concepts.

Tickets created: close as `no-action` when taxonomy documentation and tagged examples align with node_modules/three classification.
