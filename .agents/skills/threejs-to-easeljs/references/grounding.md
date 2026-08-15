# Baseline and source grounding

This file records what was inspected for the reference mapping. It does not
replace inspection of the consuming project's resolved packages.

## Exact reference installations

### Three.js source

- `package.json` dev dependency: `three: ^0.185.1`.
- `node_modules/three/package.json`: package version `0.185.1`.
- `node_modules/three/src/constants.js`: `REVISION = "185"`.
- `node_modules/three/package.json` exports core (`.`),
  `./examples/jsm/*`, `./addons`, `./addons/*`, `./src/*`, `./webgpu`, and
  `./tsl`.
- `node_modules/three/src/Three.js` is the WebGL core entry;
  `node_modules/three/examples/jsm/Addons.js` is the add-on aggregate.
- No `.d.ts` files are present under this installed `node_modules/three`.
  Runtime modules and JSDoc are therefore the bundled source evidence. A source
  application's TypeScript declarations may come from another package or tool
  and must be versioned separately.

### EASEL target

- Repository `package.json`: name `@xsyetopz/easel`, version `0.7.0`.
- `src/index.ts`: `REVISION = "0.7.0"` and the root public exports.
- Published declaration entry: `dist/index.d.ts` from the package export map.
- Owning `src/**/*.ts` interfaces/classes provide constructor and behavior
  declarations in this checkout.

Consumer probe:

```ts
import * as EASEL from "@xsyetopz/easel";

if (EASEL.REVISION !== "0.7.0") {
  throw new Error(`This audit expects EASEL 0.7.0, got ${EASEL.REVISION}`);
}
```

Do not leave the assertion in an application that intentionally accepts a
version range; use it as audit evidence or convert it to a compatibility check.

## Evidence has two layers

1. **Public surface:** Is the symbol exported, and what does its declaration
   accept or return?
2. **Required consumer:** Does the main `Renderer`, a DOM renderer, a loader,
   or another subsystem actually consume the state the migration relies on?

A class can pass layer 1 and fail layer 2. For example, 0.7.0 exports
`Sprite`, `SpriteMaterial`, `SkinnedMesh`, morph fields, `ArrayCamera`, and
`StereoCamera`; that alone does not prove the main `Renderer` draws or
orchestrates every corresponding behavior. Inspect `src/pipeline/SceneTraversal.ts`
and the appropriate assembly/rasterizer path before calling it direct.

## Renderer and frame contract

`src/renderers/Renderer.ts` declares:

```ts
new EASEL.Renderer({
  width?: number,
  height?: number,
  canvas?: HTMLCanvasElement,
  sortObjects?: boolean,
});
```

Verified public members include `domElement`, `width`, `height`, `sortObjects`,
`prepare(scene, camera, force?)`, `render(scene, camera, timings?)`,
`setSize(width, height)`, the `clearColor` accessor, and `dispose()`.

Corrections from the older guide:

- no `pixelRatio` option or `setPixelRatio()` in the current renderer;
- set `renderer.clearColor = colorOrHex`; there is no current main-renderer
  `setClearColor()` method;
- there is no `setAnimationLoop()` method;
- `render()` performs CPU traversal, fog culling, painter sorting, baked
  lighting, rasterization, and Canvas2D `ImageData` upload;
- no public WebGL/WebGPU context, render target, viewport/scissor, shader,
  shadow map, postprocess graph, or GPU resource lifecycle exists.

`src/pipeline/SceneTraversal.ts` verifies the main draw paths for ordinary
`Mesh`, `Points`, `Line` subclasses with `LineMaterial`, and `InstancedMesh`.
Use that consumer evidence when reviewing other exported object types.

## Current camera and picking evidence

- `src/cameras/PerspectiveCamera.ts` and
  `src/cameras/OrthographicCamera.ts` use option objects rather than Three's
  positional constructors.
- `src/cameras/Camera.ts` now owns `projectionMatrixInverse` and
  `matrixWorldInverse`; projection updates refresh the cached inverse.
- `src/core/Raycaster.ts` accepts the structural `RaycastCamera` fields already
  present on current EASEL cameras. Prepare the camera world/view matrices and
  call `raycaster.setFromCamera(ndc, camera)` directly. The old manual
  inverse-projection adapter is stale.
- `ArrayCamera` and `StereoCamera` are exported, but inspect renderer viewport
  and multi-view orchestration before mapping Three multi-camera rendering.

## Geometry and object evidence

`src/geometry/Geometry.ts` provides CPU channels and current mutation APIs:

- `setPositions(Float32Array | number[])`
- `setNormals(Float32Array | number[])`
- `setUVs(Float32Array | number[])`
- `setColors(Float32Array | number[])`
- `setTangents(Float32Array | number[])`
- `setAttribute`, `getAttribute`, `deleteAttribute`, `hasAttribute`
- `index: Uint16Array | Uint32Array | number[] | undefined`
- bounds, normals, transforms, draw range, morph metadata, clone/copy/JSON, and
  disposal helpers.

