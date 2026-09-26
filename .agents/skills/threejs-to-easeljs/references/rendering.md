# Rendering: renderer, lights, materials, points, textures

Cards for the CPU renderer boundary. EASEL 0.7.0 rasterizes on the CPU
and uploads `ImageData` to a Canvas2D context (`src/renderers/Renderer.ts`,
`src/pipeline/`). Runnable pairs live under `assets/examples/<card>/`. The
three.js baselines for the renderer and PBR cards need WebGL, so only
their EASEL side runs; the verifier renders EASEL frames headlessly through
a canvas stand-in (`assets/examples/_lib/capture.ts`).

## Contents

- WebGLRenderer to Renderer
- Light intensity
- PBR, shadows, and shaders
- Opacity levels
- Render order to material layer
- Points and sprite size
- Texture size and pixel format
- CanvasTexture update

## WebGLRenderer to Renderer

**Definition.** `new Renderer({ canvas?, width?, height?, sortObjects? })`
owns one CPU framebuffer of `width` x `height` pixels and sets the canvas
to that size. Its public members are `domElement`, `width`, `height`,
`sortObjects`, `prepare(scene, camera, force?)`, `render(scene, camera,
timings?)`, `setSize(width, height)`, the `clearColor` accessor, and
`dispose()`. It has no `setAnimationLoop`, `setPixelRatio`,
`setClearColor`, `shadowMap`, render targets, viewport or scissor
(`src/renderers/Renderer.ts`).

**Use when.**

- Porting `WebGLRenderer` or `WebGPURenderer` setup and the frame loop.

**Do not use when.**

