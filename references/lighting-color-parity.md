# Lighting and color parity with three.js r186

Status: implemented in 0.8.0. Every formula below is taken from
`node_modules/three/src` (r186).

## What three.js computes

- **Color input.** `Color.setHex(hex, colorSpace = SRGBColorSpace)` and
  `setStyle` decode sRGB to the linear working space. `Color.r/g/b` are
  linear; `getHex()`/`getStyle()` encode back to sRGB. `setRGB(r, g, b,
  colorSpace = workingColorSpace)` stores linear values unchanged.
- **Vertex colors** are used as linear values; no conversion.
- **Lambert direct light** (`lights_lambert_pars_fragment`):
  `directDiffuse += saturate(dot(N, L)) * light.color * diffuse / π`, where
  `light.color = color * intensity` (linear).
- **Indirect light**: ambient (`irradiance = color * intensity`) and
  hemisphere (`mix(ground, sky, 0.5 * dot(N, up) + 0.5)`) go through the same
  `diffuse / π` term. There is no ambient floor: an unlit Lambert surface is
  black plus emissive.
- **Point and spot falloff**: `1 / max(d^decay, 0.01)`, times
  `(saturate(1 - (d / distance)^4))^2` when `distance > 0` (already matched).
  Spot cone: `smoothstep(coneCos, penumbraCos, angleCos)`.
- **Output** (`meshlambert` fragment order): `opaque`, `tonemapping`
  (none by default), `colorspace` (linear → sRGB), then `fog`. Fog blends in
  the output space: `mix(encoded, fogColor, factor)`, and `fogColor` is
  converted to the output space first (`WebGLMaterials`), so a hex fog color
  blends as its sRGB value.
- **Textures** default to `NoColorSpace`: texels are used as linear values.
  `colorSpace = SRGBColorSpace` decodes texels to linear before lighting.
- **Unlit** (`MeshBasicMaterial`): `decode(hex)` is encoded again on output,
  so a hex color renders as that hex.

## Zero-overhead form

A change that makes any benchmark workload 1% or more slower does not ship.
Where an item below cannot meet that, EASEL keeps the closest zero-cost
approximation and documents it here.

- Fold `1/π` into each light's color once per frame (zero per-vertex cost).
- Remove the baker's constant ambient floor.
- Store `Color` linear, as three.js does; decode hex and CSS input once, at
  assignment.
- Bake lighting per vertex (flat or Gouraud) in linear space, and encode to
  sRGB inside the existing byte-conversion step (a lookup table replaces the
  scale and clamp), so the per-vertex cost does not grow.
- Textured fragments multiply the sRGB texel by the encoded vertex light.
  sRGB is close to a power curve, so `encode(t · c) ≈ encode(t) · encode(c)`;
  measure the error against three.js and record it.
- Convert texels once, when the 128x128 texture cache is built: keep
  `SRGBColorSpace` texels as they are, and encode `NoColorSpace` (linear)
  texels to sRGB, so the per-pixel multiply stays unchanged.
- Fog stays a blend in sRGB with the encoded fog color, as today.

## Acceptance

- A white `LambertMaterial` plane facing a `DirectionalLight(0xffffff, 1)`
  renders red 153, as three.js does; 0x808080 renders 74.
- An unlit `BasicMaterial(0x6699ff)` renders `0x6699ff`.
- Report the pixel-hash blast radius across the benchmark scenes and a
  before/after `bun run bench`; every workload stays within 1%.
- Implemented in 0.8.0: ports pass three.js light intensities and
  `colorSpace` settings verbatim; lighting scale and color management match
  r186.
