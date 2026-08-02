# Geometry

Read this for built-in primitive constructors or manual attributes, indices,
UVs, normals, and bounding spheres.

## Built-in geometry

Built-in geometry exports in `@xsyetopz/easel@0.6.1`:

- `BoxGeometry`
- `CapsuleGeometry`
- `ConeGeometry`
- `CylinderGeometry`
- `DodecahedronGeometry`
- `EdgesGeometry`
- `ExtrudeGeometry`
- `IcosahedronGeometry`
- `LatheGeometry`
- `OctahedronGeometry`
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

`Geometry` stores vertex attributes and an optional triangle index.

Public methods:

- `setPositions(Float32Array | number[])`
- `setUVs(Float32Array | number[])`
- `setColors(Float32Array | number[])`
- `setNormals(Float32Array | number[])`
- `setIndex(Uint16Array | Uint32Array | number[])`
- `getAttribute(name)`
- `setAttribute(name, attribute)`
- `deleteAttribute(name)`
- `computeVertexNormals()`
- `computeBoundingSphere()`
- `dispose()`

For a complete manual triangle function, use the
[manual geometry example](#complete-example-manual-triangle-mesh) below.

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
	geometry.setIndex(new Uint16Array([0, 1, 2]));
	geometry.computeBoundingSphere();
	return new EASEL.Mesh(
		geometry,
		new EASEL.BasicMaterial({ color: 0xffcc00, side: EASEL.Side.Double }),
	);
}
```