- The source renders to render targets, several viewports, or XR; those
  need a redesign, recorded as `unsupported` in the
  [migration ledger](audit.md#migration-ledger).

**Example.**

```ts
import type { Camera, Scene } from "@xsyetopz/easel";
import { Renderer } from "@xsyetopz/easel";

export function start(canvas: HTMLCanvasElement, scene: Scene,
  camera: Camera, update: (time: number) => void): () => void {
  // Framebuffer pixels, not CSS pixels: cost scales with width * height.
  const renderer = new Renderer({ canvas, width: 320, height: 240 });
  renderer.clearColor = 0x101820;
  let request = 0;
  const frame = (time: number): void => {
    update(time);
    renderer.prepare(scene, camera); // render never updates matrices
    renderer.render(scene, camera);
    request = requestAnimationFrame(frame);
  };
  request = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(request);
    renderer.dispose();
  };
}
```

three.js's `render` updates world matrices itself; EASEL's does not, so
every frame calls `prepare` after the state changes and before `render`.
Replace `setPixelRatio(devicePixelRatio)` by choosing the framebuffer size
and scaling the canvas with CSS; `setSize` sets `canvas.width`/`height`,
never CSS size.

Runnable: `assets/examples/renderer-loop/`. Tier: EASEL side executed with
a stubbed `requestAnimationFrame`; three.js side type-checked only
(WebGL).

**Cost removed.** `TS2339` on `setAnimationLoop`, `setPixelRatio`,
`shadowMap` and `TS2551` on `setClearColor`; loops that never cancel.

**Verify.**

1. The verifier prints `PASS renderer-loop: three frames rendered through
   requestAnimationFrame`, `the moved mesh is drawn (prepare ran before
   render)`, and `stop cancels the pending frame`.
1. In a browser, one frame appears and resizing calls `setSize` plus
   `camera.updateProjectionMatrix()`.

## Light intensity

**Definition.** three.js r186 lights in physical units: its Lambert
shader multiplies direct and ambient irradiance by `BRDF_Lambert =
diffuse / PI` (`src/renderers/shaders/ShaderChunk/common.glsl.js`,
`lights_lambert_pars_fragment.glsl.js`), after `ColorManagement`
(enabled by default) decodes sRGB colours to linear, and the default
`SRGBColorSpace` output encodes the result back. EASEL bakes
`colour * intensity * N.L` per face or vertex with no `1 / PI` term and
no sRGB decode or encode (`src/pipeline/shading/lightAccumulator.ts`;
`new Color(0x808080).r` is 0.502 in EASEL, 0.216 in three.js). Point and
spot `decay` and `distance` follow three.js, so the same division covers
them.

**Use when.**

- Porting any `DirectionalLight`, `PointLight`, `SpotLight`,
  `HemisphereLight` or `AmbientLight` intensity. Divide each by
  `Math.PI`, ambient included.

**Do not use when.**

- The three.js source was tuned for legacy light units (it sets
  `useLegacyLights = true` or `physicallyCorrectLights = false`, flags
  r186 no longer has): those intensities already leave out the `PI`, so
  keep them.
- Expecting a pixel match. The division halves the error but EASEL stays
  darker at mid-tones and saturates earlier, because it skips the sRGB
  curve. When screenshots must match, pick the intensity by a pixel
  probe, as the opacity card does.

**Example.**

```ts
import { AmbientLight, DirectionalLight } from "@xsyetopz/easel";

// three.js: new DirectionalLight(0xffffff, 1), new AmbientLight(0xffffff, 1)
export function easelIntensity(threeIntensity: number): number {
  return threeIntensity / Math.PI;
}

const sun = new DirectionalLight(0xffffff, easelIntensity(1));
sun.position.set(0, 0, 1);
const sky = new AmbientLight(0xffffff, easelIntensity(1));
```

Runnable: `assets/examples/light-intensity/`. Tier: EASEL side executed;
the three.js column is computed from the r186 shader formula above, not
rendered (no WebGL in bun).

**Cost removed.** Scenes about twice as bright as the three.js original,
with every lit white surface clipped to 255. Local run (verifier, macOS
arm64, bun 1.4.2), red channel of a Lambert plane facing the light:

| Surface, three.js intensity | three.js | EASEL `I / PI` | EASEL `I` |
| --- | --- | --- | --- |
| white, directional 1 | 153 | 106 | 255 |
| grey 0x80, directional 1 | 74 | 53 | 128 |
| white, ambient 1 | 153 | 106 | 255 |
| white, directional 2 | 209 | 187 | 255 |
| white, directional 3 | 250 | 255 | 255 |

**Verify.**

1. The verifier prints four `PASS light-intensity: ... I/PI is closer to
   three than I` lines and two `stays within 50 levels` lines.
1. `rg -n 'Light\([^)]*[0-9]' <ported files>` shows every intensity
   divided by `Math.PI` or recorded as probe-tuned.

## PBR, shadows, and shaders

**Definition.** EASEL lights with baked flat or Gouraud shading
(`src/pipeline/shading/`) through `BasicMaterial`, `LambertMaterial` and
`ToonMaterial`. `MeshStandardMaterial`, `MeshPhysicalMaterial`,
`MeshPhongMaterial`, `MeshMatcapMaterial`, `MeshNormalMaterial`,
`MeshDepthMaterial`, `ShadowMaterial`, `ShaderMaterial` and
`RawShaderMaterial` are three-only in the parity ledger, as are
`castShadow`, `receiveShadow`, `Light.shadow` and the public r186
`LightShadow`. `CONTRIBUTING.md` rejects PBR fields (`roughness`,
`aoMap`, ...) and r186's `Material.retroreflectivity` has no EASEL row.
`MeshPhongMaterial` and `MeshStandardMaterial` both map to
`LambertMaterial`, which has no `specular`, `shininess` or highlight of
any kind. `MeshNormalMaterial` has no equivalent: EASEL has no material
that colours by view-space normal.

**Use when.**

- The source uses any of those materials, shadow flags, environment maps,
  or post-processing.

**Do not use when.**

- Claiming equivalence. Record each as a behavior loss in the ledger.
  The default replacement is Lambert with Gouraud shading; bake
  highlights and shadows into vertex colours or textures only when the
  look depends on them. Record `MeshNormalMaterial` as `unsupported`.

**Example.**

```ts
import {
  AmbientLight, BoxGeometry, DirectionalLight, LambertMaterial, Mesh,
  Scene, Shading,
} from "@xsyetopz/easel";

const scene = new Scene();
// three.js intensity 2, divided by PI (see Light intensity)
const light = new DirectionalLight(0xffffff, 2 / Math.PI);
light.position.set(3, 5, 2);
const mesh = new Mesh(new BoxGeometry(),
  new LambertMaterial({ color: 0x44aa88, shading: Shading.Gouraud }));
scene.add(new AmbientLight(0xffffff, 0.2 / Math.PI), light, mesh);
```

Runnable: `assets/examples/pbr-shadows/`. Tier: EASEL side executed;
three.js side type-checked only (needs a WebGL renderer).

**Cost removed.** `TS2305` on `MeshStandardMaterial`, `MeshPhongMaterial`,
`MeshNormalMaterial` and `LightShadow`, `TS2339` on `castShadow`,
`receiveShadow`, `shadow`, `TS2353` on a `specular` option; and ports
that claim PBR or specular parity.

**Verify.**

1. The verifier's naive pass lists eight rejected lines for
   `pbr-shadows/naive.ts`, and the oracle prints `PASS pbr-shadows:
   LambertMaterial has no specular or shininess`.
1. `rg -n 'castShadow|receiveShadow|shadowMap|Standard|Physical|Phong'`
   over the ported files returns nothing.

## Opacity levels

**Definition.** EASEL `Material.opacity` is an integer from 0 (opaque) to
8 (fully transparent); the setter throws `RangeError` for anything else
(`src/materials/Material.ts`). Blending happens only with
`transparent: true`, with source weight `(8 - opacity) / 8` applied in a
quantized HSL colour space (`src/pipeline/color/TranslucencyTable.ts`).
three.js opacity is alpha: 0 transparent, 1 opaque. A transparent
constructor defaults `depthWrite` to false.

**Use when.**

- Porting any `opacity` or `transparent` setting.

**Do not use when.**

- Copying the number: `0.35` throws, and three.js's opaque `1` becomes
  one eighth transparent.
- Expecting identical pixels. EASEL's HSL blend is brighter than
  three.js's sRGB blend at mid levels. Local run (verifier, macOS arm64,
  bun 1.4.2), white over black, level 0..8 gives red
  `255 251 239 219 192 156 112 60 0`. For alpha 0.35 three.js gives 89;
  the formula's level 5 gives 156, level 6 gives 112. Pick the level by a
  pixel probe when screenshots must match.

