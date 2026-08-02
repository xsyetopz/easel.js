# Voxel worlds

Read this for visible-face meshing, opaque/transparent passes, chunk streaming,
replacement disposal, world offsets, and rebuild budgets. The full copyable
mesher is kept once at the
[voxel-world starter mesher](../assets/templates/voxel-world-starter/src/mesher.ts);
the excerpt below shows its public contract without duplicating that source.

## Contents

- [Voxel geometry and face visibility](#voxel-geometry-and-face-visibility)
- [Chunk streaming and replacement](#chunk-streaming-and-replacement)
- [Canonical mesher contract](#canonical-mesher-contract)

## Voxel geometry and face visibility

Practical EASEL.js voxel pattern:

- Build `Geometry` from visible block faces.
- Use one shared opaque atlas material and one shared transparent atlas
  material.
- Split transparent blocks into separate meshes/pass.
- Rebuild dirty chunks only.
- Cap rebuilds per frame.
- Dispose old chunk geometries when replacing meshes.

Chunk mesh add pattern:

```ts
const mesh = new EASEL.Mesh(geometry, material);
scene.add(mesh);
```

Offset positions before bounding sphere:

```ts
const attr = geometry.getAttribute("position");
if (attr) {
  const pos = attr.array as Float32Array;
  for (let i = 0; i < pos.length; i += 3) {
    pos[i] += offsetX;
    pos[i + 2] += offsetZ;
  }
  geometry.computeBoundingSphere();
}
```

Face visibility rule:

```ts
function shouldRenderFace(
  block: number,
  neighbor: number,
  isTransparent: (id: number) => boolean,
) {
  if (neighbor === 0) return true;
  if (isTransparent(block) && neighbor !== block) return true;
  if (!isTransparent(block) && isTransparent(neighbor)) return true;
  return false;
}
```

## Chunk streaming and replacement

Use this pattern for voxel worlds that stream, rebuild, and replace mesh chunks
incrementally.

Key patterns:

- Store chunk meshes in a `Map<string, Mesh>` keyed by chunk coordinate.
- Track loaded chunk keys separately from mesh instances.
- Build opaque and transparent sub-chunk geometry separately when alpha sorting
  matters.
- Remove old mesh from scene, dispose geometry, and delete map entry before
  replacement.
- Offset local geometry positions to world coordinates, then recompute bounding
  sphere.
- Limit chunk rebuilds per frame to keep CPU rasterization responsive.

Replacement recipe:

```ts
const old = meshes.get(key);
if (old) {
  scene.remove(old);
  old.geometry?.dispose();
  meshes.delete(key);
}
const mesh = new EASEL.Mesh(geometry, material);
meshes.set(key, mesh);
scene.add(mesh);
```

## Canonical mesher contract

The voxel-world starter exports `BlockWorld` and
`buildSimpleVoxelChunk(world, sizeX, sizeY, sizeZ): EASEL.Geometry`. It emits
positions, normals, UVs, and a 16/32-bit index buffer, computes a bounding
sphere, and uses `isTransparent` plus neighbor checks for face visibility. Copy
the complete implementation from the
[voxel-world starter mesher](../assets/templates/voxel-world-starter/src/mesher.ts)
instead of maintaining a second example copy.

```ts
export interface BlockWorld {
  getBlock(x: number, y: number, z: number): number;
  isTransparent(block: number): boolean;
  uvFor(
    block: number,
    face: number,
  ): [u0: number, v0: number, u1: number, v1: number];
}

export function buildSimpleVoxelChunk(
  world: BlockWorld,
  sizeX: number,
  sizeY: number,
  sizeZ: number,
): EASEL.Geometry;
```
