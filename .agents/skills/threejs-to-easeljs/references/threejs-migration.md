# Complete Three.js project migration audit

This guide uses `three@0.185.1` / r185 as the reference source and
`@xsyetopz/easel@0.7.0` as the reference target. It is designed for an existing
application, not a toy-scene rewrite. Read [`grounding.md`](grounding.md) before
assigning a status.

## 1. Establish the actual source

Do not start with class replacement. First capture the application's real
runtime and asset surface.

Useful inventory searches (adjust source directories and generated-file
exclusions):

```sh
# Package and import surface
rg -n '"three"|three/(addons|examples/jsm|webgpu|tsl)'   package.json bun.lock package-lock.json pnpm-lock.yaml yarn.lock src test tests

# High-risk render features
rg -n 'WebGLRenderer|WebGPURenderer|EffectComposer|RenderPass|ShaderPass|ShaderMaterial|RawShaderMaterial|NodeMaterial|shadowMap|castShadow|receiveShadow|setRenderTarget|readRenderTargetPixels|setViewport|setScissor|clippingPlanes|toneMapping|outputColorSpace|xr\.' src

# Assets, decoders, controls, animation and teardown
rg -n 'Loader|Decoder|Meshopt|KTX2|DRACO|Exporter|Controls|AnimationMixer|KeyframeTrack|Raycaster|dispose\(' src
```

Record separately:

- resolved `three` package version and runtime `THREE.REVISION`;
- source of TypeScript declarations (r185 itself has no bundled `.d.ts` here);
- every import path, including direct `examples/jsm` and dynamic imports;
- renderer constructor options and every renderer property/method touched;
- custom subclasses, monkey patches, `onBeforeRender`/`onAfterRender`, and
  material/geometry mutation;
- asset files by extension and variant: GLB versus JSON glTF, compression,
  extensions, texture encodings, skin/morph/animation use, multiple primitives,
  and external dependencies;
- browser/runtime assumptions, workers, OffscreenCanvas, XR, audio, physics,
  React/framework lifecycle, and failure UI;
- visual baselines and performance budgets.

If the project is not exactly r185, label r185-derived rows
**source-version-dependent** until checked against its installation. Historical
Three APIs such as the removed legacy `Geometry` are not the same as EASEL's
current CPU `Geometry` merely because the name matches.

## 2. Keep a migration ledger

Use one row for each imported symbol and another for each relied-on behavior.
Non-default fields matter even when the class name maps.

| Source import/symbol | Source use | Target symbol/path checked | Status | Semantic/performance difference | Required proof | Result |
| --- | --- | --- | --- | --- | --- | --- |
| `three/addons/loaders/GLTFLoader.js` | GLB with Draco, skins and PBR maps | `src/loaders/GLTFLoader.ts`; `_gltf/*` | adapt/unsupported per feature | no automatic source-equivalent decoding/material pipeline | load fixture, animate, compare | `UNKNOWN` until run |
| `WebGLRenderer.outputColorSpace` | sRGB output | `src/renderers/Renderer.ts`; `src/textures/Texture.ts` | unsupported | no target color-management/tone-map pass | approved baked assets | pending |

Allowed status values are `direct`, `adapt`, `surface-only`, `unsupported`, and
`UNKNOWN`. “Export exists” is evidence for a target symbol, not for complete
behavior.

## 3. Replace the render boundary

Three r185:

```ts
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(width, height);
renderer.setClearColor(0x101820);
renderer.setAnimationLoop(frame);
```

EASEL 0.7.0:

```ts
import * as EASEL from "@xsyetopz/easel";

const renderer = new EASEL.Renderer({
  canvas,
  width,
  height,
  sortObjects: true,
});
renderer.clearColor = 0x101820;

let request = 0;
function frame(now: number): void {
  update(now);
  renderer.render(scene, camera);
  request = requestAnimationFrame(frame);
}
request = requestAnimationFrame(frame);

function dispose(): void {
  cancelAnimationFrame(request);
  renderer.dispose();
}
```