**Example.**

```ts
import { BasicMaterial } from "@xsyetopz/easel";

export function easelOpacity(alpha: number): number {
  const clamped = Math.min(1, Math.max(0, alpha));
  return Math.round((1 - clamped) * 8);
}

const glass = new BasicMaterial({
  color: 0x88ccff,
  transparent: true,
  opacity: easelOpacity(0.35), // 5
});
```

Runnable: `assets/examples/opacity/`.

**Cost removed.** A `RangeError` at start-up and wrongly translucent
"opaque" materials. The oracle checks level 5 is within one step of the
pixel-best level over black and grey and that the naive `opacity: 1`
renders 251, not 255.

**Verify.**

1. The verifier prints `PASS opacity: naive alpha 0.35 throws
   (RangeError)` and both `within one step of pixel-best` lines.

## Render order to material layer

**Definition.** three.js sorts by `Object3D.renderOrder`. EASEL has no
`renderOrder`; `Material.layer` (integer, default 0) orders draw calls,
lower layers first (`src/pipeline/PainterSort.ts`,
`src/pipeline/sorting/DrawPrioritySorter.ts`). As with `renderOrder`,
order only shows where the later draw ignores depth (`depthTest: false`)
or blends. The layer belongs to the material, not the mesh.

**Use when.**

