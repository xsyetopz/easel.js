# Easel.js - Design Reference & API Guide

> **Easel.js** is a Canvas2D software renderer with a scene graph API modeled after THREE.js, rebuilt for a painter's-algorithm scanline rasterizer. This document covers the rendering model, full public API, and every divergence from THREE.js.

---

## Table of Contents

1. [Philosophy](#philosophy)
2. [Rendering Model](#rendering-model)
3. [File Structure](#file-structure)
4. [Public API](#public-api)
5. [THREE.js Divergence](#threejs-divergence)
6. [Intentional Artifacts](#intentional-artifacts)
7. [Inspiration](#inspiration)

---

## Philosophy

**Constraints are architectural, not limitations.** Easel.js is not a degraded THREE.js. Its rendering model defines what exists in the API - features outside that model are absent, not stubbed.

**Names describe what they do.** Where THREE.js names things after GPU abstractions, Easel.js names things after what a CPU scanline rasterizer actually does. `Geometry` not `BufferGeometry`. `Node` not `Object3D`.

**Absence is documentation.** A property that does nothing is worse than no property. If the rendering model cannot evaluate it, the API does not expose it.

---

## Rendering Model

### Depth Model: Painter's Algorithm + Uint16 Depth Buffer

**Primary depth resolution is sort order. A Uint16 depth buffer handles residual overlap within sorted draw calls.**

The renderer draws all geometry back-to-front using the painter's algorithm. Distant objects are drawn first; closer objects overwrite them in the framebuffer. A `DepthBuffer` (`Uint16Array`, one value per pixel, initialized to `0xFFFF`) is cleared each frame and consulted during rasterization to reject fragments that are farther than what is already drawn.

- Draw order is determined by tile distance and explicit `layer` integers
- The depth buffer handles sub-pixel overlap errors that the sort cannot resolve
- Two meshes at the same layer may still flicker (centroid sort is coarse)
- Content authors must tune geometry or `layer` values to minimize persistent conflicts

### Orthographic Projection, Integer Coordinates

**All screen-space vertex positions are integers.**

The projection pipeline converts 3D coordinates to 2D floats, then truncates via `Math.trunc()`. This is vertex snapping.

- Vertices hold still for several frames as movement accumulates below the truncation threshold, then jump
- Different vertices on the same model cross integer boundaries at different frames, briefly distorting shape
- Animations compound this - keyframe interpolation produces large per-frame deltas

**No perspective projection.** Perspective requires dividing UV coordinates by W per-pixel. That division never occurs - UVs are interpolated linearly across the scanline (affine texture mapping). Affine interpolation is only geometrically coherent under orthographic projection.

### Flat and Gouraud Shading

**No per-pixel lighting exists in the pipeline.**

Lighting is baked into vertex or face colors before rasterization.

- **Flat shading** - one color per face (face normal · light direction + ambient)
- **Gouraud shading** - one color per vertex, linearly interpolated across the scanline
- No specular highlights, normal maps, shadow maps, or post-processing

### HSL16 Color

**All colors are stored as 16-bit packed HSL integers.**

The bit layout: hue (6 bits), lightness (7 bits), saturation (3 bits). All face and vertex colors are manipulated in this space.

- Gradients snap to the nearest HSL16 step, producing visible banding
- A precomputed LUT converts all 65,536 HSL16 values to RGB at initialization
- Per-pixel color conversion during rasterization is a table lookup, not math

### 9-Step Translucency

**Nine discrete opacity levels, not continuous alpha.**

Translucency is precomputed as a blend lookup table - given a source and destination HSL16 color, each of the nine steps produces a fixed result. No per-pixel alpha compositing.

### 128×128 Texture Cap

**Textures are clamped to 128×128 pixels.**

Higher-resolution source textures are downsampled automatically. Nearest-neighbor only - no bilinear filtering, no mipmapping.

### Tile-Radius Fog

**The scene ends at a hard tile-count cutoff.**

Beyond the fog radius, the framebuffer is black. No color, no gradient, no skybox. The visible scene simply ends.

---

## File Structure

```text
src/
├── core/           Scene, Node, Renderer, EventDispatcher
├── cameras/        OrthographicCamera, PerspectiveCamera
├── geometries/     Geometry, Attribute, InterleavedAttribute
├── materials/      BasicMaterial, LambertMaterial, ToonMaterial, LineMaterial, etc.
├── lights/         AmbientLight, DirectionalLight, PointLight, SpotLight, HemisphereLight
├── animation/      Animator, Track, Binding, Clip
├── math/           Vector2, Vector3, Matrix4, Quaternion, Color, MathUtils
├── textures/       Texture, FramebufferTexture
├── objects/        Mesh, Line, LineSegments, LineLoop, Points
├── pipeline/       SceneTraversal, FogCuller, PainterSort, LightBaker, Rasterizer, Framebuffer (+ DepthBuffer)
└── fog/            Fog
```

---

## Public API

### `new Scene()`

Root of the scene graph. `add()`, `remove()`, `traverse()`. Holds `fog` reference.

`background` does not exist - the void is black and that is not configurable.

---

### `new OrthographicCamera({ left, right, top, bottom, near, far, tileSize })`

Orthographic camera. The rasterizer performs affine UV interpolation with no W divide - perspective-correct texturing is not available.

`tileSize: number` - world units per tile. Used internally for sort distance and fog culling. Default `1`.

`updateProjectionMatrix()`, `matrixWorldInverse`, `projectionMatrix`.

---

### `new PerspectiveCamera({ fov, aspect, near, far })`

Perspective camera. Available but affine UV interpolation produces visible warping on oblique faces - perspective-correct UV mapping does not exist in the pipeline.

---

### `new Renderer({ canvas, width, height, pixelRatio })`

The only renderer. `render(scene, camera)`, `setSize(w, h)`, `setPixelRatio(r)`, `dispose()`.

Does not have: `shadowMap`, `toneMapping`, `outputColorSpace`, `xr`, `capabilities`, `extensions`, `info.render`.

---

### `new Node()`

Base scene graph node. `position`, `rotation`, `scale`, `matrix`, `matrixWorld`, `parent`, `children`, `visible`, `layers`.

`add()`, `remove()`, `traverse()`, `updateMatrix()`, `updateMatrixWorld()`, `clone()`, `copy()`.

Does not have: `castShadow`, `receiveShadow`.

---

### `new Geometry()`

Vertex data store.

`setPositions(array)`, `setUVs(array)`, `setColors(array)`, `setNormals(array)`, `setIndex(array)`.

`setColors()` is first-class alongside positions and UVs - per-vertex color is a primary shading path, not an afterthought achieved via a named attribute.

`getAttribute(name)`, `setAttribute(name, attribute)`, `computeVertexNormals()` (flat, cross-product per face).

---

### `new Attribute(array, itemSize)`

Typed array wrapper for a single vertex data channel.

---

### `Material` base

All materials share:

**`layer: int` (default `0`)**
Explicit draw order within a tile. Replaces z-buffer depth resolution. Use `Layer` constants or any integer:

```js
Layer.GROUND   = 0
Layer.SCENERY  = 1
Layer.ENTITY   = 2
Layer.OVERLAY  = 3
```

**`opacity: int (0–8)` (default `0`)**
Discrete translucency. `0` is fully opaque, `8` is nearly transparent. Nine steps, precomputed. Replaces both THREE's float `opacity` and its redundant `transparent` boolean.

**`shading: Shading.Flat | Shading.Gouraud`**
Selects flat per-face or Gouraud per-vertex shading. Default varies by subclass.

**`side: Side.Front | Side.Back | Side.Double`**

Does not have: `castShadow`, `receiveShadow`, `shadowSide`, `fog` toggle, `toneMapped`, `transparent`, `precision`.

---

### `new BasicMaterial({ color, map, layer, opacity, shading, side })`

Solid color or textured, no lighting. Defaults to `Shading.Flat`.

---

### `new LambertMaterial({ color, map, layer, opacity, shading, side })`

Diffuse lighting from all lights in scene. Defaults to `Shading.Gouraud` - per-vertex lighting interpolated across faces.

---

### `new ToonMaterial({ color, gradientMap, layer, opacity, side })`

Stepped shading via `gradientMap`. Each lighting level snaps to the nearest HSL16 step.

---

### `new LineMaterial({ color, linewidth, layer, opacity })`

For `Line`, `LineSegments`, `LineLoop`. Rendered via Bresenham integer line.

---

### `new DashedLineMaterial({ color, linewidth, dashSize, gapSize, layer, opacity })`

---

### `new PointsMaterial({ color, size, map, layer, opacity })`

`size` is an integer pixel radius.

---

### `new Color(r, g, b)`

Standard RGB float construction. Also: `Color.fromHsl16(value)` - construct directly from a packed HSL16 integer.

**`.hsl16`** - readable property. Returns the nearest packed HSL16 representation of the current color, updated on every mutation. The quantization is visible and intentional.

`set()`, `setHSL()`, `getHSL()`, `lerpColors()`, `clone()`.

---

### `new Texture(image)`

Clamps to 128×128 on `needsUpdate = true` or first render via nearest-neighbor resampling. Silent and automatic.

Present but ignored: `magFilter`, `minFilter` (always nearest), `generateMipmaps` (always false), `anisotropy`, `encoding`, `colorSpace`.

---

### `new FramebufferTexture(width, height)`

Reads a region of the current framebuffer into a texture for a subsequent draw pass. CPU render-to-texture. Useful for minimaps, portal effects, offscreen compositing.

---

### `new Fog({ tiles })`

`tiles: number` - hard tile-count cutoff. Beyond this radius the framebuffer is black. No color, no gradient.

---

### `new AmbientLight(color, intensity)`

Flat scene-wide brightness added uniformly to all vertices.

---

### `new DirectionalLight(color, intensity)`

Per-face or per-vertex depending on material shading mode. `position` determines direction. Does not have: `castShadow`.

---

### `new PointLight(color, intensity, distance, decay)`

Per-vertex distance attenuation, CPU-computed. The result is coarser than per-pixel falloff at low polygon density. Does not have: `castShadow`.

---

### `new SpotLight(color, intensity, distance, angle, penumbra, decay)`

Per-vertex cone attenuation, CPU-computed. Does not have: `castShadow`.

---

### `new HemisphereLight(skyColor, groundColor, intensity)`

Per-vertex sky/ground blend evaluated against world Y axis normal.

---

### `new Animator(root)`

Plays animation clips on a scene graph node. `clipAction(clip)`, `update(delta)`, `stopAllAction()`.

---

### `new Track(name, times, values)`

Single-property keyframe sequence. Subtypes: `BooleanTrack`, `ColorTrack`, `NumberTrack`, `QuaternionTrack`, `VectorTrack`.

---

### `new Binding(root, path)`

Resolves a dotted path string (e.g. `"mesh.position.x"`) to a live reference on the scene graph.

---

### `Vector2`

All standard methods. Adds:

**`.trunc() → this`**
Truncates `x` and `y` to integers via `Math.trunc()`. Named after what it does.

---

### `MathUtils`

All standard utilities. Adds:

**`tileDistance(a: Vector2, b: Vector2) → number`** - Manhattan distance between two tile coordinates.

**`packHsl16(h, s, l) → number`** - packs normalized HSL (0–1 each) into a 16-bit integer.

**`unpackHsl16(value) → { h, s, l }`** - inverse of `packHsl16`.

---

## THREE.js Divergence

### Renamed

| THREE.js                     | Easel.js               | Reason                                                                                                       |
| ---------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| `WebGLRenderer`              | `Renderer`             | One renderer exists. The qualifier described a now-absent implementation detail.                             |
| `Object3D`                   | `Node`                 | It is a scene graph node. Every engine outside THREE.js calls it that.                                       |
| `BufferGeometry`             | `Geometry`             | "Buffer" refers to WebGL vertex buffer objects - no such concept exists here.                                |
| `BufferAttribute`            | `Attribute`            | Same reason.                                                                                                 |
| `InterleavedBufferAttribute` | `InterleavedAttribute` | Same.                                                                                                        |
| `MeshBasicMaterial`          | `BasicMaterial`        | "Mesh" prefix is redundant - every material is used on meshes.                                               |
| `MeshLambertMaterial`        | `LambertMaterial`      | Same.                                                                                                        |
| `MeshToonMaterial`           | `ToonMaterial`         | Same.                                                                                                        |
| `LineBasicMaterial`          | `LineMaterial`         | "Basic" is redundant - there is only one line material.                                                      |
| `LineDashedMaterial`         | `DashedLineMaterial`   | Adjective before noun.                                                                                       |
| `OrthographicCamera`         | `OrthographicCamera`   | Name retained - `PerspectiveCamera` also exists (affine-only).                                               |
| `AnimationMixer`             | `Animator`             | It plays clips on an object. "Mixer" implies a metaphor the user never observes.                             |
| `KeyframeTrack`              | `Track`                | All tracks are keyframe-based. The prefix is redundant.                                                      |
| `PropertyBinding`            | `Binding`              | "Property" is redundant - bindings bind properties by definition.                                            |
| `BooleanKeyframeTrack`       | `BooleanTrack`         | Follows from Track rename.                                                                                   |
| `ColorKeyframeTrack`         | `ColorTrack`           | Same.                                                                                                        |
| `NumberKeyframeTrack`        | `NumberTrack`          | Same.                                                                                                        |
| `QuaternionKeyframeTrack`    | `QuaternionTrack`      | Same.                                                                                                        |
| `VectorKeyframeTrack`        | `VectorTrack`          | Same.                                                                                                        |
| `BufferGeometryLoader`       | `GeometryLoader`       | Follows from Geometry rename.                                                                                |
| `material.drawPriority`      | `material.layer`       | It is a layer integer. Every 2D and 2.5D engine calls it that.                                               |
| `material.translucency`      | `material.opacity`     | The concept is opacity. The discrete 0–8 range replaces both THREE's float `opacity` and `transparent` bool. |
| `Vector2.snap()`             | `Vector2.trunc()`      | Snapping implies grid alignment. This truncates to integer. Name it what it does.                            |

---

### Removed

| Removed                                                        | Reason                                                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `PerspectiveCamera`                                            | Exported but affine-only. UV warping is visible on oblique faces - no perspective-correct path.   |
| `MeshStandardMaterial`                                         | PBR requires per-pixel roughness/metalness evaluation. No per-pixel lighting pass exists.         |
| `MeshPhongMaterial`                                            | Requires per-pixel specular. Lighting is baked before rasterization.                              |
| `MeshPhysicalMaterial`                                         | Superset of Standard. All PBR properties have no pipeline to evaluate them.                       |
| `MeshDepthMaterial`                                            | Encodes z-buffer depth as per-pixel grayscale. No z-buffer exists.                                |
| `MeshNormalMaterial`                                           | Renders normals as per-pixel RGB. The rasterizer writes only final shaded color.                  |
| `MeshMatcapMaterial`                                           | Requires per-pixel normal data and spherical UV projection. Neither exists.                       |
| `ShaderMaterial`                                               | Requires a GLSL shader pipeline. The rasterizer is JavaScript - not programmable via shader code. |
| `RawShaderMaterial`                                            | Same.                                                                                             |
| `ShadowMaterial`                                               | Displays shadow map data. No shadow maps, no z-buffer.                                            |
| `CubeTexture`                                                  | Environment map. No skybox, no environment reflections - the void is black.                       |
| `CompressedTexture`                                            | GPU compression formats require GPU-side decoding.                                                |
| `CompressedTextureLoader`                                      | Same.                                                                                             |
| `CubeTextureLoader`                                            | Loads into `CubeTexture`. `CubeTexture` is removed.                                               |
| `RectAreaLight`                                                | Area lighting requires integration over the light surface without a per-pixel pass.               |
| `LightProbe`                                                   | Environment lighting via spherical harmonics. The void is black.                                  |
| `SphericalHarmonics3`                                          | Used by `LightProbe`. Same reason.                                                                |
| `DirectionalLightShadow`                                       | No z-buffer, no shadow maps.                                                                      |
| `SpotLightShadow`                                              | Same.                                                                                             |
| `PointLightShadow`                                             | Same.                                                                                             |
| `BatchedMesh`                                                  | Designed around GPU interleaved buffers. The CPU equivalent is iterating meshes in a draw list.   |
| `FogExp2`                                                      | Exponential distance fog. The fog model is a hard tile-count cutoff.                              |
| `Audio` / `PositionalAudio` / `AudioContext` / `AudioAnalyser` | Web Audio API wrappers. Easel.js is a renderer - audio is out of scope.                           |
| `renderer.shadowMap`                                           | No shadow system.                                                                                 |
| `renderer.toneMapping`                                         | The framebuffer is 8-bit RGBA - no HDR range to tone map.                                         |
| `renderer.outputColorSpace`                                    | `putImageData` writes raw bytes - no color space transform.                                       |
| `renderer.xr`                                                  | No VR/AR support.                                                                                 |
| `renderer.capabilities`                                        | GPU feature queries. Not applicable.                                                              |
| `renderer.extensions`                                          | WebGL extension queries. Not applicable.                                                          |
| `Node.castShadow` / `.receiveShadow`                           | No shadow system.                                                                                 |
| `Scene.background`                                             | The void is black. Not configurable.                                                              |
| `Material.transparent`                                         | Merged into `opacity`. Two properties encoding one concept, collapsed to one.                     |
| `Material.fog` toggle                                          | Fog is scene-level and architectural. Per-material opt-out does not exist.                        |
| `Material.castShadow` / `.receiveShadow`                       | No shadow system.                                                                                 |
| `Material.toneMapped`                                          | No tone mapping.                                                                                  |

---

### Restructured

**`Geometry.setColors()` is first-class.**
THREE.js treats per-vertex color as `geometry.setAttribute('color', attribute)`. In Easel.js, `setColors()` sits alongside `setPositions()` and `setUVs()` - per-vertex color is a primary shading path.

**`Color.hsl16` is a readable property.**
The HSL16 quantization is a visible feature, not an implementation detail. `.hsl16` returns the packed integer representation. `Color.fromHsl16(value)` constructs from a packed integer. Users working with palette data or data textures have first-class access to the native color format.

**`Fog` takes `{ tiles }`, not `(color, near, far)`.**
The THREE.js signature comes from OpenGL distance fog - a colored gradient fading to sky. Neither the gradient nor the sky exists here. The parameter is a tile-count cutoff named `tiles`. There is no fog color because the void is always black.

**`opacity: 0–8` replaces `opacity: float` + `transparent: bool`.**
THREE.js requires both a float `opacity` and `transparent: true` for translucency. One concept, two properties, easy to misconfigure. Easel.js uses a single integer with a discrete 0–8 range. Setting it above zero enables translucency. No flag.

---

## Intentional Artifacts

The following visual behaviors are correct outputs of this renderer. They are not bugs.

**Vertex wobble.** Models shimmer and edges stutter during movement. Floating-point screen coordinates are truncated to integers - different vertices cross integer boundaries at different frames, briefly distorting shape. Animations amplify this.

**Polygon sort flicker.** Two faces at the same tile and `layer` may flicker as the camera rotates. Primary sort uses triangle centroid Z; the `DepthBuffer` rejects fragments that are farther than what has already been drawn within the sorted sequence. Persistent flickering on coplanar geometry at the same layer is resolved by adjusting `layer` values or geometry, not code.

**Affine texture warping.** Textured polygons warp at oblique angles, particularly on large faces. UV coordinates are interpolated linearly without W division. Perspective-correct mapping is not available.

**HSL16 color banding.** Gouraud gradients are quantized to the nearest HSL16 value per pixel. Fine gradients appear stepped, especially in low-saturation regions where the 3-bit saturation channel is coarse.

**Hard fog boundary.** The scene ends at `fog.tiles` with an immediate cut to black. No transition, no blend.

**Opacity stepping.** Semi-transparent surfaces have nine visible levels. Fade animations will be visibly stepped.

---

## Inspiration

Easel.js is inspired by the RuneTek 3 engine as observed in Old School RuneScape, developed by Jagex. The rendering constraints - painter's algorithm sorting, integer projection, HSL16 color, affine texture mapping, and discrete translucency - are modeled after behaviors documented through developer commentary and community technical analysis of that engine. Easel.js is an independent implementation; it shares no code with the original.
