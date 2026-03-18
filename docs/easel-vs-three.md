# Easel.js — Design Reference & API Guide

> **Easel.js** is a Canvas2D software renderer with a scene graph API informed by THREE.js, but redesigned from the ground up for a painter's-algorithm scanline rasterizer. It is constrained by the graphical limits of the RuneTek 3 engine as observed in Old School RuneScape. This document covers the API design philosophy, the full public surface, what differs from THREE.js and why, and the original engine research that informed every constraint.

---

## Table of Contents

1. [Philosophy](#philosophy)
2. [RuneTek 3 Engine Reference Study](#runetek-3-engine-reference-study)
3. [Public API](#public-api)
4. [THREE.js Divergence](#threejs-divergence)
   - [Renamed](#renamed)
   - [Removed](#removed)
   - [Restructured](#restructured)
5. [Intentional Artifacts](#intentional-artifacts)

---

## Philosophy

Easel.js is not a degraded version of THREE.js. It is a renderer whose constraints are architectural — they emerge from a deliberate commitment to the RuneTek 3 rendering model. Where THREE.js names and structures its API around WebGL and GPU abstractions, Easel.js names things after what they actually do in a CPU scanline rasterizer.

The guiding question for every API decision: *if you knew from day one that the renderer was a painter's-algorithm scanline rasterizer running entirely on the CPU, with integer screen coordinates and a 16-bit HSL color space, what would you call this?*

Absence is documentation. Features that do not exist in this rendering model do not exist in this API — they are not stubbed, aliased, or silently ignored. A property that does nothing is worse than no property.

---

## RuneTek 3 Engine Reference Study

The following is a condensed account of the RuneTek 3 rendering system as observed in Old School RuneScape, compiled from developer commentary and technical analysis. Every constraint in Easel.js maps to a specific behavior documented here.

### Rendering Model: Painter's Algorithm, No Z-Buffer

RuneTek 3 has no depth buffer. The engine draws all scene elements back-to-front — distant objects are drawn first, closer objects overwrite them in the framebuffer. Depth is never tested per-pixel; it is resolved by sort order before any pixels are written.

Two models occupying the same 3D space have no automatic resolution. One draws on top of the other based solely on tile distance and explicit layer integers. Artists working on the game were required to manually tune model geometry to minimize conflicts, because no algorithmic solution exists at the polygon level without a z-buffer.

The "3D space violations" observed in OSRS — a sword extending past a wall tile without clipping through it, a cape intersecting a character's legs — are direct consequences of this system. These are not bugs. They are the expected behavior of a painter's sort that doesn't know geometry occupies shared space.

### Scene Graph: Tile-Based World Structure

The world is divided into a hierarchy of spatial units:

- **Region**: 64×64 tiles. Stores map data, object spawns, terrain style.
- **Chunk**: 8×8 tiles. The unit of dynamic loading and unloading.
- **Scene area**: 104×104 tiles (13×13 chunks), always centered on the player.
- **Player position**: Always between tiles (48, 48) and (56, 56) within the local area.

The world does not scroll past the player. When the player crosses a chunk boundary, the scene area shifts and the player remains near center. The black fog at draw distance is not the boundary of loaded data — it is the render cutoff within a larger loaded region.

Draw order is resolved at the tile level first. Within a tile, explicit layer integers determine ordering: ground plane draws before ground decoration, ground decoration before entity models. Conflicts cause incorrect overdraw with no automatic correction.

### Projection: Orthographic, Integer Screen Coordinates

All vertex positions in screen space are integers. The projection pipeline converts 3D world coordinates to 2D screen floats, then truncates via `Math.trunc()`. This is vertex snapping.

The observable effect: vertices appear stationary for several frames as underlying movement accumulates below the truncation threshold, then jump when the threshold is crossed. Different vertices on the same model cross integer boundaries at different frames, briefly distorting the model's shape. Animations compound this because keyframe interpolation produces large per-frame deltas. The characteristic wobble of OSRS models is entirely a consequence of this integer truncation.

Perspective-correct projection is incompatible with this system. Perspective projection requires dividing UV coordinates by the W component per-pixel to produce correct texture mapping. That division never occurs in RuneTek 3 — UVs are interpolated linearly across the scanline in screen space. This is affine texture mapping, and it produces visible warping on large polygons viewed at angle.

### Shading: Flat and Gouraud, No Per-Pixel Lighting

RuneTek 3 has no per-pixel lighting pass. Lighting is baked into vertex or face colors before rasterization.

**Flat shading** computes one color per triangle face using the face normal dotted against a directional light, plus ambient. Every pixel in the triangle is filled with this single color.

**Gouraud shading** computes one color per vertex. The three vertex colors are then linearly interpolated across the scanline during rasterization. This produces a smooth gradient across the face without any per-pixel lighting math.

No specular highlights, no normal maps, no shadow maps, no post-processing of any kind exists in the pipeline.

### Color: HSL16

RuneTek 3 uses a 16-bit HSL color scheme. The bit layout packs hue (6 bits), lightness (7 bits), and saturation (3 bits) into a 16-bit integer. All face and vertex colors are stored and manipulated in this space.

Gradients and blended lighting values snap to the nearest available HSL16 step, producing the characteristic banded look of OSRS shading — visible especially on curved surfaces and in shadows.

A precomputed lookup table converts all 65,536 possible HSL16 values to RGB at initialization. Per-pixel color conversion during rasterization is a table lookup, not a math operation.

### Translucency: 9 Fixed Steps

The engine supports nine discrete levels of translucency, not continuous alpha. These are precomputed as a blend lookup table — given a source HSL16 color and a destination HSL16 color, each of the nine steps produces a fixed precomputed result. There is no per-pixel alpha compositing.

### Texture Resolution: 128×128 Maximum

The Java client imposes a hard maximum texture size of 128×128 pixels, set for bandwidth conservation and software renderer compatibility. Higher-resolution source textures must be downsampled to 128×128, producing visible blurring. Nearest-neighbor downsampling only — no bilinear filtering, no mipmapping.

### Frame Timing: Tick System

- **Server tick**: 600ms. All game logic resolves on this boundary.
- **Client tick**: 20ms, 50 FPS cap (30 client ticks per server tick).
- **Subtick**: 50ms intervals for specific mechanics.

Player inputs are queued and processed at the next server tick — up to 600ms of latency even with zero network lag. This is the source of RuneScape's characteristic input delay.

### Draw Distance: Tile-Radius Fog Cutoff

The renderer culls all geometry beyond approximately 15–25 tiles. Beyond this radius, the framebuffer is black — no color, no gradient, no skybox. The visible scene simply ends.

---

## Public API

### `new Scene()`

Root of the scene graph. `add()`, `remove()`, `traverse()`. Holds `fog` reference.

`background` does not exist — the void is black and that is not configurable.

---

### `new Camera({ left, right, top, bottom, near, far, tileSize })`

Orthographic camera. The only valid camera type — no `PerspectiveCamera` exists because the rasterizer performs affine UV interpolation with no W divide, which is only geometrically coherent under orthographic projection.

`tileSize: number` — world units per tile. Used internally for sort distance and fog culling. Default `1`.

`updateProjectionMatrix()`, `matrixWorldInverse`, `projectionMatrix`.

---

### `new Renderer({ canvas, width, height, pixelRatio })`

The only renderer. `render(scene, camera)`, `setSize(w, h)`, `setPixelRatio(r)`, `dispose()`.

Does not have: `shadowMap`, `toneMapping`, `outputColorSpace`, `xr`, `setClearColor`, `capabilities`, `extensions`, `info.render`.

---

### `new Node()`

Base scene graph node. `position`, `rotation`, `scale`, `matrix`, `matrixWorld`, `parent`, `children`, `visible`, `layers`.

`add()`, `remove()`, `traverse()`, `updateMatrix()`, `updateMatrixWorld()`, `clone()`, `copy()`.

Does not have: `castShadow`, `receiveShadow`.

---

### `new Geometry()`

Vertex data store.

`setPositions(array)`, `setUVs(array)`, `setColors(array)`, `setNormals(array)`, `setIndex(array)`.

`setColors()` is first-class alongside positions and UVs — per-vertex color is a primary shading path in this engine, not an afterthought achieved via a named attribute.

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
Discrete translucency. `0` is fully opaque, `8` is nearly transparent. Nine steps, precomputed. Replaces both THREE's float `opacity` and its redundant `transparent` boolean — two properties encoding one concept, collapsed to one.

**`shading: Shading.Flat | Shading.Gouraud`**
Selects flat per-face or Gouraud per-vertex shading. Default varies by subclass.

**`side: Side.Front | Side.Back | Side.Double`**

Does not have: `castShadow`, `receiveShadow`, `shadowSide`, `fog` toggle, `toneMapped`, `transparent`, `precision`.

---

### `new BasicMaterial({ color, map, layer, opacity, shading, side })`

Solid color or textured, no lighting. Defaults to `Shading.Flat`.

---

### `new LambertMaterial({ color, map, layer, opacity, shading, side })`

Diffuse lighting from all lights in scene. Defaults to `Shading.Gouraud` — per-vertex lighting interpolated across faces.

---

### `new ToonMaterial({ color, gradientMap, layer, opacity, side })`

Stepped shading via `gradientMap`. Each lighting level snaps to the nearest HSL16 step. Natural fit for this color space.

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

Standard RGB float construction. Also: `Color.fromHsl16(value)` — construct directly from a packed HSL16 integer.

**`.hsl16`** — readable property. Returns the nearest packed HSL16 representation of the current color, updated on every mutation. The quantization is visible and intentional, not hidden.

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

`tiles: number` — hard tile-count cutoff. Beyond this radius the framebuffer is black. No color, no gradient.

---

### `new AmbientLight(color, intensity)`

Flat scene-wide brightness added uniformly to all vertices.

---

### `new DirectionalLight(color, intensity)`

Per-face or per-vertex depending on material shading mode. `position` determines direction. Does not have: `castShadow`.

---

### `new PointLight(color, intensity, distance, decay)`

Per-vertex distance attenuation, CPU-computed. The result is coarser than per-pixel falloff at low polygon density — accurate to the shading model. Does not have: `castShadow`.

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

**`tileDistance(a: Vector2, b: Vector2) → number`** — Manhattan distance between two tile coordinates.

**`packHsl16(h, s, l) → number`** — packs normalized HSL (0–1 each) into a 16-bit integer.

**`unpackHsl16(value) → { h, s, l }`** — inverse of `packHsl16`.

---

## THREE.js Divergence

### Renamed

| THREE.js                     | Easel.js               | Reason                                                                                                                                                                |
| ---------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WebGLRenderer`              | `Renderer`             | One renderer exists. The qualifier described a now-absent implementation detail.                                                                                      |
| `Object3D`                   | `Node`                 | It is a scene graph node. Every engine outside THREE.js calls it that.                                                                                                |
| `BufferGeometry`             | `Geometry`             | "Buffer" refers to WebGL vertex buffer objects — no such concept exists here.                                                                                         |
| `BufferAttribute`            | `Attribute`            | Same reason.                                                                                                                                                          |
| `InterleavedBufferAttribute` | `InterleavedAttribute` | Same.                                                                                                                                                                 |
| `MeshBasicMaterial`          | `BasicMaterial`        | "Mesh" prefix is redundant — every material is used on meshes.                                                                                                        |
| `MeshLambertMaterial`        | `LambertMaterial`      | Same.                                                                                                                                                                 |
| `MeshToonMaterial`           | `ToonMaterial`         | Same.                                                                                                                                                                 |
| `LineBasicMaterial`          | `LineMaterial`         | "Basic" is redundant — there is only one line material.                                                                                                               |
| `LineDashedMaterial`         | `DashedLineMaterial`   | Adjective before noun.                                                                                                                                                |
| `OrthographicCamera`         | `Camera`               | One camera type exists. The qualifier is noise.                                                                                                                       |
| `AnimationMixer`             | `Animator`             | It plays clips on an object. "Mixer" implies a mixing console metaphor the user never observes.                                                                       |
| `KeyframeTrack`              | `Track`                | All tracks are keyframe-based. The prefix is redundant.                                                                                                               |
| `PropertyBinding`            | `Binding`              | "Property" is redundant — bindings bind properties by definition.                                                                                                     |
| `BooleanKeyframeTrack`       | `BooleanTrack`         | Follows from Track rename.                                                                                                                                            |
| `ColorKeyframeTrack`         | `ColorTrack`           | Same.                                                                                                                                                                 |
| `NumberKeyframeTrack`        | `NumberTrack`          | Same.                                                                                                                                                                 |
| `QuaternionKeyframeTrack`    | `QuaternionTrack`      | Same.                                                                                                                                                                 |
| `VectorKeyframeTrack`        | `VectorTrack`          | Same.                                                                                                                                                                 |
| `BufferGeometryLoader`       | `GeometryLoader`       | Follows from Geometry rename.                                                                                                                                         |
| `material.drawPriority`      | `material.layer`       | It is a layer integer. Every 2D and 2.5D engine calls it that.                                                                                                        |
| `material.translucency`      | `material.opacity`     | The concept is opacity. "Translucency" is a material science term. The discrete 0–8 range replaces both THREE's float `opacity` and its redundant `transparent` bool. |
| `Vector2.snap()`             | `Vector2.trunc()`      | Snapping implies grid alignment. This truncates to integer. Name it what it does.                                                                                     |

---

### Removed

| Removed                                                        | Reason                                                                                                                                                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PerspectiveCamera`                                            | Affine UV interpolation is only geometrically coherent under orthographic projection. Perspective output fed into an affine rasterizer produces severe distortion with no correction path. |
| `MeshStandardMaterial`                                         | PBR requires per-pixel roughness/metalness evaluation. No per-pixel lighting pass exists.                                                                                                  |
| `MeshPhongMaterial`                                            | Requires per-pixel specular. Lighting is baked before rasterization.                                                                                                                       |
| `MeshPhysicalMaterial`                                         | Superset of Standard. All PBR properties have no pipeline to evaluate them.                                                                                                                |
| `MeshDepthMaterial`                                            | Encodes z-buffer depth as per-pixel grayscale. No z-buffer exists.                                                                                                                         |
| `MeshNormalMaterial`                                           | Renders normals as per-pixel RGB. The rasterizer writes only final shaded color.                                                                                                           |
| `MeshMatcapMaterial`                                           | Requires per-pixel normal data and spherical UV projection. Neither exists.                                                                                                                |
| `ShaderMaterial`                                               | Requires a GLSL shader pipeline. The rasterizer is JavaScript — not programmable via shader code.                                                                                          |
| `RawShaderMaterial`                                            | Same.                                                                                                                                                                                      |
| `ShadowMaterial`                                               | Displays shadow map data. No shadow maps, no z-buffer.                                                                                                                                     |
| `CubeTexture`                                                  | Environment map. No skybox, no environment reflections — the void is black.                                                                                                                |
| `CompressedTexture`                                            | GPU compression formats require GPU-side decoding.                                                                                                                                         |
| `CompressedTextureLoader`                                      | Same.                                                                                                                                                                                      |
| `CubeTextureLoader`                                            | Loads into `CubeTexture`. `CubeTexture` is removed.                                                                                                                                        |
| `RectAreaLight`                                                | Area lighting requires integration over the light surface without a per-pixel pass.                                                                                                        |
| `LightProbe`                                                   | Environment lighting via spherical harmonics. The void is black.                                                                                                                           |
| `SphericalHarmonics3`                                          | Used by `LightProbe`. Same reason.                                                                                                                                                         |
| `DirectionalLightShadow`                                       | No z-buffer, no shadow maps.                                                                                                                                                               |
| `SpotLightShadow`                                              | Same.                                                                                                                                                                                      |
| `PointLightShadow`                                             | Same.                                                                                                                                                                                      |
| `BatchedMesh`                                                  | Designed around a GPU interleaved buffer layout. The CPU equivalent is iterating meshes in a draw list — no distinct class earns its place.                                                |
| `FogExp2`                                                      | Exponential distance fog. The fog model is a hard tile-count cutoff — no exponential variant.                                                                                              |
| `Audio` / `PositionalAudio` / `AudioContext` / `AudioAnalyser` | Web Audio API wrappers. Easel.js is a renderer — audio is out of scope.                                                                                                                    |
| `renderer.shadowMap`                                           | No shadow system.                                                                                                                                                                          |
| `renderer.toneMapping`                                         | The framebuffer is 8-bit RGBA — no HDR range to tone map.                                                                                                                                  |
| `renderer.outputColorSpace`                                    | `putImageData` writes raw bytes — no color space transform.                                                                                                                                |
| `renderer.xr`                                                  | No VR/AR support.                                                                                                                                                                          |
| `renderer.setClearColor()`                                     | Clear is always void black. A property that does nothing is worse than no property.                                                                                                        |
| `renderer.capabilities`                                        | GPU feature queries. Not applicable.                                                                                                                                                       |
| `renderer.extensions`                                          | WebGL extension queries. Not applicable.                                                                                                                                                   |
| `Node.castShadow` / `.receiveShadow`                           | No shadow system.                                                                                                                                                                          |
| `Scene.background`                                             | The void is black. That is not configurable — it is a fact of the renderer.                                                                                                                |
| `Material.transparent`                                         | Merged into `opacity`. Two properties encoding one concept, collapsed to one.                                                                                                              |
| `Material.fog` toggle                                          | Fog is scene-level and architectural. Per-material opt-out does not exist.                                                                                                                 |
| `Material.castShadow` / `.receiveShadow`                       | No shadow system.                                                                                                                                                                          |
| `Material.toneMapped`                                          | No tone mapping.                                                                                                                                                                           |

---

### Restructured

**`Geometry.setColors()` is first-class.**
THREE.js treats per-vertex color as `geometry.setAttribute('color', attribute)`. In Easel.js, `setColors()` sits alongside `setPositions()` and `setUVs()` — per-vertex color is a primary shading path, not an afterthought.

**`Color.hsl16` is a readable property.**
The HSL16 quantization is a visible feature, not an implementation detail to hide. `.hsl16` returns the packed integer representation of the current color. `Color.fromHsl16(value)` constructs from a packed integer. Users working with color data directly — palette work, data textures — have first-class access to the native color format.

**`Fog` takes `{ tiles }`, not `(color, near, far)`.**
The THREE.js signature comes from OpenGL distance fog — a colored gradient fading to sky. Neither the gradient nor the sky exists in this renderer. The parameter is a tile-count cutoff and is named `tiles`. There is no fog color because the void is always black.

**`opacity: 0–8` replaces `opacity: float` + `transparent: bool`.**
THREE.js requires setting both a float `opacity` and a boolean `transparent: true` for translucency to take effect. One concept, two properties, easy to misconfigure. Easel.js uses a single integer `opacity` with a discrete range of 0–8. Setting it above zero enables translucency. No flag.

---

## Intentional Artifacts

The following visual behaviors are correct outputs of this renderer. They are not bugs.

**Vertex wobble.** Models shimmer and edges stutter during movement and camera rotation. Floating-point screen coordinates are truncated to integers in the projection pass. Different vertices on the same model cross integer boundaries at different frames, producing brief shape distortions. Animations compound this because keyframe interpolation produces large per-frame deltas.

**Polygon sort flicker.** Two mesh faces occupying the same tile at the same `layer` will flicker — swapping draw order — as the camera rotates. Sub-tile ordering is resolved by triangle centroid depth, and small camera rotations flip which centroid is deeper. No correction exists without a z-buffer. The OSRS cape/leg intersection is the canonical example — artists resolved these through manual geometry adjustment, not code.

**Affine texture warping.** Textured polygons warp and swim when viewed at oblique angles, particularly on large faces. UV coordinates are interpolated linearly across the scanline without dividing by W. Perspective-correct UV mapping is not available.

**HSL16 color banding.** Smooth lighting gradients from Gouraud shading are quantized to the nearest HSL16 value per pixel. Fine gradients appear stepped, particularly in low-saturation regions where the 3-bit saturation channel is coarse.

**Hard fog boundary.** The scene ends at `fog.tiles` with an immediate cut to black. No transition, no color blend.

**Opacity stepping.** Semi-transparent surfaces have nine visible opacity levels, not continuous alpha. Gradual fade animations will be visibly stepped.

---

*Easel.js is informed by RuneTek 3 as observed in Old School RuneScape, with reference to developer commentary from former Jagex engine team members.*
