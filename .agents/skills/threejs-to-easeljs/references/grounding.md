# EASEL.js 0.6.1 grounding

Use this file to establish target evidence before applying a THREE.js mapping.
The source checkout is authoritative for this repository; a consuming project
must check its resolved package because a different EASEL.js revision may have
different declarations.

## Revision and exports

- Package: `@xsyetopz/easel`.
- Revision anchor: `src/index.ts` exports `REVISION = "0.6.1"`.
- Public import: `import * as EASEL from "@xsyetopz/easel"`.
- Local declaration anchor: `dist/index.d.ts` after `bun run build`; source
  exports are listed in `src/index.ts`.
- Installed declaration anchor: `node_modules/@xsyetopz/easel/dist/index.d.ts`
  plus the resolved package's `package.json`.

Revision probe:

```ts
import * as EASEL from "@xsyetopz/easel";

if (EASEL.REVISION !== "0.6.1") {
  throw new Error(`Expected EASEL.js 0.6.1, got ${EASEL.REVISION}`);
}
```

When a declaration is missing, report the symbol and checked file as
`UNKNOWN`. A similarly named THREE.js or another package export is not target
evidence.

## Renderer and frame contract

`src/renderers/Renderer.ts` defines:

```ts
new EASEL.Renderer({
  width?: number,
  height?: number,
  canvas?: HTMLCanvasElement,
  pixelRatio?: number,
  sortObjects?: boolean,
});
```

The renderer owns a CPU `Framebuffer`, traverses the scene, culls fog-hidden
work, sorts draw calls, bakes flat/Gouraud lighting, rasterizes, and uploads
`ImageData` through a Canvas2D context. Public methods used in migrations are
`render(scene, camera, timings?)`, `setSize(width, height)`,
`setPixelRatio(ratio)`, `setClearColor(...)`, `domElement`, and `dispose()`.

The target has no public GPU device, WebGL/WebGPU context, shader program,
buffer object, shadow-map, PBR, environment-map, or postprocessing lifecycle.
Those source concepts require a CPU/application design or an explicit
unsupported result.

## Scene, camera, geometry, and material anchors

| Concern | Source anchor | Verified target detail |
| --- | --- | --- |
| Scene | `src/core/Scene.ts` | `background` accepts `Color`, packed number, screen-space `Texture`, or `undefined`; `fog` is a `Fog` or `undefined`. |
| Node | `src/core/Node.ts` | Transform, hierarchy, visibility, frustum flag, layers, names, and `userData`; `updateMatrixWorld` is explicit when auto-update is disabled. |
| Perspective camera | `src/cameras/PerspectiveCamera.ts` | Options `{ fov, aspect, near, far, tileSize }`; `fov` is degrees; call `updateProjectionMatrix()` after changing `aspect` or `fov`. |
| Orthographic camera | `src/cameras/OrthographicCamera.ts` | Options `{ left, right, top, bottom, near, far, tileSize }`; call `updateProjectionMatrix()` after changing projection bounds. |
| Geometry | `src/geometry/Geometry.ts` | CPU setters `setPositions`, `setNormals`, `setUVs`, `setColors`, `setIndex`; `getAttribute`, `computeVertexNormals`, `computeBoundingSphere`, `dispose`. |
| Attribute | `src/geometry/Attribute.ts` | Typed array wrapper with `itemSize`, component accessors, direct `array`, and `needsUpdate`. |
| Materials | `src/materials/*.ts` | `BasicMaterial`, `LambertMaterial`, `ToonMaterial`, line/point materials; common options include `color`, `map`, `transparent`, discrete `opacity`, depth flags, side, and layer. |
| Lights | `src/lights/*.ts` | Ambient, directional, point, spot, and hemisphere lights; lighting is CPU flat or Gouraud. |

## Texture and rasterization behavior

- `src/textures/Texture.ts` clamps image sources to 128×128 and caches
  `ImageData` on `needsUpdate = true` using nearest-neighbor Canvas2D sampling.
- `CanvasTexture`, `VideoTexture`, `DataTexture`, and `FramebufferTexture` are
  exported source-specific classes. `CanvasTexture.autoUpdate` and
  `VideoTexture.autoUpdate` participate in the renderer's frame refresh.
- UV interpolation is affine. Perspective camera textures can warp compared
  with a WebGL perspective-correct interpolation path.
- `Scene.background` textures are stretched in screen space before geometry.
  When fog is present, fog color supplies the initial clear and geometry blends
  toward that color.
- Material `opacity` uses nine discrete values: `0` is opaque and `8` is nearly
  transparent. Blending requires `transparent: true`; transparent materials
  default to `depthWrite: false` unless explicitly overridden.
- Opaque and transparent draw calls use the target painter/depth paths. Use
  `layer`, `depthTest`, and `depthWrite` deliberately for overlapping source
  content.

## Camera adapter for picking

`src/core/Raycaster.ts` declares a structural camera shape for
`setFromCamera`: `type`, `matrixWorld`, `projectionMatrixInverse`, and an
optional `isOrthographic`. EASEL `Camera` exposes `projectionMatrix` rather
than a cached inverse property, so create the inverse with
`new EASEL.Matrix4().copy(camera.projectionMatrix).invert()` after updating the
camera world matrix. The complete adapter is in
[`threejs-migration.md`](threejs-migration.md).

## Evidence procedure

1. Check the target project's resolved package version and `REVISION`.
2. Open the exact declaration or source file for the requested symbol.
3. Compare constructor options and runtime behavior, including renderer
   traversal/rasterizer support for the object/material combination.
4. Label the map direct, adapt, unsupported, or `UNKNOWN` in the migration
   notes.
5. Keep the checked path and validation result with the port review.
