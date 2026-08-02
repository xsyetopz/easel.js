# THREE.js migration guide

This guide is the detailed companion to the skill entry point. It assumes a
source application built with THREE.js and a target application importing
`@xsyetopz/easel`. Confirm the target revision and declarations in
[`grounding.md`](grounding.md) before copying a recipe. The examples use
TypeScript and browser APIs; adapt the module syntax to the target build.

## Conversion statuses

Use one status for every source symbol or behavior:

- **Direct** - the target export and the relevant behavior are present. Verify
  constructor options and types before editing.
- **Adapt** - the target has the same scene role but a different constructor,
  data shape, lifecycle, or visual behavior. Keep the adaptation visible in the
  port and validate it.
- **Unsupported** - the target API intentionally has no equivalent. Keep the
  feature out of the target implementation unless a separate CPU design is
  approved.
- **UNKNOWN** - declarations or source evidence are insufficient. Record the
  exact symbol and path inspected, and leave the behavior unresolved until a
  target-side design is verified.

## A small scene: renderer, graph, camera, and material

Typical THREE.js setup:

```ts
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(width, height);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
camera.position.set(2, 2, 4);
camera.lookAt(0, 0, 0);

const mesh = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshLambertMaterial({ color: 0xff5533 }),
);
scene.add(mesh);

function frame() {
  mesh.rotation.y += 0.01;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();
```

EASEL.js target:

```ts
import * as EASEL from "@xsyetopz/easel";

const renderer = new EASEL.Renderer({
  canvas,
  width,
  height,
});
const scene = new EASEL.Scene();
scene.background = 0x111827;

const camera = new EASEL.PerspectiveCamera({
  fov: 60,
  aspect: width / height,
  near: 0.1,
  far: 100,
});
camera.position.set(2, 2, 4);
camera.lookAt(0, 0, 0);

scene.add(new EASEL.AmbientLight(0xffffff, 0.35));
const sun = new EASEL.DirectionalLight(0xffffff, 0.8);
sun.position.set(3, 5, 4);
scene.add(sun);

const mesh = new EASEL.Mesh(
  new EASEL.BoxGeometry(1, 1, 1),
  new EASEL.LambertMaterial({ color: 0xff5533 }),
);
scene.add(mesh);

function frame() {
  mesh.rotation.y += 0.01;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();
```

The target renderer updates scene and camera matrices during traversal. A caller
that disables `Scene.autoUpdate` or camera updates must update matrices
explicitly before rendering.

## API map with constructor notes

### Renderer and canvas

| THREE.js source                            | EASEL.js target                                       | Notes                                                                                                          |
| ------------------------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `new WebGLRenderer({ canvas, antialias })` | `new Renderer({ canvas, width, height, pixelRatio })` | `antialias`, WebGL context attributes, and GPU output settings have no target option.                          |
| `renderer.domElement`                      | `renderer.domElement`                                 | The value is an `HTMLCanvasElement` when a canvas is supplied or a browser document can create one.            |
| `renderer.setSize(w, h)`                   | `renderer.setSize(w, h)`                              | Resizes the CPU framebuffer and canvas backing store. Update a perspective camera's `aspect` separately.       |
| `renderer.setPixelRatio(r)`                | `renderer.setPixelRatio(r)`                           | Stores the target ratio; confirm the app's backing-store policy because `setSize` owns framebuffer dimensions. |
| `renderer.setClearColor(...)`              | `renderer.setClearColor(...)`                         | Accepts a `Color`, packed hex, or three 0–255 channels when scene background is absent.                        |
| `renderer.dispose()`                       | `renderer.dispose()`                                  | Releases the target's Canvas2D references. Dispose replaced scene resources separately.                        |

### Scene graph and transforms

`Node` exposes familiar `position`, `rotation`, `quaternion`, `scale`, `matrix`,
`matrixWorld`, `visible`, `frustumCulled`, `layers`, `name`, `userData`,
`parent`, `children`, `add`, `remove`, `traverse`, and `lookAt` operations.
Preserve hierarchy and names because `Animator` bindings resolve named child
nodes. EASEL's `Scene.autoUpdate` defaults to `true`; when it is `false`, the
application owns matrix updates.

`Mesh`, `Line`, `LineSegments`, `LineLoop`, `Points`, `Sprite`, `InstancedMesh`,
and `SkinnedMesh` are exported target objects. The object type alone does not
prove a source feature is visually equivalent: inspect the target traversal and
rasterizer for the material/object combination used by the scene.

### Cameras

THREE.js positional camera constructors become EASEL option objects:

```ts
const perspective = new EASEL.PerspectiveCamera({
  fov: 60,
  aspect: width / height,
  near: 0.1,
  far: 100,
});

const orthographic = new EASEL.OrthographicCamera({
  left: -2,
  right: 2,
  top: 2,
  bottom: -2,
  near: 0.1,
  far: 100,
});
```

On resize:

