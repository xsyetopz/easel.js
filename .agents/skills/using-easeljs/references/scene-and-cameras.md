# Scene and cameras

Read this for scene graph ownership, transforms, camera construction, orbit
math, and resize projection updates.

## Contents

- [Scene graph and transforms](#scene-graph-and-transforms)
- [Cameras, controls, and resize](#cameras-controls-and-resize)
- [Complete example: orbit camera synchronization](#complete-example-orbit-camera-synchronization)

## Scene graph and transforms

EASEL.js uses a scene graph. `Scene` is the root. Most renderable or container
objects extend `Node`.

`Node` public surface includes:

- identity: `id`, `name`, `type`, `userData`
- hierarchy: `parent`, `children`, `add`, `remove`, `traverse`,
  `traverseVisible`
- transforms: `position`, `rotation`, `quaternion`, `scale`, `lookAt`,
  `updateMatrix`, `updateMatrixWorld`
- visibility/culling: `visible`, `frustumCulled`, `layers`
- matrices: `matrix`, `matrixWorld`, `autoUpdateMatrix`,
  `matrixWorldAutoUpdate`, `matrixWorldNeedsUpdate`

Common object graph:

```ts
const scene = new EASEL.Scene();
const root = new EASEL.Group();
const mesh = new EASEL.Mesh(geometry, material);
root.add(mesh);
scene.add(root);
scene.updateMatrixWorld();
```

Transform recipe:

```ts
node.position.set(x, y, z);
node.rotation.y = Math.PI / 4;
node.scale.set(1, 2, 1);
node.updateMatrixWorld();
```

`Scene` adds:

- `autoUpdate: boolean`
- `fog: Fog | undefined`
- `background: Color | number | Texture | undefined`

`scene.background` can be a color/hex value or a ready `Texture`. A texture
background is sampled in screen space and stretched to the framebuffer with
nearest-neighbor sampling. If `scene.fog` is set, fog color takes precedence
over the background texture or color for the initial clear.

Use `scene.updateMatrixWorld()` before render when mutating transforms manually.
The renderer can update scene world matrices when `Scene.autoUpdate` is true,
but explicit update keeps examples predictable.

## Cameras, controls, and resize

Public camera exports:

- `PerspectiveCamera`
- `OrthographicCamera`
- `OrbitControls`

Perspective constructor:

```ts
new EASEL.PerspectiveCamera({ fov?: number, aspect?: number, near?: number, far?: number, tileSize?: number })
```

Orthographic constructor:

```ts
new EASEL.OrthographicCamera({ left?: number, right?: number, top?: number, bottom?: number, near?: number, far?: number, tileSize?: number })
```

For orbit math without `OrbitControls`, use the complete composable function in
the [orbit camera example](#complete-example-orbit-camera-synchronization)
below. Keep the camera target and distance in application state.

Resize recipe:

```ts
renderer.setSize(width, height);
camera.aspect = width / height;
camera.updateProjectionMatrix();
```

## Complete example: orbit camera synchronization

```ts
import type * as EASEL from "@xsyetopz/easel";

export function syncOrbitCamera(
	camera: EASEL.PerspectiveCamera,
	target: EASEL.Vector3,
	azimuth: number,
	elevation: number,
	distance: number,
): void {
	const cosElev = Math.cos(elevation);
	const x = target.x + distance * cosElev * Math.sin(azimuth);
	const y = target.y + distance * Math.sin(elevation);
	const z = target.z + distance * cosElev * Math.cos(azimuth);
	camera.position.set(x, y, z);
	camera.lookAt(target);
}
```