The target internal resolution is the constructor/`setSize` size. If the source
used device pixel ratio, choose an explicit low-resolution framebuffer and CSS
size; do not call stale `setPixelRatio`. CPU cost scales with framebuffer pixels.

The main renderer has no alpha canvas option, antialias setting, preserve buffer,
color space, tone mapper, physically correct lights, local clipping, shadow map,
render target, viewport/scissor, clear-depth/stencil, or animation-loop API.
Inventory each such source setting as its own ledger row.

On resize:

```ts
renderer.setSize(width, height);
camera.aspect = width / height;
camera.updateProjectionMatrix();
```

Use `renderer.prepare(scene, camera)` when another subsystem such as picking
needs explicitly prepared matrices before the render. Verify custom
`matrixAutoUpdate` and `matrixWorldAutoUpdate` assumptions; do not copy Three's
boolean arguments without checking current `Node` declarations.

## 4. Scene graph and cameras

| Three r185 | EASEL 0.7.0 | Status/notes |
| --- | --- | --- |
| `Object3D` | `Node` | Adapt name; transforms, hierarchy, layers, visibility, names and `userData` exist. Check events, callbacks, serialization and matrix update signatures. |
| `Scene`, `Group` | `Scene`, `Group` | Same role. Background is color/hex or screen-space 2D texture; fog overrides its clear. |
| `Scene.environment` | stored `Scene.environment` | Surface-only for rendering: retained but ignored by the CPU renderer. |
| `Scene.overrideMaterial` | stored `Scene.overrideMaterial` | Surface-only unless current renderer consumption is verified. |
| `PerspectiveCamera(fov, aspect, near, far)` | `PerspectiveCamera({ fov, aspect, near, far, zoom?, tileSize? })` | Adapt positional arguments to options. Current projection inverse is cached. |
| `OrthographicCamera(left, right, top, bottom, near, far)` | `OrthographicCamera({ left, right, top, bottom, near, far, zoom?, tileSize? })` | Adapt constructor and projection updates. |
| `ArrayCamera` | `ArrayCamera` | Surface-only for multi-view until target viewport/subcamera orchestration is proved. |
| `StereoCamera` | `StereoCamera` | Helper exists; two-eye composition/viewport ownership is application work. |
| `CubeCamera` | none verified | Unsupported/UNKNOWN depending on required capture; no cube render-target pipeline. |

`Raycaster` no longer needs the older inverse-projection adapter:

```ts
renderer.prepare(scene, camera);
const rect = canvas.getBoundingClientRect();
const pixelX = (event.clientX - rect.left) * (canvas.width / rect.width);
const pixelY = (event.clientY - rect.top) * (canvas.height / rect.height);
const ndc = {
  x: (pixelX / canvas.width) * 2 - 1,
  y: 1 - (pixelY / canvas.height) * 2,
};
const raycaster = new EASEL.Raycaster();
raycaster.setFromCamera(ndc, camera);
const hits = raycaster.intersectObject(scene, true);
```

Test meshes, lines, points, sprites, LOD and instances separately if the source
picks them; public `raycast` support and render support are different questions.

## 5. Geometry, objects and draw structure

### Copying a BufferGeometry

Use attribute getters so normalized Three attributes are converted to their
logical values. This bounded helper copies the channels consumed by the common
EASEL mesh path:

```ts
function readAttribute(
  attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  components: 2 | 3,
): number[] {
  const values: number[] = [];
  for (let index = 0; index < attribute.count; index++) {
    values.push(attribute.getX(index), attribute.getY(index));
    if (components === 3) values.push(attribute.getZ(index));
  }
  return values;
}

function copyGeometry(source: THREE.BufferGeometry): EASEL.Geometry {
  const position = source.getAttribute("position");
  if (!position) throw new Error("position attribute is required");

  const target = new EASEL.Geometry().setPositions(readAttribute(position, 3));
  const normal = source.getAttribute("normal");
  if (normal) target.setNormals(readAttribute(normal, 3));
  const uv = source.getAttribute("uv");
  if (uv) target.setUVs(readAttribute(uv, 2));
  const color = source.getAttribute("color");
  if (color) target.setColors(readAttribute(color, 3));

  if (source.index) {
    const values = Array.from(source.index.array, Number);
    const max = values.reduce((current, value) => Math.max(current, value), 0);
    target.index = max > 65_535
      ? new Uint32Array(values)
      : new Uint16Array(values);
  }
  target.computeBoundingBox();
  target.computeBoundingSphere();
  return target;
}
```

