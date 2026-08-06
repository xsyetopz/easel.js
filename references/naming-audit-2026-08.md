# Naming and Comment Audit (2026-08-06)

**Status**: STRIP-IN-PLACE

## Issues Found

### 1) CanvasAudioVisualizer redundancy

- **File**: `src/audio/CanvasAudioVisualizer.ts`
- **Problem**: The only supported backend is Canvas2D, so `CanvasAudioVisualizer` introduces an inconsistent prefix (same as `Canvas2DRenderer`, `SVGRenderer` etc.)
- **Scope**: Single file, but used in public exports and examples – affects user mental load

### 2) JSDoc self-narration & placeholders

- **Scope**: Multiple source files under
  - `src/audio/`
  - `src/cameras/`
  - `src/controls/`
  - `src/pipeline/`
- **Examples**: Internal commentary, agent-like self-narration lines like
  - `// Constructed a CPU framebuffer renderer with optional Canvas2D target.`
  - `// Initialize per-line deferred finalization.`
  - `"// cleanup [infer]" or `"// temporary"` with `// TODO: fix` or `// FIXME`
- **Impact**: Low code clarity, signals informality

### 3) Inconsistent Renderer prefixes

| Symbol | Current name | Concern |
|--------|--------------|---------|
| `CanvasAudioVisualizer` | EASEL internal component | Only Canvas backend; prefix redundant |
| `Canvas2DRenderer` | ── | Redundant with `Renderer` (already Canvas) |
| `SVGRenderer` | OK | Sub-technique (rendering) – suffix acceptable |
| `CSS2DRenderer` | OK | Layout technique (DOM overlay) – suffix acceptable |
| `CSS3DRenderer` | OK | Layout technique (3D overlay) – suffix acceptable |

### 4) Naming convention alignment with directory manifests

**easel 0.7+ export synopsis**

| Directory | Public exports | Naming convention |
|-----------|----------------|-------------------|
| `src/audio/` | `AudioGraph`, `AudioAnalyzer`, `CanvasAudioVisualizer` | Should drop `Canvas` prefix (only one backend) |
| `src/curves/` | `Curve`, `CurvePath`, `NURBSCurve` | OK |
| `src/exporters/` | `OBJExporter`, `PLYExporter`, `STLExporter` | OK |
| `src/materials/` | `BasicMaterial`, `LambertMaterial` | OK |
| `src/cameras/` | `Camera` (base), `OrthographicCamera` | OK |
| `src/controls/` | `OrbitControls` | OK |
| `src/renderers/` | `Renderer`, `SVGRenderer` | OK |
| `src/textures/` | `Texture`, `DataTexture`, `VideoTexture` | OK |

### 5) Public import surface vs `src/index.ts`

- Count: 734 total exports in `src/index.ts`
- 255 modules expose symbols
- No missing or orphaned exports beyond `src/renderers/` (they all map to `Renderer` wrapper)

## Actionable fixes

1. Rename `CanvasAudioVisualizer` → `AudioVisualizer` in:
   - `src/audio/CanvasAudioVisualizer.ts`
   - `src/audio/AudioTypes.ts` (if used in annotations)
   - `src/audio/index.ts` (if exists)
   - `www/examples/webaudio/*.js` (import paths)
   - Update all comments to remove self-narration

2. Strip self-narration and placeholder comments from:
   - `src/audio/` (all files)
   - `src/cameras/` (all files)
   - `src/controls/` (all files)
   - `src/pipeline/` (all files)
   - Keep only user-facing JSDoc (parameter types, constraints), delete agent-like self-talk

3. Revalidate `src/index.ts` after renaming to ensure no dangling exports remain.

4. Update `README.md` and `references/three-box-to-easel.md` examples to use the new `AudioVisualizer` (if linked).

5. Commit stepwise (rename → strip comments → validate) to avoid drift.

## Current state (before fixes)

| Metric | Status |
|--------|--------|
| Public exports | 734 out of 3080 total lines in `src/index.ts` |
| Modules with exports | 255 |
| JSDoc self-narration files | Unknown without systematic scanner |
| Namespace consistency | OK (no WebGL/WebGPU) |
| Prefix redundancy | 1 area to address (`CanvasAudioVisualizer`) |

## Estimated effort

- Renaming `CanvasAudioVisualizer`: ~30 minutes
- Comment cleanup (self-narration/remove placeholders): ~2–3 hours (parallelizable)
- Validation: ~30 minutes (typecheck & docs:generate)
