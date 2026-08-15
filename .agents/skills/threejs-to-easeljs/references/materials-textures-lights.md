# Materials, textures, and lights

## Material mappings

| Three r185 material | EASEL 0.7.0 | Decision |
| --- | --- | --- |
| `MeshBasicMaterial` | `BasicMaterial` | Adapt color, base map, side, vertex colors, wireframe, depth flags, and discrete opacity. |
| `MeshLambertMaterial` | `LambertMaterial` | Adapt to baked flat or Gouraud diffuse lighting; emissive and extra source maps are not implied. |
| `MeshToonMaterial` | `ToonMaterial` | Adapt optional `gradientMap`; the CPU baked/interpolated response differs. |
| `LineBasicMaterial` | `LineMaterial` | Adapt to a positive integer framebuffer-pixel width. |
| `LineDashedMaterial` | `DashedLineMaterial` | Dash and gap are integer framebuffer pixels; phase restarts per logical segment. |
| `PointsMaterial` | `PointsMaterial` | `size` is a positive integer pixel radius, not Three's diameter and attenuation behavior. |
| `SpriteMaterial` | `SpriteMaterial` | The material surface exists; main-renderer Sprite drawing remains unestablished. |
| Standard, Physical, Phong, Matcap, Normal, Depth, Distance, Shadow, Shader, RawShader, TSL/node families | Basic, Lambert, Toon, geometry colors, or prebaked assets | Corresponding shader models are unsupported. |

Common CPU material fields are bounded: declared color/map, `transparent`, integer `opacity`, `depthTest`, `depthWrite`, `Shading.Flat` or `Shading.Gouraud`, side, layer, visibility, wireframe, and vertex colors. Inspect each concrete material declaration rather than assuming all fields occur on every family.

## Transparency and order

Three opacity is continuous alpha, with `0` transparent and `1` opaque. EASEL opacity is an integer amount of transparency, from `0` opaque through `8` fully transparent, and blending also requires `transparent: true`.

```ts
function easelOpacity(alpha: number): number {
  return Math.round((1 - Math.max(0, Math.min(1, alpha))) * 8);
}

const material = new EASEL.BasicMaterial({
  color: 0x44aaff,
  transparent: true,
  opacity: easelOpacity(sourceMaterial.opacity),
});
```

Target blending is fixed and discrete, not Three blend modes or equations. A transparent constructor defaults `depthWrite` to false unless set explicitly. Verify painter order, `layer`, `depthTest`, and `depthWrite` with intersecting and nested transparent surfaces.

Geometry RGB colors multiply material, texture, instance, and baked-light colors. Uniform faces retain the flat path. Verify the exact combination when source colors are normalized, encoded, or authored for shader output.

## Lights and fog

The target exports ambient, directional, hemisphere, point, spot, rect-area, and light-probe classes. `src/pipeline/shading/` and `src/pipeline/LightBaker.ts` implement baked flat or Gouraud lighting. There is no per-pixel Phong/PBR response, shadow map, source shadow camera, bias, radius, contact shadow, cookie, IES, or physical-energy workflow.

Inspect rect-area collection and baking for the required scene instead of assuming Three's area-light integration from the exported name.

Map fog with the target constructor shapes:

```ts
const linear = new EASEL.Fog({ color: 0x8899aa, near: 10, far: 100 });
const exp2 = new EASEL.FogExp2(0x8899aa, 0.02, 500);
```

Fog uses a finite lookup table and finite far bound. After changing parameters, call `fog.updateLut()` before a sample or render path that requires the refreshed table. The far bound participates in CPU culling, including exponential-squared fog. Fog color overrides the initial scene-background clear.

## Texture boundary

The verified raster path uses packed RGBA unsigned-byte pixels, nearest sampling, no mipmaps, anisotropy 1, and affine UV interpolation. Cached image sources clamp to at most 128×128. Repeat, mirrored-repeat, and clamp wrapping are implemented.

`Texture`, `DataTexture`, `CanvasTexture`, `VideoTexture`, and `FramebufferTexture` are exported. A stored field is not proof that the rasterizer consumes its transform or sampling meaning. Test exact texels, wrapping, updates, and UV output.

Inventory and redesign source use of:

- sRGB/linear color management, HDR framebuffer output, exposure, and tone mapping;
- mipmaps, linear/trilinear filters, anisotropic filtering, and compressed formats;
- cube, array, 3D, depth, multisample, and render-target textures;
- environment, reflection, refraction, PMREM, and image-based lighting;
- normal, bump, displacement, AO, light, emissive, roughness, metalness, specular, clearcoat, transmission, and thickness maps;
- UV channels beyond the verified sampler, transform matrices, and shader sampling.

`Scene.environment` plus environment/background intensity and rotation fields are retained data but ignored by the CPU renderer. Atlas UVs should target texel centers. Perspective texture warping is expected because interpolation is affine; accepted mitigations include geometry subdivision, UV changes, framing changes, or orthographic projection.