Audit before using it: secondary UV/color channels, tangents, custom attributes,
normalized integer precision, sparse/interleaved storage, draw range, geometry
groups, primitive modes, morph targets, skin indices/weights, and dynamic
updates require deliberate handling. EASEL's current index mutation is the
`index` property, not `setIndex()`.

### Primitive and object map

- All r185 core primitive geometry class names are exported: Box, Capsule,
  Circle, Cone, Cylinder, Dodecahedron, Edges, Extrude, Icosahedron, Lathe,
  Octahedron, Plane, Polyhedron, Ring, Shape, Sphere, Tetrahedron, Torus,
  TorusKnot, Tube, and Wireframe. Verify each constructor/default and compare
  generated UVs/normals before replacing source meshes.
- EASEL also exports `ConvexGeometry` and `ParametricGeometry`, which are r185
  add-on concepts, not proof that every Three add-on geometry exists.
- Main renderer paths are verified for `Mesh`, line subclasses, `Points`, and
  `InstancedMesh`. Instances expand on CPU; benchmark real counts.
- A `Mesh` has one material. Split Three geometry groups/material arrays into
  child meshes or prebake them.
- `LOD` exists, but call its explicit `update(camera)` and test visibility.
- `Bone`, `Skeleton`, `SkinnedMesh`, morph attributes/influences, and related
  helpers are exported. Treat visible skin/morph deformation as surface-only
  until the main renderer consumer and the exact asset path are verified.
- `Sprite` and `SpriteMaterial` are exported, but the main renderer traversal
  does not establish an ordinary Sprite draw path. Do not mark sprites direct.
- r185 `BatchedMesh` and `ClippingGroup` have no verified target equivalents.

## 6. Materials, lights, fog and textures

### Material decisions

| Three r185 material | Target | Status |
| --- | --- | --- |
| `MeshBasicMaterial` | `BasicMaterial` | Adapt color/base map, side, vertex colors, wireframe, depth flags and discrete opacity only. |
| `MeshLambertMaterial` | `LambertMaterial` | Adapt to baked flat/Gouraud diffuse lighting; source emissive and extra maps are not implied. |
| `MeshToonMaterial` | `ToonMaterial` | Adapt; optional `gradientMap`, but CPU baked/interpolated response differs. |
| `LineBasicMaterial` | `LineMaterial` | Adapt; positive integer framebuffer-pixel width. |
| `LineDashedMaterial` | `DashedLineMaterial` | Adapt; dash/gap are integer framebuffer pixels and phase restarts per logical segment. |
| `PointsMaterial` | `PointsMaterial` | Adapt; `size` is a positive integer pixel radius, not Three's diameter/attenuated shader behavior. |
| `SpriteMaterial` | `SpriteMaterial` | Surface-only for the main renderer; material fields exist. |
| Standard, Physical, Phong, Matcap, Normal, Depth, Distance, Shadow, Shader, RawShader, TSL/node materials | Basic/Lambert/Toon approximation or baked assets | Unsupported as corresponding shader models. |

Three opacity is continuous alpha (`0` transparent, `1` opaque). Target opacity
is an integer amount of transparency (`0` opaque, `8` fully transparent) and
only blends with `transparent: true`:

```ts
function easelOpacity(alpha: number): number {
  return Math.round((1 - Math.max(0, Math.min(1, alpha))) * 8);
}

const material = new EASEL.BasicMaterial({
  color: 0x44aaff,
  transparent: true,
  opacity: easelOpacity(sourceMaterial.opacity),
});
```

Target blending is a fixed discrete path, not Three blend modes/equations.
Transparent materials default to `depthWrite: false`; review painter order,
`layer`, `depthTest`, and `depthWrite` with overlaps.

