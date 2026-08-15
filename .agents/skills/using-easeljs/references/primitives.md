# Primitives

Exports include:

- `Line`
- `LineLoop`
- `LineSegments`
- `LineMaterial`
- `DashedLineMaterial`
- `Points`
- `PointsMaterial`
- `Sprite`
- `SpriteMaterial`

Use lines for helpers, outlines, debug rays, or wire overlays. Use points for
sparse markers. Use sprites for billboard-like image/object markers where
package source confirms desired behavior.

Recipe:

```ts
const geometry = new EASEL.Geometry();
geometry.setPositions([0, 0, 0, 1, 0, 0]);
const line = new EASEL.LineSegments(
    geometry,
    new EASEL.LineMaterial({ color: 0xffffff }),
);
scene.add(line);
```

If constructor options for a line/points/sprite material are needed, inspect
`dist/materials/LineMaterial.d.ts`, `PointsMaterial.d.ts`, or object `.d.ts`
files.