- Porting `mesh.renderOrder = n`, typically overlays, markers, outlines
  or HUD geometry with `depthTest: false`.

**Do not use when.**

- The meshes share one material but had different `renderOrder` values:
  give each its own `material.clone()` first, or both move together.
- Fixing depth fighting between opaque, depth-tested surfaces: layer
  changes nothing there (see Verify); move the geometry instead.

**Example.**

```ts
import { BasicMaterial, Mesh, PlaneGeometry } from "@xsyetopz/easel";

// three.js: marker.renderOrder = 1; material.depthTest = false
const marker = new Mesh(new PlaneGeometry(4, 4),
  new BasicMaterial({ color: 0x0000ff, depthTest: false, layer: 1 }));
```

Runnable: `assets/examples/render-layer/`. Tier: EASEL side executed;
three.js side type-checked only (sorting happens inside WebGL rendering).

**Cost removed.** `TS2339` on `renderOrder`, and overlays that vanish or
cover the wrong things. Local run: a layer 1 marker without depth test
draws over a nearer wall (`0,0,255`); a layer -1 underlay is covered
(`255,0,0`), while the same underlay on layer 0 shows through
(`0,255,0`); with the depth test on, layer alone changes nothing.

**Verify.**

1. The verifier prints four `PASS render-layer:` lines and rejects
   `render-layer/naive.ts:5` with `TS2339`.

## Points and sprite size

