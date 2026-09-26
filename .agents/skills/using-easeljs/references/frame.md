# Frame, camera, and resize

Cards for drawing a correct frame with `@xsyetopz/easel` 0.7.0: preparing
matrices, aiming a camera, resizing, and choosing the clear color. The
runnable files are in `assets/examples/`; `sh assets/examples/verify.sh
examples` type-checks them against `src/index.ts` and runs each oracle
under Bun with a stub Canvas2D canvas (tier: Executed, stub Canvas2D, not
a browser).

Local numbers below come from that command on macOS arm64 (Darwin 27.0.0),
Bun 1.4.2, and tsc 7.0.2.

## Contents

- Prepare before render
- Camera options and lookAt
- Resize
- Clear color and background precedence

## Prepare before render

**Definition.** `Renderer.render(scene, camera)` clears, traverses, sorts,
rasterizes, and uploads, but it never updates matrices. It reads each
node's `matrixWorld` and the camera's `matrixWorldInverse`.
`Renderer.prepare(scene, camera, force?)` is the call that runs
`scene.updateMatrixWorld(true, true, force)` and
`camera.updateViewMatrix(true, false, force)`
(`src/renderers/Renderer.ts`). three.js updates matrices inside
`render()`; EASEL does not, and it has no `setAnimationLoop` or
`setPixelRatio`.

**Use when.**

- Before every `render` call, after any change to position, rotation,
  scale, parenting, animation, or controls.
- Before raycasting against moved nodes (see
  [picking](input-picking.md#raycast-picking)).

**Do not use when.**

- Never replace it with `camera.updateMatrixWorld()` alone. That leaves
  the scene's nodes and the camera's inverse view matrix stale.
- `force = true` rebuilds every matrix whether or not it is dirty. Pass it
  only after editing `matrix` or `matrixWorld` by hand.

**Example.**

```ts
export function drawFrame(
  renderer: Renderer,
  scene: Scene,
  camera: PerspectiveCamera,
): void {
  // render() reads prepared world matrices and camera.matrixWorldInverse;
  // prepare() is the only renderer call that rebuilds them.
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
}
```

Runnable: `assets/examples/frame-prepare.ts`.

**Cost removed.** The blank or stale frame. Local run on a 64x48 frame:
prepare + render drew 81 px of the box and render alone drew 0 px. After
moving the mesh, render alone changed 0 bytes and prepare + render
changed 360 bytes.

**Verify.**

1. `sh assets/examples/verify.sh examples` prints `PASS frame-prepare`.
1. In app code, `rg -n 'renderer\.render\(' src` finds a `prepare` call
   right before each hit.

## Camera options and lookAt

**Definition.** `PerspectiveCamera` takes one options object,
`{ fov = 45, aspect = 1, near = 0.1, far = 2000, tileSize = 1, zoom = 1 }`.
It has no `(fov, aspect, near, far)` overload.
`OrthographicCamera` also takes an object: `{ left, right, top, bottom,
near, far, tileSize, zoom }`. `Node.lookAt(x, y, z)` reads the eye
position from `matrixWorld`, not from `position` (`src/core/Node.ts`),
and it does not refresh that matrix first. three.js does refresh it.

**Use when.**

- Creating any camera.
- Calling `lookAt` right after changing `position`, before the first
  `prepare`.

**Do not use when.**

- The camera is already prepared and has not moved since. Then
  `matrixWorld` is current and the extra `updateMatrixWorld()` does
  nothing useful.

**Example.**

```ts
export function createCamera(width: number, height: number) {
  // One options object; there is no (fov, aspect, near, far) overload.
  const camera = new PerspectiveCamera({
    fov: 60,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(6, 0, 0);
  // lookAt() reads the eye position from matrixWorld, so refresh it first.
  camera.updateMatrixWorld();
  camera.lookAt(0, 0, 0);
  return camera;
}
```

Runnable: `assets/examples/camera-lookat.ts`.

**Cost removed.** A camera that aims from the origin. Local run: with a
camera at (6, 0, 0) aimed at a box at the origin, `updateMatrixWorld()`
then `lookAt` drew 49 px, and `lookAt` alone drew 0 px.

**Verify.**

1. `sh assets/examples/verify.sh examples` prints `PASS camera-lookat`.
1. `bun scripts/easel_api.ts show PerspectiveCameraOptions` prints the
   option fields.

## Resize

**Definition.** `renderer.setSize(width, height)` resizes the CPU
framebuffer and the canvas backing store (`canvas.width` and
`canvas.height`). It does not set the CSS size. The
`PerspectiveCamera.aspect` setter only stores the value; the projection
changes only when you call `camera.updateProjectionMatrix()`.

**Use when.**

- The canvas's rendered size or aspect ratio changes, for example in a
  `ResizeObserver` or a window `resize` handler.

**Do not use when.**

- Only the CSS size changes and the backing resolution should stay fixed,
  for example pixel art scaled with `image-rendering: pixelated`. CPU cost
  follows backing pixels, so leave `setSize` alone and change only the
  CSS.

**Example.**

```ts
export function resize(
  renderer: Renderer,
  camera: PerspectiveCamera,
  width: number,
  height: number,
): void {
  renderer.setSize(width, height); // framebuffer + canvas backing store
  camera.aspect = width / height; // the setter does not rebuild projection
  camera.updateProjectionMatrix();
}
```

Runnable: `assets/examples/resize.ts`.

**Cost removed.** A stretched image. Local run on a 128x64 frame: a unit
box measured 31 px wide with only the aspect setter, and 15 px wide after
`updateProjectionMatrix()`.

**Verify.**

1. `sh assets/examples/verify.sh examples` prints `PASS resize`.
1. After a resize, `renderer.domElement.width` equals the new width.

## Clear color and background precedence

**Definition.** `renderer.clearColor` is an accessor. It takes a `Color`
or a packed 24-bit integer, and any other number throws `RangeError`
("Renderer.clearColor must be a 24-bit integer."). There is no
`setClearColor` on `Renderer`. For each frame the clear color comes from
the first of these that is set:

1. `scene.fog.color`
1. `scene.background` (a `Color`, a packed number, or a ready `Texture`)
1. `renderer.clearColor`

**Use when.**

- Setting a backdrop color, or finding out why the background ignores
  `clearColor`.

**Do not use when.**

- A fog is present and you want a different backdrop. Fog color always
  wins, so match the backdrop to the fog color.

**Example.**

```ts
export function configureClear(renderer: Renderer, scene: Scene): void {
  // Accessor, not setClearColor(); packed 24-bit integer or Color.
  renderer.clearColor = 0x102030;
  // A scene background overrides the clear color; undefined falls back.
  scene.background = new Color(0x405060);
}
```

Runnable: `assets/examples/clear-color.ts`.

**Cost removed.** Calls to a method that does not exist, and backgrounds
that seem to ignore the clear color. Local run: the corner pixel was
`#102030` with only a clear color, `#405060` with a background, and
`#708090` with a fog.

**Verify.**

1. `sh assets/examples/verify.sh examples` prints `PASS clear-color`.
