# Materials and fog

This file covers two traps that three.js habits cause: EASEL's discrete,
inverted opacity scale, and fog's explicit lookup-table rebuild. The
runnable files are in `assets/examples/`. The tier is Executed with a stub
Canvas2D host under Bun, not a browser. Local numbers come from
`sh assets/examples/verify.sh examples` on macOS arm64 with Bun 1.4.2 and
tsc 7.0.2.

## Contents

- Discrete opacity
- Fog lookup table

## Discrete opacity

**Definition.** `Material.opacity` takes an integer from `0` (opaque) to
`8` (fully transparent). This is the reverse of an alpha value. The
setter throws `RangeError` for any other value, including `0.5`
(`src/materials/Material.ts`). Blending happens only when
`transparent === true` and `opacity > 0`. The source weight is
`(8 - opacity) / 8` (`src/pipeline/rasterizer/_RasterizerState.ts`).

Passing `transparent: true` to the constructor also defaults
`depthWrite` to `false`. Setting `material.transparent = true` after
construction leaves `depthWrite` unchanged. `PainterSort` draws
transparent calls after opaque ones, back to front.

**Use when.**

- Porting a three.js `opacity` in the 0..1 range, or making any surface
  see-through.

**Do not use when.**

- You need a continuous alpha or a per-pixel alpha. The CPU renderer
  supports only 9 steps. Make the geometry fully opaque, or fake the edge
  with texture art.

**Example.**

```ts
/** Maps a conventional 0..1 alpha to EASEL's inverted 0..8 opacity steps. */
export function opacityFromAlpha(alpha: number): number {
  return Math.round((1 - alpha) * 8);
}

export function createGlass(alpha: number): BasicMaterial {
  // 0 is opaque and 8 is invisible; blending also needs transparent: true.
  return new BasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: opacityFromAlpha(alpha),
  });
}
```

Runnable: `assets/examples/opacity.ts`.

**Cost removed.** A `RangeError` from fractional opacity, and silently
opaque "transparent" materials. Local run with red over a blue
background: the opaque material gave `#ff0000`, and `opacity: 4` without
`transparent` also gave `#ff0000`. `opacity: 4` with `transparent: true`
gave `#c00040`.

**Verify.**

1. `sh assets/examples/verify.sh examples` prints `PASS opacity`.
1. `rg -n 'opacity\s*[:=]\s*0?\.[0-9]' src` finds no fractional
   assignments in app code.

## Fog lookup table

**Definition.** `Fog` precomputes a 256-entry opacity table. The
constructor builds it. The `near`, `far`, `mode`, and `density` setters
only set `lutNeedsUpdate`. Scene traversal throws
`Error("Fog LUT is dirty; call updateLut() before traversal.")` while the
table is dirty (`src/scenes/Fog.ts`, `src/pipeline/SceneTraversal.ts`).
Fog color also sets the frame's clear color (see
[clear color](frame.md#clear-color-and-background-precedence)).

**Use when.**

- Changing any fog parameter after construction, for example from a
  slider or a day-night cycle.

**Do not use when.**

- You are only changing `fog.color`. It is not part of the table.
- The fog is new. The constructor already built its table.

**Example.**

```ts
export function setFogRange(fog: Fog, near: number, far: number): void {
  fog.near = near;
  fog.far = far;
  // Setters only mark the 256-entry table dirty; rebuild it once here.
  fog.updateLut();
}
```

Runnable: `assets/examples/fog-lut.ts`.

**Cost removed.** A render that throws after any fog tweak. Local run:
setting `fog.far = 80` made the next render throw the message above.
After `updateLut()`, the render succeeded.

**Verify.**

1. `sh assets/examples/verify.sh examples` prints `PASS fog-lut`.
1. `scene.fog.lutNeedsUpdate` is `false` right before `render`.