### Lights and fog

Ambient, directional, hemisphere, point, spot, rect-area and light-probe classes
are exported. Lighting is baked per face or vertex; no source shadow camera,
map, bias, radius, contact shadow, cookie, IES, per-pixel specular, or physical
energy workflow transfers automatically. Verify rect-area response rather than
assuming identical integration.

Map source fog deliberately:

```ts
const linear = new EASEL.Fog({ color: 0x8899aa, near: 10, far: 100 });
const exp2 = new EASEL.FogExp2(0x8899aa, 0.02, 500);
```

After mutating bounded fog parameters, call `fog.updateLut()` before an explicit
sample/render path that requires the refreshed table. The finite `far` is also a
CPU culling bound, including for exponential-squared fog.

### Texture boundary

Target textures are RGBA unsigned-byte, nearest filtered, no mipmaps,
anisotropy 1, and cached image sources clamp to 128×128. UV interpolation is
affine. `Texture`, `DataTexture`, `CanvasTexture`, `VideoTexture`, and
`FramebufferTexture` exist; repeat/mirrored/clamp wrapping is supported.

Audit and redesign source use of:

- sRGB/linear color management, HDR output and tone mapping;
- mipmaps, linear/trilinear filters, anisotropy, compressed formats;
- cube, array, 3D, depth, multisample and render-target textures;
- environment/reflection/refraction maps, PMREM and IBL;
- normal, bump, displacement, AO, light, emissive, roughness, metalness,
  specular, clearcoat, transmission and thickness maps;
- UV channels beyond the verified path, matrix transforms and shader sampling.

A stored Three-shaped texture field is not proof that the rasterizer uses it.
Test the exact sampled output.

## 7. Animation, controls, input and audio

### Animation

Map `AnimationMixer` to `Animator`; map number/vector/quaternion/color/boolean/
string keyframe tracks to the corresponding EASEL typed tracks. Audit track-name
binding grammar and imported names. Current loop constants are `EASEL.Loop.Once`,
`EASEL.Loop.Repeat`, and `EASEL.Loop.PingPong`, not stale `LoopRepeat` exports.

```ts
const track = new EASEL.VectorTrack(
  "Model.position",
  [0, 1],
  [0, 0, 0, 0, 1, 0],
);
const clip = new EASEL.AnimationClip("move", -1, [track]);
const animator = new EASEL.Animator(scene);
animator.clipAction(clip)
  .setLoop(EASEL.Loop.Repeat, Number.POSITIVE_INFINITY)
  .play();
```

`Timer` replaces `Clock`; it uses properties such as `delta` and
`elapsedTime` around explicit `update()`. Audit interpolation, additive blend,
action fading/cross-fades, animation groups, root motion, morph tracks and skin
consumption with real clips. `GLTFLoader.animations` contains decoded channel
records, not automatically constructed EASEL `AnimationClip` instances.

### Controls

The r185 add-on names Arcball, Drag, FirstPerson, Fly, Map, Orbit, PointerLock,
Trackball and Transform all exist at the EASEL root. Keep each as **adapt** until
its used surface is checked. Compare:

- camera/object structural type;
- constructor DOM target and pointer-lock ownership;
- option names/defaults and keyboard/mouse/touch constants;
- event names/payloads;
- whether `update()` takes no delta, an optional delta, or a required delta;
- damping and change-detection return value;
- `enabled`, reset/save state, attach/detach semantics, and `dispose()`.

Never bulk-replace control imports solely because names match.

### Audio and physics

