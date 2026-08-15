# Scene and cameras

## Scene graph

`Scene` is the render root; `Group`, cameras, lights, and renderable objects
extend `Node`. High-use node state includes `uuid`, `name`, `userData`,
`parent`, `children`, `position`, `rotation`, `quaternion`, `scale`, `pivot`,
`matrix`, `matrixWorld`, `matrixAutoUpdate`, `matrixWorldAutoUpdate`,
`matrixWorldNeedsUpdate`, `visible`, `frustumCulled`, and `layers`.

Hierarchy methods include `add(...nodes)`, `remove(...nodes)`, `clear()`,
`removeFromParent()`, `attach(node)`, traversal/lookups, transform helpers,
`updateMatrix()`, and `updateMatrixWorld(updateParents?, updateChildren?,
force?)`.

```ts
const scene = new EASEL.Scene();
const root = new EASEL.Group();
root.add(mesh);
scene.add(root);
```

`Scene.background` accepts `Color | number | Texture | undefined`; `fog` accepts
`Fog | undefined`. Environment and override-material fields are retained scene
data, but environment/PBR state is ignored by the CPU renderer.

## Camera choices

- `PerspectiveCamera`: normal depth perspective; supports fov, aspect, zoom,
  lens/film accessors, and sub-frustum view offsets.
- `OrthographicCamera`: parallel projection; supports frustum edges, zoom, and
  view offsets.
- `ArrayCamera`: perspective camera plus a predefined `arrayCameras` collection.
- `StereoCamera`: helper holding left/right perspective cameras; call
  `stereo.update(sourceCamera)` before using its eye cameras.
- `Camera`: shared base. Use a concrete camera for rendering.

```ts
const camera = new EASEL.PerspectiveCamera({
  fov: 60,
  aspect: width / height,
  near: 0.1,
  far: 100,
  zoom: 1,
});
camera.position.set(2, 2, 4);
camera.updateMatrixWorld(false, false, true);
camera.lookAt(0, 0, 0);
camera.updateMatrix();
```

```ts
const camera = new EASEL.OrthographicCamera({
  left: -5,
  right: 5,
  top: 5,
  bottom: -5,
  near: 0.1,
  far: 100,
  zoom: 1,
});
```

After changing fov, aspect, frustum edges, zoom, film offset, or view offset,
call `updateProjectionMatrix()` unless the invoked setter method documents that
it already rebuilds projection.

## Preparation, resize, and picking

The camera owns prepared `projectionMatrix`, `projectionMatrixInverse`, and
`matrixWorldInverse`. Coordinate changes do not make `render()` rebuild them:

```ts
controls.update();
renderer.prepare(scene, camera);
renderer.render(scene, camera);
```

Resize perspective projection:

```ts
renderer.setSize(width, height);
camera.aspect = width / height;
camera.updateProjectionMatrix();
```

Public perspective and orthographic cameras satisfy `RaycastCamera` directly:

```ts
renderer.prepare(scene, camera);
raycaster.setFromCamera(ndc, camera);
const hits = raycaster.intersectObject(scene, true);
```

No structural inverse-projection adapter is needed in 0.7.0.