```ts
renderer.setSize(width, height);
camera.aspect = width / height;
camera.updateProjectionMatrix();
```

`fov` is in degrees. `near`, `far`, and `tileSize` are camera options. EASEL
does not expose THREE.js camera helpers or a renderer-managed controls loop;
`OrbitControls` is available as an explicit target class and must be updated by
the application.

### Geometry and attributes

EASEL geometry is CPU-owned. A THREE.js `BufferGeometry` conversion copies
attribute values rather than retaining a GPU buffer object:

```ts
function copyGeometry(source: THREE.BufferGeometry): EASEL.Geometry {
  const geometry = new EASEL.Geometry();
  const position = source.getAttribute("position");
  if (!position) throw new Error("position attribute is required");

  geometry.setPositions(Array.from(position.array as ArrayLike<number>));

  const normal = source.getAttribute("normal");
  if (normal) {
    geometry.setNormals(Array.from(normal.array as ArrayLike<number>));
  }

  const uv = source.getAttribute("uv");
  if (uv) geometry.setUVs(Array.from(uv.array as ArrayLike<number>));

  const color = source.getAttribute("color");
  if (color) geometry.setColors(Array.from(color.array as ArrayLike<number>));

  if (source.index) {
    const sourceIndex = source.index.array;
    if (
      sourceIndex instanceof Uint16Array || sourceIndex instanceof Uint32Array
    ) {
      geometry.setIndex(sourceIndex.slice());
    } else {
      const values = Array.from(sourceIndex as ArrayLike<number>);
      const maxIndex = values.reduce((max, value) => Math.max(max, value), 0);
      geometry.setIndex(
        maxIndex > 65_535 ? new Uint32Array(values) : new Uint16Array(values),
      );
    }
  }
  geometry.computeBoundingSphere();
  return geometry;
}
```

For a known primitive, prefer the target primitive class (`BoxGeometry`,
`SphereGeometry`, `PlaneGeometry`, `CylinderGeometry`, `ConeGeometry`,
`TorusGeometry`, `TorusKnotGeometry`, `CapsuleGeometry`, `LatheGeometry`,
`ExtrudeGeometry`, `ShapeGeometry`, `PolyhedronGeometry`, or another verified
export) rather than serializing a source-generated mesh. Check parameter order
in the target declaration; similar names do not guarantee identical defaults.

`Attribute` supports typed arrays, `itemSize`, component accessors, and direct
array mutation. After changing positions or topology, recompute the bounding
sphere and preserve the index type (`Uint16Array` or `Uint32Array`) selected by
`Geometry.setIndex`.

### Materials and opacity

| THREE.js              | EASEL.js             | Target behavior                                                                         |
| --------------------- | -------------------- | --------------------------------------------------------------------------------------- |
| `MeshBasicMaterial`   | `BasicMaterial`      | Color/map without lighting.                                                             |
| `MeshLambertMaterial` | `LambertMaterial`    | CPU light baking; default Gouraud shading.                                              |
| `MeshToonMaterial`    | `ToonMaterial`       | Gouraud lighting quantized into target steps; `gradientMap` is a target texture option. |
| `LineBasicMaterial`   | `LineMaterial`       | Target line material; verify integer line behavior and width.                           |
| `LineDashedMaterial`  | `DashedLineMaterial` | Target `dashSize` and `gapSize` options.                                                |
| `PointsMaterial`      | `PointsMaterial`     | Target `size` is an integer pixel radius.                                               |

`Material.opacity` is a discrete inverted scale. `0` is opaque; `8` is nearly
transparent. Blending occurs only when `transparent: true`; transparent
materials default to `depthWrite: false` unless explicitly set. To quantize a
THREE.js float alpha (where `0` is transparent and `1` is opaque):

```ts
function toEaselOpacity(alpha: number): number {
  const clamped = Math.max(0, Math.min(1, alpha));
  return Math.round((1 - clamped) * 8);
}

const material = new EASEL.BasicMaterial({
  color: 0x44aaff,
  transparent: true,
  opacity: toEaselOpacity(0.35),
});
```

The quantized value changes the blend weight. Validate overlapping transparent
meshes in the target painter sort and set `layer`, `depthTest`, and `depthWrite`
deliberately when the source relied on explicit ordering.

### Textures and background

Use the source-specific target texture class:

```ts
const texture = new EASEL.Texture(imageBitmap);
texture.needsUpdate = true;

const material = new EASEL.BasicMaterial({
  color: 0xffffff,
  map: texture,
});
```

- `Texture` accepts an image/canvas/bitmap source and caches `ImageData` when
  `needsUpdate` becomes `true`.
- `CanvasTexture` tracks an `HTMLCanvasElement`; set `autoUpdate = true` for
  per-frame canvas sampling.
- `VideoTexture` exposes `update()` and defaults to `autoUpdate = true`.
- `DataTexture` stores raw `Uint8ClampedArray` pixels.
- `FramebufferTexture` captures an `ImageData` region for a later CPU pass.

