# three.js r186 example mirror: status and blockers

Recorded 2026-09-26. The website mirrors three.js r186 examples; each page runs
the three.js original on WebGL beside the EASEL port on Canvas2D and lists every
difference. EASEL ids replace the upstream `webgl_` prefix with `canvas_` and
keep the upstream id in `meta.upstream`. `www/examples/registry.ts` is the
source of truth for what is mirrored. Ids below are three.js ids.

## Triage of the 338 WebGL, audio, physics, and misc examples

| Group | Count | Status |
| --- | --- | --- |
| Imports resolved by EASEL exports | 16 | Mirrored |
| Near: at most two missing names | 65 | 28 mirrored; 36 blocked; 1 not feasible |
| Larger gaps | 30 | Not triaged by source yet |
| GPU-only core (shadow maps, PBR, shaders, post-processing) | 227 | Outside the Canvas2D design |

The first split came from matching each example's `THREE.*` names and add-on
imports against EASEL's root exports. The near group was then re-triaged by
reading each example's source.

## Blocked near examples and the EASEL API each needs

Adding any of these is library work under the parity rules in
`CONTRIBUTING.md`, not an example port.

| API | Examples it unblocks |
| --- | --- |
| `ColladaLoader` (with `KMZLoader`) | `webgl_loader_collada`, `webgl_loader_collada_kinematics`, `webgl_loader_collada_skinning`, `webgl_loader_kmz` |
| Morph-target blending in the renderer, and glTF morph loading | `webgl_morphtargets`, `webgl_buffergeometry_lines`, `webgl_morphtargets_horse` |
| `Renderer.setViewport`, `setScissor`, `setScissorTest`, `clear` | `webgl_camera`, `webgl_multiple_views`, `webgl_multiple_elements_text` |
| Rendering `InterleavedAttribute` | `webgl_buffergeometry_instancing_interleaved`, `webgl_buffergeometry_points_interleaved` |
| `Material.blending` and blending constants (with point `map` sampling) | `webgl_materials_blending`, `webgl_points_sprites` |
| Material arrays with `Geometry.addGroup` (with `ExtrudeGeometry` `extrudePath`) | `webgl_panorama_cube`, `webgl_geometry_extrude_shapes` |
| `Renderer.autoClear`, `clear`, `clearDepth` | `webgl_sprites` |
| Texture `offset`, `repeat`, `center`, `rotation` in the rasterizer | `webgl_materials_texture_rotation` |
| `FontLoader` | `webgl_geometry_text_shapes` |
| `SVGLoader.pointsToStroke`, `getStrokeStyle` | `webgl_geometry_text_stroke` |
| Clipping planes | `webgl_clipping_intersection` |
| Exporting `VertexNormalsHelper`, `VertexTangentsHelper` | `webgl_helpers` |
| One add-on each: `AsciiEffect`, CurveExtras, `MeshSurfaceSampler`, `GeometryUtils.hilbert3D`, `Rhino3dmLoader`, `TDSLoader`, `ThreeMFLoader`, `AMFLoader`, `FBXLoader`, Draco and AVIF glTF, TIFF LZW and JPEG, `VRMLLoader`, `SimplifyModifier`, `ShadowMesh` | One example each |

Not feasible: `webgl_materials_normalmap_object_space`, whose subject is an
object-space normal map.

## Parity decisions the ports surfaced

The ports record these as differences. Each needs a decision before the
library changes, because each alters documented or relied-on behavior.

- Lighting scale: resolved in 0.8.0; ports pass three.js light intensities
  verbatim, matching r186.
- Color management: resolved in 0.8.0; ports restore three.js `colorSpace`
  settings verbatim, matching r186.
- Controls: `MapControls` pans opposite to three.js and cannot rotate with the
  right button. `OrbitControls` pans with the middle button where three.js
  dollies. `TrackballControls` is a pole-clamped orbit. No control handles
  multi-touch or key events.
- `Side.Double` back faces are lit with the front normal; fixing it costs a
  second lighting bake per double-sided mesh.
- `Raycaster` skips invisible nodes; three.js r186 tests them.
- `BoxHelper` builds only on `update()`, `TorusGeometry` lies around the Y axis,
  `LOD` has no `autoUpdate`, and `EllipseCurve` runs clockwise arcs from the end
  angle. These are documented as intentional.
- `TorusKnotGeometry` rings run opposite to three.js, although the ledger lists
  its constructor as matching.

## Assets

Every asset is byte-identical to three.js r186 or recorded as a substitute, with
its license in `assets/README.md`. Assets with unknown or non-commercial terms
were not copied: `I.nrrd`, `male02`, `pirouette.bvh`, the Flickr panorama, the
`webaudio` tracks, `earth_atmos_2048.jpg`, `tiger.svg`, `emoji.svg`,
`blueprint.svg`, and the CC BY-SA SVG test files. `Project_Utopia.mp3` is CC0
but was not added, so `webaudio_sandbox` uses generated audio for it.