EASEL exports `Audio`, `AudioListener`, `PositionalAudio`, `AudioLoader`, and
`AudioAnalyzer` (not Three's `AudioAnalyser` spelling), plus CPU/browser audio
helpers. Treat browser context creation, graph connections, orientation and
analyzer outputs as adaptations.

Three add-on Ammo/Jolt/Rapier integrations are not equivalent to EASEL physics
classes. Prefer retaining an existing physics engine and copying transforms if
that boundary works. Otherwise audit collision shapes, solver, units, stepping,
constraints, determinism and worker ownership independently.

## 8. Loaders and asset preflight

### Shared core-role loaders

Both packages expose these names/roles: `AnimationLoader`, `AudioLoader`,
`BufferGeometryLoader`, `Cache`, `DataTextureLoader`, `FileLoader`,
`ImageBitmapLoader`, `ImageLoader`, `Loader`, loader utilities,
`LoadingManager`, `MaterialLoader`, `ObjectLoader`, and `TextureLoader`.
EASEL also exports `GeometryLoader`. Constructor/configuration familiarity does
not make parsed JSON or material/object schemas interchangeable; inspect the
exact EASEL return type.

### Format loader inventory

EASEL 0.7.0 root exports these r185 add-on names:

`BVHLoader`, `DDSLoader`, `GCodeLoader`, `GLTFLoader`, `HDRLoader`,
`RGBELoader` (alias of `HDRLoader`), `MTLLoader`, `NRRDLoader`, `OBJLoader`,
`PCDLoader`, `PDBLoader`, `PLYLoader`, `STLLoader`, `SVGLoader`, `TGALoader`,
`TIFFLoader`, `TTFLoader`, `VOXLoader`, and `XYZLoader`.

Use them as **adapt** mappings. High-risk verified boundaries include:

- **GLTF:** `load()` handles JSON glTF and external/data buffers. `parse()` can
  accept a JSON document/string plus supplied `buffers` or a `binaryChunk`; do
  not assume automatic GLB-container parsing. It builds CPU triangle modes
  TRIANGLES/STRIP/FAN with POSITION and optional NORMAL/TEXCOORD_0/COLOR_0,
  node transforms and cameras. Materials reduce to Basic/Lambert base color,
  optional caller-supplied base-color texture, double side, and quantized blend
  alpha. Texture references are metadata unless decoded textures are supplied.
  Animations are decoded channels. Instancing, LOD and material-variant metadata
  have bounded support. Skins, rendered morphs, PBR maps, Draco/Meshopt and KTX2
  pipelines are not implied.
- **OBJ/MTL:** CPU parsers and material tables exist; inspect diagnostics,
  polygon triangulation, line/point handling, texture resolution, smoothing,
  object/group splits, and target single-material constraints using fixtures.
- **DDS:** uncompressed RGB/RGBA CPU pixels only; DXT/BCn/ETC/DX10 and cubemaps
  are explicitly rejected.
- **HDR/RGBE:** decoded HDR samples are tone-mapped to packed sRGB RGBA bytes for
  `DataTexture`; this is not an HDR environment/PMREM/render pipeline.
- **SVG:** DOM-free supported-element/path/style/affine-transform parsing returns
  CPU `ShapePath` data; it is not a browser's full SVG/CSS implementation.
- **NRRD/VOX/TTF and scientific/CAD-style formats:** result objects are
  target-specific CPU data. Read declarations and tests before assuming Three
  add-on helper objects or rendering behavior.

r185 add-ons without a same-name EASEL loader include 3DM, 3MF, AMF, Collada,
Draco, EXR, FBX, Font, HDRCubeTexture, IES, KMZ, KTX/KTX2, LDraw, LUT, Lottie,
LWO, MaterialX, MD2/MDD, PVR, TDS, UltraHDR, USD/USDZ, VRML and VTK loaders.
This name inventory is not a blanket “impossible” claim: keep an independent
CPU parser or converter, construct EASEL resources, and mark uninvestigated
variants `UNKNOWN`.

For every production asset, test success and malformed/error paths, dependent
URLs, CORS/credentials, progress, cancellation, memory release, and the exact
result graph. Do not validate only one friendly fixture.

## 9. Exporters and DOM renderers

| r185 add-on | EASEL 0.7.0 | Important adaptation |
| --- | --- | --- |
| `GLTFExporter` | `GLTFExporter` | Returns `{ json, binary, dataUri }` synchronously or via a callback overload. It is a deterministic CPU glTF subset, not Three's GLB/extension/plugin surface. |
| `OBJExporter` | `OBJExporter` | Returns OBJ text from EASEL meshes; material output is separate (`MTLExporter`). |
| `PLYExporter` | `PLYExporter` | Returns ASCII string or little-endian `Uint8Array` with `{ binary: true }`. |
| `STLExporter` | `STLExporter` | Emits ASCII STL text; do not copy r185 binary-option assumptions. |
| `EXRExporter` | `EXRExporter` | Accepts a `DataTexture` or raw CPU RGBA source; no WebGL/WebGPU render target, PMREM or compression. |
| `DRACOExporter`, `KTX2Exporter`, `USDZExporter` | none verified | Keep a separate exporter/converter or mark required behavior `UNKNOWN`. |
| no same r185 exporter | `GCodeExporter`, `MTLExporter` | Target additions; inspect their output contract before use. |

EASEL's `CSS2DRenderer`, `CSS3DRenderer`, and `SVGRenderer` map r185 add-on roles,
but are not drop-in implementations. Constructors take option objects; the SVG
renderer supports its documented line/basic-mesh/custom-SVG subset. Audit DOM
attachment, event/pointer behavior, supported camera projections, object
subclasses, cleanup, sizing and z-order.

## 10. Unsupported GPU/PBR/postprocess behaviors

Create explicit design rows for all of the following:

| Source behavior | Target decision |
| --- | --- |
| WebGL/WebGPU context/device, shader chunks, uniforms, GLSL/WGSL, TSL/node graphs, GPU compute | Remove or retain a separate backend. CPU attribute/material code is not a shader translation. |
| Render targets, cube targets, MRT, depth/stencil textures, readback, viewport/scissor composition | Redesign ownership. The main target renderer renders one CPU framebuffer and uploads it to Canvas2D. |
| EffectComposer and any render/shader pass | Use an approved application-owned Canvas2D/readback step, prebake, omit, or retain the source backend. Measure cost and visual difference. |
| Standard/Physical/Phong and advanced maps | Choose Basic/Lambert/Toon and bake appearance. Record loss of specular/PBR/environment response. |
| Shadows, CSM, contact shadows, light cookies | Bake into geometry/colors/textures or redesign with explicit geometry. No shadow-map flag enables them. |
| Environment maps, PMREM, reflections/refractions | Bake or omit. Stored `Scene.environment` is ignored by the main renderer. |
| Continuous alpha and blend modes | Quantize to nine levels and validate sorted overlaps; custom/additive/multiply equations are not equivalent. |
| Perspective-correct texture interpolation | Accept affine warp, subdivide geometry/UVs, change framing, or use orthographic projection. |
| XR, GPU particles, water/sky/reflector shader objects | Retain another backend or design bounded CPU geometry/animation. |

## 11. Integration and acceptance tests

Port boundaries in this order so failures stay attributable:

1. renderer/canvas, one camera, one Basic mesh, resize and teardown;
2. hierarchy/transforms/layers and representative camera projections;
3. each geometry/object/material pair, including transparent overlap;
4. every production texture class/format and fog/background combination;
5. lights and accepted baked-look differences;
6. each loader asset family, dependency and error path;
7. clips/bindings, controls and pointer picking;
8. DOM renderers, audio, physics, framework mount/unmount;
9. exporters and downstream round-trip/consumer checks;
10. full scene CPU frame-time and memory budget.

Evidence should include:

- target typecheck and focused tests;
- an actual browser `HTMLCanvasElement` frame, not only Node imports;
- golden screenshots or stable pixel probes for representative views;
- resize/CSS scaling and pointer-coordinate tests;
- deterministic animation checkpoints and control interactions;
- transparent ordering/depth cases and fog/background precedence;
- loader success, malformed input, missing dependency, cancellation where
  supported, and disposal;
- exporter parse/round-trip or downstream-reader tests;
- CPU timing at the chosen internal resolution and peak asset memory;
- a list of **UNVERIFIED** browsers, formats, features and visual differences.

A migration is complete only when the ledger is closed. Symbols or behaviors
without sufficient evidence remain `UNKNOWN`; matching names never close them.