Image sources are clamped to 128×128 and sampled with nearest-neighbor logic.
Texture UVs use affine interpolation; perspective-camera scenes can therefore
show the expected affine warp. `Scene.background = texture` is a screen-space
clear stretched to the framebuffer, not a skybox/material draw call. If
`scene.fog` is present, fog color supplies the initial clear and geometry is
then blended toward that color.

### Lighting and fog

`AmbientLight`, `DirectionalLight`, `PointLight`, `SpotLight`, and
`HemisphereLight` are exported with CPU intensity/distance/cone calculations.
Lighting is flat or Gouraud depending on the material's `shading` value. The
target has no shadow-map lifecycle. `Fog` is exponential-squared fog with
`color`, `near`, `far`, and `density`; it also determines the background clear
when attached to a scene.

### Animation

The target animation path is explicit and uses a root object plus named
bindings:

```ts
const track = new EASEL.VectorTrack(
  "Model.position",
  [0, 1],
  [0, 0, 0, 0, 1, 0],
);
const clip = new EASEL.AnimationClip("move", -1, [track]);
const animator = new EASEL.Animator(scene);
const action = animator.clipAction(clip).setLoop(EASEL.LoopRepeat, Infinity);
action.play();

let previous = performance.now();
function frame(now: number) {
  const delta = (now - previous) / 1000;
  previous = now;
  animator.update(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

Use `NumberTrack`, `VectorTrack`, `QuaternionTrack`, `ColorTrack`, or
`BooleanTrack` according to the bound property. Track paths such as
`"Model.position"` resolve a child by `name`; a path such as `"position"` binds
directly on the root. Confirm names after importing a source hierarchy.

### Controls and ray picking

`OrbitControls` receives the camera and an event target and exposes `update()`,
`reset()`, and `dispose()`. Call `update()` before rendering:

```ts
const controls = new EASEL.OrbitControls(camera, canvas);
controls.enableDamping = true;

function frame() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
```

`Raycaster.setFromCamera` accepts a structural camera with `type`,
`matrixWorld`, and `projectionMatrixInverse`. The public EASEL camera exposes
`projectionMatrix`, so build the inverse explicitly:

```ts
camera.updateMatrixWorld(true);
const projectionMatrixInverse = new EASEL.Matrix4()
  .copy(camera.projectionMatrix)
  .invert();

const raycaster = new EASEL.Raycaster();
raycaster.setFromCamera(
  {
    x: (event.offsetX / canvas.width) * 2 - 1,
    y: 1 - (event.offsetY / canvas.height) * 2,
  },
  {
    type: camera.type,
    matrixWorld: camera.matrixWorld,
    projectionMatrixInverse,
    isOrthographic: camera.type === "OrthographicCamera",
  },
);
const hits = raycaster.intersectObject(scene, true);
```

Use backing-store coordinates when CSS scales the canvas. `intersectObjects` and
`intersectObject` sort results by ascending distance. The target raycaster
supports mesh triangles plus line/point threshold checks; verify object types
and layer masks in the consuming scene.

## Loading and asset boundaries

EASEL exports `FileLoader`, `ImageLoader`, `ImageBitmapLoader`, `TextureLoader`,
`DataTextureLoader`, `GeometryLoader`, `MaterialLoader`, `ObjectLoader`, and
`AnimationLoader`. These are target-specific JSON/fetch/image primitives, not a
promise that THREE.js interchange formats will parse. A practical conversion
sequence for a GLTF or OBJ asset is:

1. Keep the source-format parser in an application or dedicated asset package.
2. Extract positions, normals, UVs, colors, and indices into typed CPU arrays.
3. Build verified EASEL `Geometry`, material, texture, and `Mesh` instances.
4. Recreate names and parent/child links if animation bindings or picking use
   them.
5. Dispose temporary parser resources after the target graph is complete.

`ObjectLoader` currently creates a basic node hierarchy from its supported JSON
shape; inspect its declaration and parser before relying on serialized materials
or meshes.

## Review checklist

- [ ] Source symbols have a direct/adapt/unsupported/UNKNOWN status.
- [ ] `EASEL.REVISION` and resolved declaration paths are recorded.
- [ ] The renderer uses a real browser canvas and the target render loop.
- [ ] Camera constructors and resize updates use target options/methods.
- [ ] CPU geometry attributes, indices, normals, UVs, and bounds are valid.
- [ ] Material opacity is quantized and transparent draw order is intentional.
- [ ] Texture dimensions, nearest sampling, affine UVs, background, and fog
      behavior are represented in the visual review.
- [ ] Animators, controls, raycaster adapters, and event coordinate scaling are
      tested where the source used them.
- [ ] Replaced geometries, textures, materials, controls, and renderer are
      disposed at the corresponding lifecycle boundary.
- [ ] Typecheck, targeted tests, and a browser smoke render have evidence.
