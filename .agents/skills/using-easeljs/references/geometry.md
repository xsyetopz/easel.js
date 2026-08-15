# Geometry

Built-in primitives and manual `Geometry` cover attributes, index buffers, UVs,
normals, and bounds.

## Built-in geometry

Built-in geometry exports in `@xsyetopz/easel@0.7.0`:

- `BoxGeometry`
- `CapsuleGeometry`
- `CircleGeometry`
- `ConeGeometry`
- `ConvexGeometry`
- `CylinderGeometry`
- `DodecahedronGeometry`
- `EdgesGeometry`
- `ExtrudeGeometry`
- `IcosahedronGeometry`
- `LatheGeometry`
- `OctahedronGeometry`
- `ParametricGeometry`
- `PlaneGeometry`
- `PolyhedronGeometry`
- `RingGeometry`
- `ShapeGeometry`
- `SphereGeometry`
- `TetrahedronGeometry`
- `TorusGeometry`
- `TorusKnotGeometry`
- `TubeGeometry`
- `WireframeGeometry`

Simple mesh:

```ts
const geometry = new EASEL.BoxGeometry(1, 1, 1);
const material = new EASEL.LambertMaterial({ color: 0xff8844 });
const mesh = new EASEL.Mesh(geometry, material);
scene.add(mesh);
```

When constructor parameters are needed, inspect the corresponding `.d.ts` file
under `dist/geometry/primitives/`.

## Manual geometry

`Geometry` stores vertex attributes and an optional triangle index buffer.

Public members:

- `setPositions(Float32Array | number[])`
- `setUVs(Float32Array | number[])`
- `setColors(Float32Array | number[])`
- `setNormals(Float32Array | number[])`
- `index`: assign `Uint16Array | Uint32Array | number[] | undefined`; read
  `Uint16Array | Uint32Array | undefined`
- `setFromPoints(points)`
- `getAttribute(name)`
- `hasAttribute(name)`
- `setAttribute(name, attribute)`
- `deleteAttribute(name)`
- `setDrawRange(start, count)`
- `computeVertexNormals()`
- `normalizeNormals()`
- `computeTangents()`
- `computeBoundingBox()`
- `computeBoundingSphere()`
- `dispose()`

`Geometry.index` is an accessor in 0.7.0 and the writable index-buffer API. A
`Uint16Array` or `Uint32Array` is retained directly. A plain `number[]` becomes
`Uint32Array` when any index exceeds 65,535 and `Uint16Array` otherwise;
`undefined` clears the index buffer and selects sequential vertices. This
accessor replaced the historical `setIndex()` method; index support remains
present.

The [manual triangle example](#complete-example-manual-triangle-mesh) assigns a
typed index buffer through the accessor.

Voxel face recipe:

- emit 4 vertices per face when UVs differ per face
- emit 6 indices per quad
- store normals per vertex
- compute bounding sphere after all offsets/mutations

```ts
indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
```

## Complete example: manual triangle mesh

```ts
import * as EASEL from "@xsyetopz/easel";

export function createTriangleMesh(): EASEL.Mesh {
	const geometry = new EASEL.Geometry();
	geometry.setPositions(new Float32Array([0, 1, 0, -1, -1, 0, 1, -1, 0]));
	geometry.setNormals(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]));
	geometry.setUVs(new Float32Array([0.5, 0, 0, 1, 1, 1]));
	geometry.index = new Uint16Array([0, 1, 2]);
	geometry.computeBoundingSphere();
	return new EASEL.Mesh(
		geometry,
		new EASEL.BasicMaterial({ color: 0xffcc00, side: EASEL.Side.Double }),
	);
}
```