**Definition.** EASEL `PointsMaterial.size` is a positive integer pixel
radius; a point covers `2 * size + 1` pixels across at every distance.
The setter throws `RangeError` for anything else
(`src/materials/PointsMaterial.ts`). There is no `sizeAttenuation`, the
point rasterizer uses neither `map` nor an alpha test, and EASEL has no
`alphaTest` option at all. three.js `size` is a diameter: in pixels with
`sizeAttenuation: false`, otherwise world units scaled by
`scale / -mvPosition.z` with `scale = drawingBufferHeight / 2`
(`ShaderLib/points.glsl.js`, `WebGLMaterials.js`). `SpriteMaterial` has
no `sizeAttenuation` either: EASEL sprites always shrink with distance.
Points use per-point vertex colours, and `vertexColors` defaults to
`true` (see [Material class names](api-shape.md#material-class-names)).

**Use when.**

- Porting any `PointsMaterial` or a sprite with `sizeAttenuation: false`.

**Do not use when.**

- The points are textured sprites (soft discs, stars from a `map`) or rely
  on `alphaTest` cut-outs: use `Sprite` objects or small meshes instead.
- The source needs screen-constant sprites; EASEL cannot make them.

**Example.**

```ts
import { PointsMaterial } from "@xsyetopz/easel";

// three.js pixel diameter -> EASEL pixel radius
export function easelPointSize(threePixels: number): number {
  return Math.max(1, Math.round((threePixels - 1) / 2));
}

// three.js: { size: 5, sizeAttenuation: false, map, alphaTest: 0.5 }
const markers = new PointsMaterial({
  color: 0xffcc00,
  size: easelPointSize(5), // 2, drawn 5 px across
  vertexColors: false,
});
```

For an attenuated three.js size, convert at a representative depth first:
`pixels = size * canvasHeight / 2 / depth`. EASEL's minimum is radius 1
(3 px), so fine dust gets coarser.

Runnable: `assets/examples/points-size/`.

**Cost removed.** `TS2353` on `sizeAttenuation` and `alphaTest`, and a
start-up `RangeError` from world-unit sizes such as `0.05`. Local run:
size 1, 2, 4 draw 3, 5, 9 px across at distances 2 and 25 alike; a red
`map` on a green point renders `0,255,0`; a sprite covers 1225 px at
distance 2 and 49 px at distance 10.

**Verify.**

1. The verifier prints `PASS points-size:` lines for the widths, `no
   attenuation`, `points ignore map`, `naive world-unit size 0.05 throws`
   and `sprites are always attenuated`.

## Texture size and pixel format

**Definition.** EASEL textures hold at most 128 x 128 texels
(`MAX_SIZE = 128` in `src/textures/Texture.ts` and `DataTexture.ts`).
Pixel sources (`DataTexture`, `{ data, width, height }`) are cropped to the
top-left 128 x 128; drawable sources (images, bitmaps, canvases) are scaled
down with `drawImage` and smoothing off. `DataTexture` takes a
`Uint8ClampedArray` RGBA of exactly `width * height * 4` bytes. Sampling
is nearest-neighbour with affine UV interpolation.

**Use when.**

- Porting `DataTexture`, `CanvasTexture`, or any texture larger than 128.

**Do not use when.**

- The texture carries detail that cannot survive 128 texels (text,
  atlases of many sprites); split it across meshes or redesign.

**Example.**

```ts
import { DataTexture, Wrapping } from "@xsyetopz/easel";

const SIZE = 128; // was 256 in three.js
const data = new Uint8ClampedArray(SIZE * SIZE * 4);
// fill with squares of 8 texels instead of 16 to keep the pattern
const texture = new DataTexture(data, SIZE, SIZE);
texture.wrapS = Wrapping.Repeat;
texture.wrapT = Wrapping.Repeat;
texture.needsUpdate = true;
```

Runnable: `assets/examples/texture-limits/`.

**Cost removed.** `TS2345` for `Uint8Array`, and silent cropping: the
naive 256 x 256 checkerboard keeps 8 of 16 squares per row.

**Verify.**

1. The verifier prints `PASS texture-limits: naive 256 input is cropped,
   not scaled (width 128, squares 8)`.

## CanvasTexture update

**Definition.** EASEL samples a cached copy of a texture's image, capped
at 128 x 128 (`Texture.data`). The renderer never fills or refreshes that
cache; only `texture.update()` does, and only while `needsUpdate` is
true (`src/textures/Texture.ts`). A new `CanvasTexture` sets
`needsUpdate` but leaves the cache empty, so it renders untextured until
the first `update()`. three.js re-uploads on the next frame after
`needsUpdate = true`. `TextureLoader` calls `update()` itself.

**Use when.**

- Porting a `CanvasTexture` (labels, HUDs, minimaps, procedural art), or
  any texture whose image you redraw.

**Do not use when.**

- The texture is a `DataTexture` built with its data: its constructor
  fills the cache. Writes to its array later still need `needsUpdate`
  plus `update()`.

**Example.**

```ts
import { BasicMaterial, CanvasTexture } from "@xsyetopz/easel";

export function hud(canvas: HTMLCanvasElement) {
  const texture = new CanvasTexture(canvas);
  const material = new BasicMaterial({ map: texture });
  function redraw(draw: (canvas: HTMLCanvasElement) => void): void {
    draw(canvas);
    texture.needsUpdate = true;
    texture.update(); // rebuild the sampled copy now
  }
  return { material, texture, redraw };
}
```

`update()` discards any brightness levels built with
`buildBrightnessLevels()`; skip that call unless you measured a need, since
it also quantizes lit texels (local run: a blue texel under a 0.5
directional light rendered 153 without levels and 191 with them).

Runnable: `assets/examples/canvas-texture/`. Tier: executed with a
`{ data, width, height }` stand-in, because bun has no canvas; a real
canvas takes the `drawImage` cache path, which only a browser runs.

**Cost removed.** Blank or frozen canvas textures with no error. Local
run: before `update()` the plane renders the untextured `255,255,255`;
after it, the canvas colour; the naive `needsUpdate` alone keeps the
stale `0,0,255` after a redraw to magenta.

**Verify.**

1. The verifier prints four `PASS canvas-texture:` lines, including
   `naive needsUpdate alone keeps the stale frame`.
1. In a browser, the texture changes on the frame after each redraw.
