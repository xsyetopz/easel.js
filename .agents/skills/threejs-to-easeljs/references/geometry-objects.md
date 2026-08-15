# Geometry and objects

## Copy a BufferGeometry

Read Three attributes through their getters so normalized attributes produce logical values. This helper covers channels used by the common EASEL mesh path:

```ts
function readAttribute(
  attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  components: 2 | 3,
): number[] {
  const values: number[] = [];
  for (let index = 0; index < attribute.count; index++) {
    values.push(attribute.getX(index), attribute.getY(index));
    if (components === 3) values.push(attribute.getZ(index));
  }
  return values;
}

function copyGeometry(source: THREE.BufferGeometry): EASEL.Geometry {
  const position = source.getAttribute("position");
  if (!position) throw new Error("position attribute is required");

  const target = new EASEL.Geometry().setPositions(readAttribute(position, 3));
  const normal = source.getAttribute("normal");
  if (normal) target.setNormals(readAttribute(normal, 3));
  const uv = source.getAttribute("uv");
  if (uv) target.setUVs(readAttribute(uv, 2));
  const color = source.getAttribute("color");
  if (color) target.setColors(readAttribute(color, 3));

  if (source.index) {
    const values = Array.from(source.index.array, Number);
    const max = values.reduce((current, value) => Math.max(current, value), 0);
    target.index = max > 65_535
      ? new Uint32Array(values)
      : new Uint16Array(values);
  }
  target.computeBoundingBox();
  target.computeBoundingSphere();
  return target;
}
```

In the current 0.7.0 checkout, index mutation uses the `index` property; `setIndex()` is not declared. Earlier repository revisions exposed `setIndex()`. These facts do not establish which declaration a consumer resolved. Check its installed package before editing the call form.

`Geometry` also provides `setTangents`, general attribute access, bounds, normals, transforms, draw range, morph metadata, clone/copy/JSON, non-indexed conversion, vertex merging, and disposal helpers. Audit the exact method and consumer before assigning parity.

## Channels and draw structure

The helper above is not sufficient when the source relies on:

- secondary UV or color channels, tangents, or custom attributes;
- normalized-integer precision, sparse accessors, or interleaved storage;
- geometry groups, material arrays, draw ranges, or non-triangle primitive modes;
- morph targets, skin indices/weights, dynamic updates, or dirty ranges;
- source index types or counts outside the target's verified path.

EASEL `Geometry`, `Attribute`, `InterleavedData`, and `InterleavedAttribute` are CPU typed-array structures, not GPU buffers. Do not add WebGL usage flags, upload callbacks, upload versions, or multi-range GPU update tracking.

A target `Mesh` accepts one `Material | undefined`. There is no automatic one-to-one path for Three geometry groups with material arrays. Split groups into target meshes or prebake the result, then verify sorting and transforms.

## Primitive geometries

EASEL exports the r185 core primitive names Box, Capsule, Circle, Cone, Cylinder, Dodecahedron, Edges, Extrude, Icosahedron, Lathe, Octahedron, Plane, Polyhedron, Ring, Shape, Sphere, Tetrahedron, Torus, TorusKnot, Tube, and Wireframe. It also exports `ConvexGeometry` and `ParametricGeometry`, which correspond to r185 add-on concepts.

Name equality does not establish constructor shape, defaults, validation, vertex order, UV layout, normals, segment topology, or winding. Inspect the owning target declaration and compare generated data for every primitive used by production assets.

## Rendered object paths

- `Mesh`, line subclasses, `Points`, and `InstancedMesh` have verified branches in the main scene traversal. Test each exact object/material pair.
- `InstancedMesh` stores transforms and colors and expands instances on the CPU. Benchmark representative counts and framebuffer sizes.
- `LOD` is exported and has explicit `update(camera)`. Do not assume the renderer invokes it; call and test the update contract required by the application.
- `Bone`, `Skeleton`, `SkinnedMesh`, morph attributes/influences, and related helpers are exported. Treat visible skin or morph deformation as `surface-only` until the main renderer consumer and asset path are established.
- `Sprite` and `SpriteMaterial` are exported, but the inspected main traversal does not establish an ordinary Sprite draw branch. Do not mark Sprite rendering `direct` from exports alone.
- r185 `BatchedMesh` and `ClippingGroup` have no verified target equivalents.

Rendering and raycasting are separate consumers. A type may expose `raycast` without a verified draw path, or draw without the precise intersection behavior a source project uses. Test meshes, lines, points, instances, sprites, and LOD separately where applicable.
