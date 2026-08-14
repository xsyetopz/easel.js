---
title: "Create geometry and materials"
description: "Build CPU vertex channels and choose a material that fits the rasterizer."
sidebar:
  order: 6
  label: "Geometry and materials"
---

Use a primitive such as [`BoxGeometry`](/docs/geometry/BoxGeometry/) for a
quick start, or construct a [`Geometry`](/docs/geometry/Geometry/) from named
[`Attribute`](/docs/geometry/Attribute/) channels. Positions, normals, UVs,
colors, and optional indices are regular typed-array data; there is no GPU
buffer upload lifecycle.

```ts
const geometry = new EASEL.Geometry();
geometry.setAttribute(
  "position",
  new EASEL.Attribute(
    [
      -0.5, -0.5, 0,
      0.5, -0.5, 0,
      0, 0.5, 0,
    ],
    3,
  ),
);
```

Choose a material based on the CPU shading path:

- [`BasicMaterial`](/docs/materials/BasicMaterial/) uses a solid or textured
  color without lighting.
- [`LambertMaterial`](/docs/materials/LambertMaterial/) bakes diffuse lighting
  on the CPU.
- [`ToonMaterial`](/docs/materials/ToonMaterial/) uses stepped Gouraud shading
  and an optional gradient map.
- Line, point, and sprite materials target their corresponding rasterizer
  primitives.

Material opacity is intentionally discrete. Transparent objects depend on
sorted draw order, and changing depth writes can change how overlapping
fragments appear.

## Related API

- [Geometry](/docs/geometry/Geometry/)
- [Attribute](/docs/geometry/Attribute/)
- [Mesh](/docs/objects/Mesh/)
- [Material](/docs/materials/Material/)
- [LambertMaterial](/docs/materials/LambertMaterial/)

## Try an example

[Browse geometry and material examples](/examples/).