There is no current `Geometry.setIndex()`. Three geometry groups/material arrays
also have no automatic one-to-one main-renderer path: EASEL `Mesh` accepts one
`Material | undefined`. Split source groups into target meshes when necessary.

The target has all r185 core primitive names plus EASEL/add-on-style
`ConvexGeometry` and `ParametricGeometry`. Similar names do not prove identical
constructor defaults, vertex order, UV layout, or segment validation; inspect
the primitive declaration used by the source.

`InstancedMesh` has CPU transform/color storage and a verified traversal branch.
`LOD` is exported and has explicit `update(camera)`; do not assume the renderer
updates it. `SkinnedMesh`, skeleton APIs, and morph metadata exist, but the main
renderer consumer must be established for visual deformation. The same
surface-versus-consumer rule applies to sprites.

## Material, lighting, fog, and texture evidence

The main material families are `BasicMaterial`, `LambertMaterial`,
`ToonMaterial`, `LineMaterial`, `DashedLineMaterial`, `PointsMaterial`, and
`SpriteMaterial`. Common CPU fields are bounded: color/map where declared,
`transparent`, integer `opacity` from 0 (opaque) through 8 (fully transparent),
`depthTest`, `depthWrite`, `Shading.Flat`/`Shading.Gouraud`, side, layer,
visibility, wireframe, and vertex colors. Blending requires `transparent: true`;
a transparent constructor defaults depth writes off unless explicitly set.

`src/pipeline/shading/` and `src/pipeline/LightBaker.ts` establish flat/Gouraud
CPU lighting. Ambient, directional, hemisphere, point, spot, and light-probe
state is collected. `RectAreaLight` is exported, but inspect its collection and
baking behavior for the required scene instead of assuming Three's area-light
response. There are no shadow maps or per-pixel PBR/Phong shaders.

`src/scenes/Fog.ts` provides bounded linear `Fog` (options object) and positional
`FogExp2(color?, density?, far?)`. Fog uses a fixed lookup table and finite far
bound; changed parameters can require `updateLut()`. Fog color overrides the
initial scene background clear.

`src/textures/Texture.ts` and the rasterizer establish a bounded CPU path:

- cached image data is clamped to at most 128×128;
- packed RGBA unsigned-byte pixels, nearest filtering, no mipmaps, anisotropy 1;
- affine UV interpolation under perspective;
- repeat, mirrored-repeat, and clamp wrapping are implemented by the sampler;
- image, canvas, video, data, and framebuffer texture classes are exported.

Some Three-shaped texture fields exist for serialization or reject unsupported
values. Verify renderer consumption of UV transforms and other fields rather
than equating public storage with sampled behavior. Cube, array, 3D, compressed,
multisampled, depth, PMREM, and environment sampling have no equivalent main
path. `Scene.environment` and environment/background intensity/rotation fields
are retained data but ignored by the CPU renderer. `Scene.overrideMaterial` is
also stored; current renderer consumption must be checked before relying on it.

## Controls, DOM renderers, loaders, and exporters

Root exports in `src/index.ts` now include:

- controls: `ArcballControls`, `DragControls`, `FirstPersonControls`,
  `FlyControls`, `MapControls`, `OrbitControls`, `PointerLockControls`,
  `TrackballControls`, and `TransformControls`;
- DOM renderers/objects: `CSS2DRenderer`/`CSS2DObject`,
  `CSS3DRenderer`/`CSS3DObject`/`CSS3DSprite`, and
  `SVGRenderer`/`SVGObject`;
- format loaders: `BVHLoader`, `DDSLoader`, `GCodeLoader`, `GLTFLoader`,
  `HDRLoader`/`RGBELoader`, `MTLLoader`, `NRRDLoader`, `OBJLoader`, `PCDLoader`,
  `PDBLoader`, `PLYLoader`, `STLLoader`, `SVGLoader`, `TGALoader`, `TIFFLoader`,
  `TTFLoader`, `VOXLoader`, and `XYZLoader`, in addition to the core loading
  stack;
- exporters: `EXRExporter`, `GCodeExporter`, `GLTFExporter`, `MTLExporter`,
  `OBJExporter`, `PLYExporter`, and `STLExporter`.

These are verified exports, not universal format compatibility. Inspect each
owning file for options, result types, limits, diagnostics, and abort behavior.
The detailed guide records the highest-risk differences.

## UNKNOWN evidence record

Use a record like this:

```text
Source: WebGPURenderer.computeAsync (three r185, import three/webgpu)
Target: @xsyetopz/easel 0.7.0
Checked: src/index.ts; src/renderers/Renderer.ts; src/pipeline/
Status: unsupported for the main renderer
Reason: no GPU device/compute lifecycle in the CPU/Canvas2D contract
Consequence: retain a separate compute backend or redesign the simulation
Validation: not applicable; redesign remains UNKNOWN until approved
```

When source behavior is not covered by r185 or target evidence is incomplete,
use `UNKNOWN`, list the paths, and do not guess.
