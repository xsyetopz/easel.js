# Teardown and disposal

Cards for unmounting an EASEL scene. The application owns
`requestAnimationFrame`, the DOM listeners that controls install, and
every geometry, material, and texture. `Renderer.dispose()` releases only
its Canvas2D context, and it drops its canvas reference only when the
canvas is detached (`src/renderers/Renderer.ts`). The runnable files are
in `assets/examples/`. The tier is Executed under Bun with a stepped
`requestAnimationFrame` and a stub canvas that records listeners. Local
numbers come from `sh assets/examples/verify.sh examples` on macOS arm64
with Bun 1.4.2 and tsc 7.0.2.

## Contents

- Frame loop teardown
- Resource disposal ownership

## Frame loop teardown

**Definition.** Teardown does three things in order:

1. `cancelAnimationFrame` on the last stored handle.
1. `controls.dispose()`. `OrbitControls` adds `pointerdown`,
   `pointermove`, `pointerup`, `wheel`, and `contextmenu` listeners in its
   constructor, and `dispose()` removes them
   (`src/controls/OrbitControls.ts`).
1. Resource disposal, then `renderer.dispose()`.

`renderer.dispose()` does not cancel frames, remove listeners, or walk
the scene.

**Use when.**

- A React or Vue effect cleans up, on `pagehide`, on route changes, or
  on hot-module reloads.

**Do not use when.**

- You are only pausing. Cancel the frame and keep the renderer and
  resources, so resuming does not rebuild them.

**Example.**

```ts
export function mountScene(canvas: HTMLCanvasElement): () => void {
  const renderer = new Renderer({ width: 64, height: 48, canvas });
  const scene = new Scene();
  const camera = new PerspectiveCamera({ fov: 60, aspect: 64 / 48 });
  camera.position.set(0, 1, 4);
  const controls = new OrbitControls(camera, canvas); // adds DOM listeners
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new BasicMaterial({ color: 0x66ccff });
  scene.add(new Mesh(geometry, material));

  let handle = 0;
  const frame = () => {
    controls.update();
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
    handle = requestAnimationFrame(frame);
  };
  handle = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(handle); // renderer.dispose() does not stop rAF
    controls.dispose(); // removes pointer, wheel, and contextmenu listeners
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  };
}
```

Runnable: `assets/examples/teardown.ts`.

**Cost removed.** Frame loops and listeners that keep running after
unmount. They double up under React StrictMode and hot reloads. Local
run: 5 listener types were attached while mounted and 0 remained after
unmount; 1 frame was queued while mounted and 0 remained after.

**Verify.**

1. `sh assets/examples/verify.sh examples` prints `PASS teardown`.
1. Every `requestAnimationFrame` handle in app code has a matching
   `cancelAnimationFrame`, and every `new *Controls(` has a matching
   `.dispose()`.

## Resource disposal ownership

**Definition.** Each `dispose()` frees only its own object:

- `Geometry.dispose()` clears attributes, the index, the bounds, and the
  caches of that geometry object. Every mesh that shares the geometry is
  affected.
- `Material.dispose()` is a no-op and does not dispose `map`.
- `Texture.dispose()` drops its cached pixel data.

The scene does not track ownership, so dispose a resource only when no
remaining mesh uses it.

**Use when.**

- Removing meshes, replacing voxel chunks, or unloading a level.

**Do not use when.**

- Other meshes still use the geometry, material, or texture. Remove the
  mesh from the scene and keep the shared resource.

**Example.**

```ts
/** Removes a mesh and frees only what no other mesh still uses. */
export function removeMesh(
  scene: Scene,
  mesh: Mesh,
  stillUsed: (resource: object) => boolean,
): void {
  scene.remove(mesh);
  const { geometry, material } = mesh;
  if (geometry && !stillUsed(geometry)) geometry.dispose();
  if (material instanceof BasicMaterial && !stillUsed(material)) {
    // Material.dispose() does not free its map; dispose textures directly.
    if (material.map && !stillUsed(material.map)) material.map.dispose();
    material.dispose();
  }
}
```

Runnable: `assets/examples/disposal.ts`.

**Cost removed.** Meshes that break after a sibling is removed, and
texture memory that disposing the material never frees. Local run with
two meshes sharing one geometry:

- Both drew 180 px.
- After an ownership-aware removal, one mesh drew 90 px.
- After disposing the shared geometry anyway, the remaining mesh drew
  53 px, a corrupted partial render rather than a blank one.
- The texture kept its data after `material.dispose()` and lost it after
  `texture.dispose()`.

**Verify.**

1. `sh assets/examples/verify.sh examples` prints `PASS disposal`.
