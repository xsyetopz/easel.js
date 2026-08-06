# Prefix Cleanup: Go / No-Go + Target List

**Status**: GO (with targeted rename)

## Go / No-Go decisions

| Symbol | Prefix | Decision | Rationale |
|--------|--------|----------|-----------|
| `CanvasAudioVisualizer` | REDUNDANT | **GO to rename** | Only Canvas backend; all examples use Canvas |
| `Canvas2DRenderer` | REDUNDANT | NO (removed earlier) | Not in 0.7 exports |
| `SVGRenderer` | OK | **NO rename** | Rendering technique (vs layout `CSS2DRenderer`) |
| `CSS2DRenderer` | OK | **NO rename** | Layout technique (DOM overlay) |
| `CSS3DRenderer` | OK | **NO rename** | Layout technique (3D overlay) |
| `DataTexture` | OK | **NO rename** | Texture format, not technique |
| `VideoTexture` | OK | **NO rename** | Texture source, not technique |
| `Texture` | OK | **NO rename** | Base type, not technique |

## Target rename: `CanvasAudioVisualizer` → `AudioVisualizer`

### Files to modify

| File | Current name | New name | Operation |
|------|--------------|----------|-----------|
| `src/audio/CanvasAudioVisualizer.ts` | `CanvasAudioVisualizer` | `AudioVisualizer` | Rename class |
| `src/audio/AudioTypes.ts` | `CanvasAudioVisualizer` (type references) | `AudioVisualizer` | Rename type |
| `src/audio/index.ts` | (if exists) | (if exports) | Update export |
| `www/examples/webaudio/webaudio_sandbox.js` | `CanvasAudioVisualizer` | `AudioVisualizer` | Import path |
| `www/examples/webaudio/webaudio_visualizer.js` | `CanvasAudioVisualizer` | `AudioVisualizer` | Import path |
| `www/examples/webaudio/webaudio_orientation.js` | `CanvasAudioVisualizer` | `AudioVisualizer` | Import path |
| `www/examples/webaudio/webaudio_timing.js` | `CanvasAudioVisualizer` | `AudioVisualizer` | Import path |
| `src/audio/*.test.ts` | Verify imports align |

### Impact analysis

- Public API surface change: introduces breaking symbol rename
- Benefits: clearer naming (no phantom backend), matches existing `Renderer` (clean)
- Removal effort: low (only class rename, then regenerate docs)

### Naming downstream

If move forward, also unify audio-related current exports:
- `CanvasAudioContext` → `AudioContext` (inline with Web Audio API)
- Keep `drawFrequencyBars`, `drawTimeDomainWaveform` as free functions
- Keep `AudioGraph`, `AudioAnalyzer` unchanged (their only Canvas clients use `AudioVisualizer`)

## Post-fix validation

1. Typecheck: `bun run typecheck` (should succeed with updated imports)
2. Docs generation: `bun run docs:generate` (ensures reference updates)
3. Example runtime: Open bundled web pages for audio examples
4. Verify no remaining `CanvasAudioVisualizer` tokens in codebase (grep)
