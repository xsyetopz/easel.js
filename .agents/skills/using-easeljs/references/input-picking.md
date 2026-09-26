# Input and picking

This card covers selecting objects under the pointer with EASEL's
`Raycaster`. The runnable file is in `assets/examples/`. The tier is
Executed under Bun with a stub canvas: a 320x180 backing store scaled by
CSS to 960x540. Local numbers come from
`sh assets/examples/verify.sh examples` on macOS arm64 with Bun 1.4.2 and
tsc 7.0.2.

## Raycast picking

**Definition.** `raycaster.setFromCamera({ x, y }, camera)` builds a ray
from normalized device coordinates, using the camera's `matrixWorld` and
`projectionMatrixInverse` (`src/core/Raycaster.ts`).
`intersectObject(object, recursive = true)` returns hits sorted by
distance, and it tests each mesh at its current `matrixWorld`. Neither
call updates matrices, so run `renderer.prepare(scene, camera)` first
when anything has moved. Compute normalized device coordinates from
`getBoundingClientRect()`, which gives the CSS size. Do not use
`canvas.width` and `canvas.height`, which give the backing-store size.

**Use when.**

- Clicking, hovering, or dragging needs the object under the pointer.

**Do not use when.**

- You need the grid cell in a voxel world. A grid DDA walk is cheaper
  than triangle tests and returns the cell and face directly; write one
  against your own block store.

**Example.**

```ts
export function pick(
  event: { clientX: number; clientY: number },
  canvas: HTMLCanvasElement,
  renderer: Renderer,
  scene: Scene,
  camera: PerspectiveCamera,
): Mesh | undefined {
  // CSS pixels -> normalized device coordinates; CSS size may differ from
  // the backing store (canvas.width/height).
  const rect = canvas.getBoundingClientRect();
  const ndc = {
    x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
    y: 1 - ((event.clientY - rect.top) / rect.height) * 2,
  };
  renderer.prepare(scene, camera); // camera and node matrices up to date
  const raycaster = new Raycaster();
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObject(scene, true)[0];
  return hit?.object instanceof Mesh ? hit.object : undefined;
}
```

Runnable: `assets/examples/picking.ts`.

**Cost removed.** Clicks that select the wrong object, or nothing. Local
run:

- A click over the box hit it, and a click beside it missed.
- Coordinates computed with `canvas.width` gave 0 hits.
- After the box moved, a ray cast at its old spot without `prepare` still
  hit it (2 hits). The prepared `pick` correctly missed.

**Verify.**

1. `sh assets/examples/verify.sh examples` prints `PASS picking`.
