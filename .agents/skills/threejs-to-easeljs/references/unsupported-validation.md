# Unsupported behavior and validation

## Hard CPU renderer boundaries

The main target remains a CPU scanline rasterizer that uploads `ImageData` to Canvas2D. It supports perspective and orthographic cameras, CPU depth testing for opaque fragments, sorted draw order and layering for transparent materials, baked flat or Gouraud lighting, affine UV interpolation, nearest normalized texel sampling, and bounded textures.

Create explicit design rows for these source behaviors:

| Source behavior | Target decision |
| --- | --- |
| WebGL/WebGPU context or device, shader chunks, uniforms, GLSL/WGSL, TSL/node graphs, GPU compute, transform feedback | Remove or retain a separate backend. CPU attributes and materials are not shader translations. |
| Render targets, cube targets, MRT, depth/stencil textures, readback, viewport/scissor composition | Redesign ownership around one CPU framebuffer or retain the source backend. |
| `EffectComposer`, render or shader passes, bloom, SSAO/GTAO/SSR, TAA/SMAA/FXAA, depth-of-field | Use an application-owned Canvas2D/readback step, prebake, omit, or retain the source backend; measure the chosen path. |
| Standard, Physical, Phong, Matcap, Normal, Depth, Distance, Shadow, Shader, RawShader, and node materials | Choose Basic, Lambert, or Toon plus geometry colors or baked assets. Record the lost response. |
| Shadows, CSM, contact shadows, cookies, light maps | Bake into geometry, colors, or textures, add explicit geometry, omit, or retain another backend. |
| Environment maps, PMREM, reflections, refractions, IBL | Bake or omit. Stored `Scene.environment` is ignored by the main renderer. |
| Continuous alpha and custom/additive/multiply blend equations | Quantize to nine transparency levels and validate sorted overlaps, or redesign. |
| Perspective-correct texture interpolation | Accept affine warp, subdivide geometry, change UVs/framing, or use orthographic projection. |
| Cube/3D/array/compressed textures, mipmaps, linear filtering, anisotropy above 1, HDR framebuffer output | Convert and prebake to the supported CPU texture path, or retain another backend. |
| XR, GPU particles, water, sky, reflector, and shader-driven simulations | Retain another backend or design bounded CPU geometry and animation. |

Do not represent these decisions as target compatibility flags. Use `unsupported` only when inspected target evidence establishes the boundary; otherwise record `UNKNOWN` and the missing evidence.

## Port sequence

Keep failures attributable by porting in this order:

1. canvas, renderer, one camera, one Basic mesh, resize, and teardown;
2. hierarchy, transforms, layers, and representative perspective and orthographic views;
3. each geometry, object, and material pair, including transparent overlap;
4. each production texture class and format plus fog/background combinations;
5. lights and the accepted baked-look differences;
6. every loader asset family, dependency, malformed input, and failure path;
7. animation clips and bindings, controls, and pointer picking;
8. DOM renderers, audio, physics, and framework mount/unmount;
9. exporters and downstream parse or round-trip checks;
10. complete-scene CPU frame time and peak memory at the chosen resolution.

Typecheck each slice before adding the next, but do not promote it to visual or behavioral evidence.

## Acceptance evidence

Collect:

- target typecheck and focused unit/integration tests;
- at least one real browser `HTMLCanvasElement` frame rather than only Node imports;
- stable pixel probes or golden screenshots for representative views;
- framebuffer resize, CSS scaling, and pointer-coordinate tests;
- deterministic animation checkpoints and control interactions;
- transparency ordering, depth flags, discrete opacity, and fog/background precedence;
- loader success, malformed input, missing dependency, cancellation where supported, and disposal;
- exporter downstream parse, round-trip, or reader evidence;
- CPU frame timing at the selected internal resolution and peak asset memory;
- a written list of untested browsers, asset variants, features, visual differences, and performance cases marked `UNVERIFIED`.

## Completion gate

A migration is complete only when:

- source package, runtime revision, declaration source, add-on paths, asset variants, runtime, and browser support are recorded;
- every import and relied-on non-default behavior has a status, target anchor, consequence, proof, and result;
- representative browser frames, interactions, assets, resize, ordering, animation, disposal, and performance are verified or explicitly `UNVERIFIED`;
- accepted visual and performance changes are recorded;
- unsupported GPU, PBR, postprocessing, shadow, texture, and XR behavior has not been described as parity.

Matching names never close the ledger. Missing evidence remains `UNKNOWN`; tests not run remain `UNVERIFIED`.
