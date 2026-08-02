# Picking and input

Read this for DOM pointer-to-canvas scaling, camera ray construction, public
`Raycaster` intersections, and voxel-cell DDA picking. DDA returns the first
non-air tile and face normal directly; cap its distance for predictable CPU
work.

## Contents

- [Pointer coordinates and object picking](#pointer-coordinates-and-object-picking)
- [Pointer and grid patterns](#pointer-and-grid-patterns)
- [Complete voxel DDA implementation](#complete-voxel-dda-implementation)

## Pointer coordinates and object picking

Pointer coordinate scaling:

```ts
const rect = canvas.getBoundingClientRect();
const scaleX = canvas.width / rect.width;
const scaleY = canvas.height / rect.height;
const x = (event.clientX - rect.left) * scaleX;
const y = (event.clientY - rect.top) * scaleY;
```

`Raycaster` supports object intersection from a camera using normalized device
coordinates:

```ts
const ndc = { x: (x / canvas.width) * 2 - 1, y: 1 - (y / canvas.height) * 2 };
const raycaster = new EASEL.Raycaster();

// Raycaster needs the inverse projection matrix; build the structural camera
// adapter because the public Camera classes do not expose that inverse.
camera.updateMatrixWorld();
const rayCamera = {
    type: camera.type,
    matrixWorld: camera.matrixWorld,
    projectionMatrixInverse: new EASEL.Matrix4()
        .copy(camera.projectionMatrix)
        .invert(),
    isOrthographic: camera.type === "OrthographicCamera",
};
raycaster.setFromCamera(ndc, rayCamera);
const hits = raycaster.intersectObject(scene, true);
```

Do not pass a public `PerspectiveCamera` or `OrthographicCamera` instance
directly: `setFromCamera` accepts a structural `RaycastCamera` containing
`type`, `matrixWorld`, and `projectionMatrixInverse`.

Voxel worlds often use custom DDA picking instead of mesh triangle picking.
Recipe:

1. Convert pointer to camera ray.
2. Step through voxel cells along ray.
3. Return first non-air cell and hit face normal.
4. Limit max distance.

The complete DDA implementation is included below.

## Pointer and grid patterns

Use this pattern when DOM pointer events drive camera control, object selection,
or voxel tile targeting.

Patterns:

- Pointer down/move/up drives drag state.
- Wheel delta changes orbit distance.
- Keyboard input can rotate orbit cameras or move focus independently from
  pointer state.
- Click coordinates are scaled from CSS pixels into canvas backing-store pixels.
- Tile picking uses custom DDA raycast through voxel grids when grid cell and
  face normal are required.

Use the CSS-to-backing-store scaling recipe above for both object and voxel
input. DDA picking is preferred for voxel tile targeting because it returns grid
cell and face normal directly.

## Complete voxel DDA implementation

This standalone implementation covers the full grid-picking path. It imports
only public root types and can be copied into a browser scene.

```ts
import type * as EASEL from "@xsyetopz/easel";

export interface TileHit {
    tileX: number;
    tileY: number;
    tileZ: number;
    faceNx: number;
    faceNy: number;
    faceNz: number;
}

export interface VoxelWorld {
    camera?: EASEL.PerspectiveCamera;
    getBlock(x: number, y: number, z: number): number;
}

interface GridCursor {
    ix: number;
    iy: number;
    iz: number;
}

interface StepDirection {
    x: number;
    y: number;
    z: number;
}

interface RayTiming {
    deltaX: number;
    deltaY: number;
    deltaZ: number;
    maxX: number;
    maxY: number;
    maxZ: number;
    distance: number;
}

interface FaceNormal {
    x: number;
    y: number;
    z: number;
}

export function raycastVoxels(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    world: VoxelWorld,
    maxDistance = 64,
): TileHit | undefined {
    const cursor = createGridCursor(ox, oy, oz);
    const step = createStepDirection(dx, dy, dz);
    const timing = createRayTiming(cursor, ox, oy, oz, dx, dy, dz);
    const normal = { x: 0, y: 0, z: 0 };
    while (timing.distance < maxDistance) {
        if (world.getBlock(cursor.ix, cursor.iy, cursor.iz) !== 0) {
            return createTileHit(cursor, normal);
        }
        advanceRay(cursor, step, timing, normal);
    }
    return undefined;
}

function createGridCursor(ox: number, oy: number, oz: number): GridCursor {
    return { ix: Math.floor(ox), iy: Math.floor(oy), iz: Math.floor(oz) };
}

function createStepDirection(
    dx: number,
    dy: number,
    dz: number,
): StepDirection {
    return { x: Math.sign(dx), y: Math.sign(dy), z: Math.sign(dz) };
}

function createRayTiming(
    cursor: GridCursor,
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
): RayTiming {
    return {
        deltaX: axisDelta(dx),
        deltaY: axisDelta(dy),
        deltaZ: axisDelta(dz),
        maxX: axisMax(cursor.ix, ox, dx),
        maxY: axisMax(cursor.iy, oy, dy),
        maxZ: axisMax(cursor.iz, oz, dz),
        distance: 0,
    };
}

function axisDelta(direction: number): number {
    return direction === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / direction);
}

function axisMax(cell: number, origin: number, direction: number): number {
    if (direction > 0) return (cell + 1 - origin) / direction;
    if (direction < 0) return (origin - cell) / -direction;
    return Number.POSITIVE_INFINITY;
}

function advanceRay(
    cursor: GridCursor,
    step: StepDirection,
    timing: RayTiming,
    normal: FaceNormal,
): void {
    if (timing.maxX < timing.maxY && timing.maxX < timing.maxZ) {
        advanceX(cursor, step, timing, normal);
    } else if (timing.maxY < timing.maxZ) {
        advanceY(cursor, step, timing, normal);
    } else {
        advanceZ(cursor, step, timing, normal);
    }
}

function advanceX(
    cursor: GridCursor,
    step: StepDirection,
    timing: RayTiming,
    normal: FaceNormal,
): void {
    timing.distance = timing.maxX;
    cursor.ix += step.x;
    timing.maxX += timing.deltaX;
    setNormal(normal, step.x, 0, 0);
}

function advanceY(
    cursor: GridCursor,
    step: StepDirection,
    timing: RayTiming,
    normal: FaceNormal,
): void {
    timing.distance = timing.maxY;
    cursor.iy += step.y;
    timing.maxY += timing.deltaY;
    setNormal(normal, 0, step.y, 0);
}

function advanceZ(
    cursor: GridCursor,
    step: StepDirection,
    timing: RayTiming,
    normal: FaceNormal,
): void {
    timing.distance = timing.maxZ;
    cursor.iz += step.z;
    timing.maxZ += timing.deltaZ;
    setNormal(normal, 0, 0, step.z);
}

function setNormal(normal: FaceNormal, x: number, y: number, z: number): void {
    normal.x = x;
    normal.y = y;
    normal.z = z;
}

function createTileHit(cursor: GridCursor, normal: FaceNormal): TileHit {
    return {
        tileX: cursor.ix,
        tileY: cursor.iy,
        tileZ: cursor.iz,
        faceNx: -normal.x,
        faceNy: -normal.y,
        faceNz: -normal.z,
    };
}
```
