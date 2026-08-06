# External/non-GPU three.js example parity matrix

**Audit date:** 2026-08-05  
**Source:** official three.js `dev` branch, checked out at `/tmp/three-dev-audit.AMgaAE` (the source URLs below point to the moving `dev` branch; pin a commit before implementation).  
**Target:** EASEL.js 0.7.0 CPU scanline rasterizer + browser APIs.  
**Current registry check:** `www/examples/registry.ts` contains exact routes for the controls, DOM/CSS, game, WebAudio, SVG, loader, exporter, physics, and five WebXR input/session IDs listed below, plus `webgpu_camera`, the nine CPU/browser media routes (`webgl_materials_video`, `webgl_materials_video_webcam`, `webgpu_materials_video`, `webgpu_video_frame`, `webgpu_video_panorama`, `webgl_video_kinect`, `webgl_morphtargets_webcam`, `webgl_video_panorama_equirectangular`, `webgl_worker_offscreencanvas`), and the additional physics routes (`physics_rapier_terrain`, `physics_rapier_vehicle_controller`, `physics_ammo_instancing`, `physics_ammo_terrain`, `physics_jolt_instancing`, `physics_ammo_break`, `physics_ammo_cloth`, `physics_ammo_rope`, `physics_ammo_volume`). All other exact external IDs below remain backlog candidates. The matrix is a campaign backlog, not a claim of pixel identity.

## Boundary used

* **Candidate:** implement the application-facing behavior with CPU geometry, Canvas2D, SVG/DOM, Web Audio, CPU/WASM physics, format parsers/serializers, or ordinary browser input APIs. EASEL's `Renderer` remains Canvas2D; route IDs must remain the exact upstream IDs (`webgl_*`, `webgpu_*`, etc.).
* **Conditional:** implement the parser/browser part only when a CPU decoder/conversion is available; remove or replace GPU material semantics. A compressed texture may be decoded to RGBA on the CPU, but an opaque GPU-only transcode/render path is not a parity implementation.
* **Excluded:** the defining behavior requires WebGL/WebGPU renderer state, shaders/TSL, compute, render targets/readback, postprocessing, shadow maps, environment/PMREM/PBR, XR frame submission, or a device API with no non-device fallback. A source page may still supply a small non-GPU sub-example (for example, video capture), but must not advertise the GPU result as complete.

## Candidate matrix

### CSS2D/CSS3D DOM overlays (8 exact IDs)

Official renderer modules: [CSS2DRenderer](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/renderers/CSS2DRenderer.js), [CSS3DRenderer](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/renderers/CSS3DRenderer.js).  Implement as an EASEL scene plus an absolutely positioned DOM/SVG overlay owned by the example; do not add CSS objects to the Canvas2D rasterizer.

| Exact ID | Official source requirements/assets | EASEL path | Boundary |
|---|---|---|---|
| `css2d_label` | `OrbitControls`, `lil-gui`; `textures/planets/{earth_atmos_2048.jpg,earth_normal_2048.jpg,earth_specular_2048.jpg,moon_1024.jpg}` | Add a `CSS2DObject`-equivalent DOM label anchored from projected node coordinates; use EASEL sphere/material for Earth/moon and a resize/update hook. | CSS2D label stays DOM; no WebGL canvas. |
| `css3d_mixed` | `CSS3DRenderer`, `OrbitControls`; DOM/CSS panels | Project EASEL meshes and overlay HTML elements with a shared camera transform; CSS3D is an overlay contract, not a rasterizer node. | CSS3D transforms are not drawn into `ImageData`. |
| `css3d_molecules` | `CSS3DRenderer`, `TrackballControls`, `PDBLoader`, `lil-gui`; PDB molecule data and `textures/sprites/ball.png` | Add CPU PDB parser (or use a browser parser) and DOM atom/bond overlay; EASEL line/point scene can provide a Canvas2D fallback. | DOM overlay required; no GPU renderer. |
| `css3d_orthographic` | `CSS3DRenderer`, `OrbitControls`, `lil-gui`; DOM elements | Shared orthographic projection and DOM overlay; EASEL provides the geometric backdrop. | DOM/CSS only. |
| `css3d_periodictable` | `CSS3DRenderer`, `TrackballControls`, `tween.module.js`; generated periodic table DOM | DOM table + tweened camera/object transforms; no asset decoder needed. | DOM/CSS only. |
| `css3d_sandbox` | `CSS3DRenderer`, `TrackballControls`, `lil-gui`; generated DOM/CSS scene | DOM sandbox layer plus EASEL projected anchors; define cleanup of inserted nodes. | DOM/CSS only. |
| `css3d_sprites` | `CSS3DRenderer`, `TrackballControls`, `tween.module.js`; `textures/sprite.png` | DOM sprite elements (or EASEL `Sprite` fallback) with camera-facing projected transforms. | CSS sprite semantics stay overlay; EASEL opacity is discrete. |
| `css3d_youtube` | `CSS3DRenderer`, `TrackballControls`; YouTube iframe/embed | DOM iframe overlay and EASEL scene controls. | External media/DOM; no GPU video texture requirement. |

### Controls and browser input (7 new exact IDs; `misc_controls_orbit` already registered)

Official modules: [controls directory](https://github.com/mrdoob/three.js/tree/dev/examples/jsm/controls). Implement controls against EASEL cameras/nodes and `globalThis` event listeners; each control must expose `update()` and `dispose()` and preserve camera resize behavior.

| Exact ID | Official source requirements/assets | EASEL path | Boundary |
|---|---|---|---|
| `misc_controls_arcball` | `ArcballControls`, `OBJLoader`, `HDRLoader`, `lil-gui`; `models/obj/cerberus/*`, `textures/equirectangular/venice_sunset_1k.hdr` | Implement Arcball rotation/pan/zoom over EASEL camera; OBJ parser is a separate loader candidate. Use flat/Lambert materials and a regular image/solid backdrop instead of HDR environment. | HDR environment/PMREM and PBR look are excluded; control itself is candidate. |
| `misc_controls_drag` | `DragControls`; generated meshes | Pointer hit test (`Raycaster`) + node plane drag; no external assets. | Browser pointer events only. |
| `misc_controls_fly` | `FlyControls`, stats; current source also imports TSL/WebGPU film nodes; planet images (`earth_*`, `moon_1024.jpg`) | Implement keyboard/mouse flight camera and Canvas2D scene; drop TSL film pass and use EASEL textures/lights. | TSL/WebGPU film stage excluded. |
| `misc_controls_map` | `MapControls`, `lil-gui`; generated geometry | Implement constrained orbit/pan/zoom camera control. | Browser pointer/wheel events only. |
| `misc_controls_pointerlock` | `PointerLockControls`; generated 500 boxes/floor and keyboard movement | Canvas2D pointer-lock camera + keyboard movement + raycast interaction. | Pointer Lock is a browser permission/API; no GPU dependency. |
| `misc_controls_trackball` | `TrackballControls`, stats/lil-gui; generated scene | Trackball rotate/pan/zoom camera adapter. | Browser pointer events only. |
| `misc_controls_transform` | `TransformControls`, `OrbitControls`; `textures/crate.gif` | CPU node translation/rotation/scale with pointer rays, snapping, visible gizmo handles, and OrbitControls coordination. | Gizmo is CPU lines/meshes; no GPU requirement. |
| `misc_controls_orbit` | `OrbitControls`; generated scene (already `www/examples/misc/misc_controls_orbit.js`) | Keep existing EASEL control; audit source parity/cleanup. | Existing candidate; no GPU. |

`misc_controls_arcball`, `misc_controls_drag`, `misc_controls_fly`, `misc_controls_map`, `misc_controls_pointerlock`, and `misc_controls_trackball` now have reusable CPU/browser controls and exact-ID routes. Their Canvas2D scenes intentionally omit the source's GPU-only film/HDR/PBR stages while retaining the browser control behavior.

### Physics integrations (13 exact IDs)

Official add-ons: [AmmoPhysics](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/physics/AmmoPhysics.js), [RapierPhysics](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/physics/RapierPhysics.js), [JoltPhysics](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/physics/JoltPhysics.js). Use a fixed-step world adapter that writes transforms/velocities into EASEL nodes; physics debug shapes are CPU line/mesh geometry. Candidate engines: Ammo.js/WASM, `@dimforge/rapier3d-compat` (WASM), or Jolt WASM. Do not require a GPU physics backend.

| Exact IDs | Official requirements/assets | EASEL path | Boundary |
|---|---|---|---|
| `physics_ammo_break`, `physics_ammo_cloth`, `physics_ammo_instancing`, `physics_ammo_rope`, `physics_ammo_terrain`, `physics_ammo_volume` | Ammo.js world; `OrbitControls`, stats; `textures/grid.png` (break also `ConvexGeometry`/`ConvexObjectBreaker`; volume uses `BufferGeometryUtils`) | Add `PhysicsWorld` adapter (fixed timestep, rigid/soft bodies, collision groups), CPU mesh/instanced updates, and optional debug helpers. Reuse EASEL `InstancedMesh`, `LOD`, primitives; parse or generate convex geometry on CPU. | No GPU particle/physics compute; visual shadows/PBR remain out. |
| `physics_jolt_instancing` | JoltPhysics add-on, stats, source imports `three/webgpu` | Jolt WASM transform adapter + EASEL instancing. | The WebGPU renderer path in the official page is excluded; physics state remains candidate. |
| `physics_rapier_basic`, `physics_rapier_character_controller`, `physics_rapier_joints`, `physics_rapier_instancing`, `physics_rapier_terrain`, `physics_rapier_vehicle_controller` | `RapierPhysics`/`RapierHelper`, stats; `textures/grid.png` in basic/controller/vehicle; `RoundedBoxGeometry` in basic | Rapier WASM adapter, character controller/joint/vehicle API, fixed-step transform sync; CPU debug overlays. | GPU renderer/shadows are excluded; Rapier CPU/WASM is allowed. |

### Web Audio (4 exact IDs)

Official pages: [webaudio_orientation](https://github.com/mrdoob/three.js/blob/dev/examples/webaudio_orientation.html), [webaudio_sandbox](https://github.com/mrdoob/three.js/blob/dev/examples/webaudio_sandbox.html), [webaudio_timing](https://github.com/mrdoob/three.js/blob/dev/examples/webaudio_timing.html), [webaudio_visualizer](https://github.com/mrdoob/three.js/blob/dev/examples/webaudio_visualizer.html). Use `AudioContext`, `AudioBufferSourceNode`, `GainNode`, `PannerNode`, `AnalyserNode`, and Canvas2D bars/paths; keep media permission/autoplay handling explicit.

| Exact ID | Official requirements/assets | EASEL path | Boundary |
|---|---|---|---|
| `webaudio_orientation` | `GLTFLoader`; `models/gltf/BoomBox.glb`; cube faces `textures/cube/SwedishRoyalCastle/*`; `sounds/376737_Skullbeatz___Bad_Cat_Maste.{mp3,ogg}`; `PositionalAudioHelper` | Add WebAudio graph + positional panner tied to EASEL node; GLTF parser is separate candidate; replace environment map with solid/CanvasTexture backdrop. | GPU env/PBR excluded; WebAudio + positional behavior candidate. |
| `webaudio_sandbox` | `FirstPersonControls`, `lil-gui`; `sounds/{358232_j_s_song,376737_Skullbeatz___Bad_Cat_Maste,Project_Utopia}.{mp3,ogg}` | Audio library/sandbox controls and EASEL Canvas2D scene; expose play/stop/filter controls. | First-person control is browser/CPU candidate. |
| `webaudio_timing` | `OrbitControls`; `sounds/ping_pong.mp3`; external Freesound source `269718` | Audio timing/scheduling visualized by Canvas2D timeline/oscilloscope and EASEL scene. | No shader visualizer. |
| `webaudio_visualizer` | Native Web Audio analyser; `sounds/376737_Skullbeatz___Bad_Cat_Maste.mp3` | `AnalyserNode.getByteFrequencyData()` → EASEL `Geometry`/Canvas2D bars or points; no shader code. | GPU particle visualizer must be replaced by CPU bars/points. |

### SVG renderer / SVG asset conversion (2 exact IDs)

Official [SVGRenderer](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/renderers/SVGRenderer.js) and [SVGLoader](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/loaders/SVGLoader.js). `svg_lines` can be implemented as an SVG output surface or converted into Canvas2D paths; `svg_sandbox` additionally needs SVG/JSON asset parsing.

| Exact ID | Official requirements/assets | EASEL path | Boundary |
|---|---|---|---|
| `svg_lines` | `SVGRenderer`; generated line/shape scene | Add `SVGOutput` helper that serializes EASEL projected `Line`/`LineSegments` to `<path>`/`<polyline>`, or render same CPU geometry to Canvas2D. | No WebGL renderer; SVG output is DOM/XML. |
| `svg_sandbox` | `SVGRenderer`, `OrbitControls`; `models/json/QRCode_buffergeometry.json`, `models/svg/hexagon.svg` | Add SVG path parser (or adopt SVGLoader logic) → `Shape`/`ShapeGeometry`; expose SVG output/download. | SVG parsing/output candidate; no GPU texture/render target. |

### Games/browser integration (1 exact ID)

| Exact ID | Official requirements/assets | EASEL path | Boundary |
|---|---|---|---|
| `games_fps` | `GLTFLoader` + `models/gltf/collision-world.glb`; `Octree`, `Capsule`, `OctreeHelper`, stats/lil-gui | Add CPU `Octree`/capsule collision helpers (or reuse physics adapter), GLTF/OBJ parser, pointer-lock + WASD jump; draw collision helper with EASEL lines. | GLTF material/shadow fidelity is not guaranteed; game/input/collision logic is candidate. |

### Exporters, serializers, and CPU decoders (10 exact IDs)

Official exporter sources live under [examples/jsm/exporters](https://github.com/mrdoob/three.js/tree/dev/examples/jsm/exporters). EASEL must first expose a stable CPU scene/geometry serialization model; exporters should accept that model and return `Blob`/text/ArrayBuffer. `DRACOExporter`, KTX2 and USDZ rows are conditional because their usual output pipeline can require GPU texture/transcoding semantics.

| Exact ID | Official modules/assets | EASEL path | Boundary |
|---|---|---|---|
| `misc_exporter_draco` | `DRACOExporter`; generated geometry; Draco encoder WASM/JS | CPU encode EASEL positions/indices/normals/colors through Draco encoder; add download helper. | Do not promise GPU Draco decode/render; encoder output is format-only. |
| `misc_exporter_exr` | `EXRExporter`, `HDRLoader`; `textures/equirectangular/san_giuseppe_bridge_2k.hdr` | Exact route `misc_exporter_exr.js` and `EXRExporter` write deterministic uncompressed OpenEXR scanlines from CPU RGBA/float data; HDR parser can feed a background texture. | No PMREM/environment-map rendering; ZIP compression remains unsupported. |
| `misc_exporter_gcode` | `@jgphilpott/polyslice@26.4.0`, `OrbitControls`; generated sliced geometry | `GCodeExporter` slices EASEL triangles on the CPU and emits deterministic travel/extrusion commands without requiring polyslice. | No GPU requirement; target format remains machine/profile dependent. |
| `misc_exporter_gltf` | `GLTFExporter` + `GLTFLoader`, `KTX2Loader`, Meshopt decoder; `models/gltf/{ShaderBall.glb,scene.glb,coffeemat.glb}`, `textures/*` | CPU glTF 2.0 serializer for supported EASEL geometry/material/animation; loader/decoder separate; omit unsupported PBR extensions. | KTX2/Basis GPU transcode and ShaderBall PBR are conditional/excluded. |
| `misc_exporter_gltf_normals` | `GLTFExporter`; `textures/NormalMap{DirectX,OpenGL}.png` | Exact route `misc_exporter_gltf_normals.js` exports normalized CPU normals through `GLTFExporter`; EASEL has no normal-map material parity, so the output boundary is explicit. | Normal-map shader semantics excluded. |
| `misc_exporter_ktx2` | `KTX2Exporter`; `HDRLoader`; `textures/equirectangular/venice_sunset_1k.hdr` | CPU KTX2 container writer only if a CPU RGBA codec is selected; otherwise keep as conditional format utility. | BasisU GPU transcoder/render path is excluded. |
| `misc_exporter_obj` | `OBJExporter`; generated scene; `object.obj` round-trip | CPU OBJ text writer from transformed positions/UVs/normals/groups and vertex colors, with optional `mtllib` linkage; `MTLExporter` writes CPU color, opacity, illumination, and texture-path records. | OBJ/MTL consumers determine how external texture files are resolved; shader/PBR semantics are not invented. |
| `misc_exporter_ply` | `PLYExporter`; `box.ply` round-trip | CPU PLY ASCII/binary writer from transformed geometry, normals, UVs, and vertex colors. | Format-only; supported material/texture metadata remains target-format dependent. |
| `misc_exporter_stl` | `STLExporter`; `box.stl` round-trip | CPU STL ASCII writer from triangles. | Geometry/normals only because STL has no material/texture channels. |
| `misc_exporter_usdz` | `USDZExporter`, `GLTFLoader`, `DRACOLoader`, `KTX2Loader`, `RoomEnvironment`; compressed/PBR scene | USD/USDZ archive writer is candidate for geometry/material subset; use CPU zip writer and omit GPU texture/PBR extensions. | RoomEnvironment/PMREM, KTX2/Basis and PBR output are conditional/excluded. |

### WebGL loader/decoder pages (55 exact IDs)

These are **external implementation candidates**, not direct renderer ports. Each requires a parser/decoder that produces EASEL `Geometry`, `Texture`, `AnimationClip`, and scene nodes, followed by a CPU-material substitution. Official add-on index: [examples/jsm/loaders](https://github.com/mrdoob/three.js/tree/dev/examples/jsm/loaders).

| Decoder family | Exact IDs | Required package/assets | EASEL implementation path | Strict boundary |
|---|---|---|---|---|
| CAD/scene formats | `webgl_loader_3dm`, `webgl_loader_3ds`, `webgl_loader_3dtiles`, `webgl_loader_3mf`, `webgl_loader_3mf_materials`, `webgl_loader_amf`, `webgl_loader_collada`, `webgl_loader_collada_kinematics`, `webgl_loader_collada_skinning`, `webgl_loader_kmz`, `webgl_loader_ldraw`, `webgl_loader_vrml` | Official add-ons (`3DMLoader`, `TDSLoader`, `3DTilesRendererJS`/tiles parser, `3MFLoader`, `AMFLoader`, `ColladaLoader`, `KMZLoader` + JSZip, `LDrawLoader`, `VRMLLoader`); example models under `examples/models/**` | Parse to CPU geometry/materials, preserve hierarchy/animation/kinematics where EASEL supports it; add lazy optional loaders. | 3D Tiles streaming/GPU batching, PBR/environment and shadow output are not promised. |
| Character/animation formats | `webgl_loader_bvh`, `webgl_loader_fbx`, `webgl_loader_fbx_nurbs`, `webgl_loader_md2`, `webgl_loader_md2_control`, `webgl_loader_mdd` | `BVHLoader`, `FBXLoader`, `MD2Loader`, `MDDLoader`; `models/bvh`, `models/fbx`, MD2/MDD assets | Map skeleton/animation tracks into EASEL `Bone`/`Skeleton`/`Animator`; convert NURBS to sampled CPU curves/geometry. | Morph/shader/PBR features need CPU updates or are conditional. |
| glTF/Draco family | `webgl_loader_draco`, `webgl_loader_gltf`, `webgl_loader_gltf_animation_pointer`, `webgl_loader_gltf_anisotropy`, `webgl_loader_gltf_avif`, `webgl_loader_gltf_compressed`, `webgl_loader_gltf_dispersion`, `webgl_loader_gltf_instancing`, `webgl_loader_gltf_iridescence`, `webgl_loader_gltf_progressive_lod`, `webgl_loader_gltf_sheen`, `webgl_loader_gltf_transmission`, `webgl_loader_gltf_variants` | `GLTFLoader`, `DRACOLoader`, Meshopt decoder, KTX2/Basis loader, AVIF browser/decoder; `examples/models/gltf/**` | Implement glTF 2.0 CPU accessor/material/scene/animation parser, Draco/Meshopt CPU decode, variants/instancing/LOD where EASEL supports. | PBR transmission/dispersion/anisotropy, KTX2 GPU transcode, shader extensions, and environment lighting need CPU equivalents or remain partial. |
| Engineering/point/cloud formats | `webgl_loader_ifc`, `webgl_loader_nrrd`, `webgl_loader_obj`, `webgl_loader_pcd`, `webgl_loader_pdb`, `webgl_loader_ply`, `webgl_loader_stl`, `webgl_loader_xyz` | `IFCLoader` + web-ifc WASM; `NRRDLoader`; `OBJLoader`; `PCDLoader`; `PDBLoader`; `PLYLoader`; `STLLoader`; `XYZLoader`; corresponding models | Parse vertices/faces/points/metadata into EASEL `Geometry`, `Points`, `Line`; retain PDB bonds and IFC metadata in `userData`. | Volume raymarching/3D texture semantics (NRRD) must use CPU slicing/isosurface; point shaders are not required. |
| Image/texture/font/voxel/SVG formats | `webgl_loader_imagebitmap`, `webgl_loader_svg`, `webgl_loader_texture_dds`, `webgl_loader_texture_exr`, `webgl_loader_texture_hdr`, `webgl_loader_texture_ktx`, `webgl_loader_texture_ktx2`, `webgl_loader_texture_lottie`, `webgl_loader_texture_pvrtc`, `webgl_loader_texture_tga`, `webgl_loader_texture_tiff`, `webgl_loader_texture_ultrahdr`, `webgl_loader_ttf`, `webgl_loader_usdz`, `webgl_loader_vox`, `webgl_loader_gcode` | Browser `createImageBitmap`; `SVGLoader`; `DDSLoader`, `EXRLoader`, `RGBELoader`, `KTXLoader`, `KTX2Loader`, `LottieLoader`/`lottie-web`, `PVRTCLoader`, `TGALoader`, `TIFFLoader`/UTIF, `UltraHDRLoader`, `TTFLoader`, `USDZLoader`, `VOXLoader`, `GCodeLoader`; files under `textures/**`, `fonts/**`, `models/**` | Decode to `ImageData`/`DataTexture`, SVG/font outlines to EASEL `Shape`/`ShapeGeometry`, voxel CPU geometry, Lottie Canvas2D frames, and G-code lines. | KTX2/Basis/PVRTC compressed GPU formats are conditional until CPU RGBA decode is proven; Lottie must use Canvas2D; USDZ PBR omitted. |

### WebGPU Canvas2D-adaptable rows

The WebGPU prefix is not itself an exclusion. `webgpu_camera` is implemented as a CPU/Canvas2D adaptation with an exact route and source-matched THREE comparison adapter: its official page demonstrates camera projection, helpers, basic wireframe geometry, and points, none of which requires WebGPU once the renderer setup is replaced. Re-audit other WebGPU pages individually; keep only the renderer/TSL/compute/render-target/PBR/shadow/device-bound portion excluded.

| Exact ID | Portable behavior | EASEL path | Strict exclusion |
|---|---|---|---|
| `webgpu_camera` | Camera setup, helper geometry, basic wireframe, and points | Implemented in `www/examples/canvas/direct/canvas_webgpu_camera.js` with EASEL perspective/orthographic cameras, `CameraHelper`, wireframe meshes, points, and split Canvas2D renderers; `www/runtime/three-comparison.js` provides the paired THREE adapter | WebGPU renderer initialization and GPU-specific material behavior |

### WebGPU loader/media/XR rows (16 exact IDs)

The loader/media sub-behavior can be reused, but the WebGPU renderer result is not a port target. Official sources: [webgpu loader pages](https://github.com/mrdoob/three.js/tree/dev/examples) and [WebXR add-ons](https://github.com/mrdoob/three.js/tree/dev/examples/jsm/webxr).

| Exact IDs | External part to retain | EASEL path | Strict exclusion |
|---|---|---|---|
| `webgpu_loader_gltf`, `webgpu_loader_gltf_anisotropy`, `webgpu_loader_gltf_compressed`, `webgpu_loader_gltf_dispersion`, `webgpu_loader_gltf_iridescence`, `webgpu_loader_gltf_sheen`, `webgpu_loader_gltf_transmission`, `webgpu_loader_materialx` | glTF/MaterialX parsing; glTF assets under `models/gltf/**` | Reuse CPU glTF loader; map supported materials to Basic/Lambert/Toon. | WebGPU/TSL MaterialX node graph, PBR dispersion/transmission/anisotropy is excluded without a CPU equivalent. |
| `webgpu_loader_texture_ktx2` | KTX2 container + Basis decoder | CPU KTX2 RGBA decoder only if available; otherwise conditional. | WebGPU texture/transcode path excluded. |
| `webgpu_materials_video`, `webgpu_video_frame`, `webgpu_video_panorama` | Browser `<video>`, `VideoFrame`, MP4 demux (`demuxer_mp4.js`/MP4Box), `textures/{sintel,pano}.{mp4,webm,ogv}` | All three now have exact CPU routes under `www/examples/canvas/media/`; use `VideoTexture`/Canvas2D frame copy and CPU panorama projection. | WebGPU renderer, shader panorama, and GPU frame upload are excluded. |
| `webgpu_xr_cubes`, `webgpu_xr_native_layers`, `webgpu_xr_rollercoaster`, `webgpu_xr_shadows` | WebXR session/controller input; `VRButton`/fallback, `Horse.glb` and RollerCoaster geometry where applicable | Optional XR input/session adapter can feed a non-XR EASEL preview; keep scene logic reusable. | XR frame submission, native layers, WebGPU fallback, and XR shadow maps are device/GPU-bound and excluded. |

### WebGL external media/worker/helper rows (7 exact IDs)

| Exact ID | Official requirements/assets | EASEL path | Strict boundary |
|---|---|---|---|
| `webgl_helpers` | `GLTFLoader`; `VertexNormalsHelper`/`VertexTangentsHelper`; `models/gltf/LeePerrySmith/LeePerrySmith.glb` | CPU glTF parse plus EASEL normal/tangent line helpers. | Helper geometry is candidate; GLTF PBR/normal-map fidelity is conditional. |
| `webgl_materials_video` | `<video>` `textures/sintel.ogv`; `VideoTexture`; source also uses `EffectComposer`/BloomPass | Exact route `canvas_materials_video.js` uses a CPU `VideoTexture` with procedural fallback and OrbitControls; Bloom/EffectComposer are removed. | Bloom/postprocessing GPU stage excluded. |
| `webgl_materials_video_webcam` | `getUserMedia()` webcam `<video>` + `VideoTexture`; OrbitControls | Exact route `canvas_materials_video_webcam.js` captures video with explicit permission/error UI and CPU fallback. | Device camera permission is optional; no GPU video material. |
| `webgl_morphtargets_webcam` | MediaPipe Tasks Vision `@mediapipe/tasks-vision@0.10.35`; webcam; `facecap.glb`; GLTF/KTX2/Meshopt | Exact route `canvas_morphtargets_webcam.js` provides a webcam plane and authored CPU face/eye morphs; MediaPipe remains optional. | MediaPipe/GPU inference may be unavailable; shader morph/PBR and GPU video composite excluded. |
| `webgl_video_kinect` | `textures/kinect.{mp4,webm}` video texture | Exact route `canvas_video_kinect.js` decimates video pixels into CPU depth/color points. | Kinect depth/video GPU shader effects excluded; source video fallback remains explicit. |
| `webgl_video_panorama_equirectangular` | `textures/pano.{mp4,webm}` video texture | Exact route `canvas_video_panorama_equirectangular.js` uses an interior CPU sphere and affine texture fallback. | GPU panorama sampling excluded; CPU projection remains bounded. |
| `webgl_worker_offscreencanvas` | `examples/jsm/offscreen/{jank.js,scene.js}`; Worker + `OffscreenCanvas` | Exact route `canvas_worker_offscreencanvas.js` uses a worker Canvas2D path when transferable and a main-thread EASEL fallback otherwise. | WebGL OffscreenCanvas context and transferable GPU resources excluded. |

### WebXR session/input integrations (26 exact IDs)

Official add-ons: [WebXR helpers](https://github.com/mrdoob/three.js/tree/dev/examples/jsm/webxr). These rows are **not** Canvas2D renderer ports: retain reusable input/session logic only, expose a non-XR desktop preview, and never submit EASEL's framebuffer as an XR WebGL/WebGPU layer. `ARButton`/`VRButton`/`XRButton` are optional browser-device UI; permission denial and unsupported devices need an ordinary Canvas2D fallback.

| Exact IDs | Official requirements/assets | EASEL path | Strict exclusion |
|---|---|---|---|
| `webxr_ar_camera_access`, `webxr_ar_cones`, `webxr_ar_hittest`, `webxr_ar_lighting`, `webxr_ar_plane_detection` | `ARButton`; hit-test/plane/light-estimation/camera access; `UltraHDRLoader` + `XREstimatedLight` in `ar_lighting`; `royal_esplanade_2k.hdr.jpg` | Isolate AR session/request/input adapters and provide a desktop pointer/camera preview. Plane/hit-test results can drive EASEL CPU geometry when a session exists. | Camera texture upload, estimated-light GPU environment, and XR frame submission are device/GPU-bound. |
| `webxr_vr_handinput`, `webxr_vr_handinput_cubes`, `webxr_vr_handinput_pointerclick`, `webxr_vr_handinput_pointerdrag`, `webxr_vr_handinput_pressbutton`, `webxr_vr_handinput_profiles` | `VRButton`; controller/hand model factories; pointer examples also `ecsy`, `OculusHandPointerModel`, `Text2D`; button page uses audio buffers | Map controller/hand pose and button/pointer state to EASEL nodes; desktop mouse/keyboard fallback and Canvas2D labels. | XR hand/controller model rendering and headset frame submission excluded; input state itself is candidate. |
| `webxr_vr_layers`, `webxr_vr_panorama`, `webxr_vr_panorama_depth`, `webxr_vr_rollercoaster`, `webxr_vr_sandbox`, `webxr_vr_teleport`, `webxr_vr_video` | `VRButton`; layers page uses `HTMLMesh`/`InteractiveGroup` and `textures/MaryOculus.webm`; panorama uses `textures/cube/sun_temple_stripe_stereo.jpg`; depth uses `textures/kandao3.jpg` + depthmap; rollercoaster uses `RollerCoaster`; sandbox uses HDR/Reflector; video uses `textures/MaryOculus.{mp4,webm}` | Reuse scene/game/input logic in a normal EASEL canvas; implement DOM HTML overlays and CPU panorama/depth approximation only as separate opt-in features. | Native XR layers, depth sensing, reflector/environment maps and XR video/panorama GPU sampling are excluded. |
| `webxr_xr_ballshooter`, `webxr_xr_controls_transform`, `webxr_xr_cubes`, `webxr_xr_dragging`, `webxr_xr_dragging_custom_depth`, `webxr_xr_haptics`, `webxr_xr_marchingcubes`, `webxr_xr_paint` | `XRButton` + controller factory; ballshooter also `RapierPhysics`; controls page `TransformControls` + `UnrealBloomPass`; marching cubes `MarchingCubes`; paint `TubePainter`; BoxLineGeometry in cubes/ballshooter | Reuse CPU physics, ray/transform/painter/marching-cubes helpers and haptics capability checks in a desktop/Canvas2D preview. | XR frame/layer submission, bloom, depth texture and controller model rendering remain device/GPU-bound. |

## Strict exclusion rules (apply even when the page has a portable sub-feature)

1. Never add `WebGLRenderer`, `WebGPURenderer`, WebGL/WebGPU contexts, GPU buffers, shader/TSL source, compute passes, render targets/readback, postprocessing, shadow maps, PMREM/environment processing, or PBR-only material behavior to EASEL.
2. A browser API does not make a renderer feature portable: WebXR session/frame submission, native XR layers, camera/video device access, and worker APIs may be implemented as optional integration, but a page is not “complete” until its non-device fallback is explicit.
3. Texture/container formats are format candidates only after a CPU decode to RGBA/`ImageData` is tested. KTX2/Basis, PVRTC, AVIF, EXR/HDR and UltraHDR require per-format decoder decisions; do not silently treat a GPU transcoder as a CPU implementation.
4. Audio, physics, CSS/SVG, controls, loaders and exporters are allowed external implementations; they must be isolated from the renderer contract and have disposal/error paths.
5. Use `globalThis`, not `window`, in website examples and lifecycle code.

## Verification commands and source anchors

```sh
# Official tree and manifest
curl -fsSL https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/files.json > /tmp/three-files.json
# Source files inspected in this audit
ls /tmp/three-dev-audit.AMgaAE/examples/{css2d_label,css3d_molecules,games_fps,misc_controls_arcball,physics_rapier_basic,svg_sandbox,webaudio_visualizer}.html
# Current EASEL boundary
sed -n '1,240p' src/index.ts
rg -n "WebGL|WebGPU|GLTFLoader|SVGLoader|CSS2DRenderer|Ammo|Rapier|AudioContext" src www/examples www/runtime
# Current registry exact-ID check
rg -n "misc_controls_orbit|css2d_label|physics_rapier_basic|webaudio_visualizer" www/examples/registry.ts
```

## Implemented slices

| Exact ID | Reusable implementation | Validation boundary |
|---|---|---|
| `webgl_loader_gltf` | `GLTFLoader` parses embedded/data URI buffers, accessors, nodes/scenes/cameras, triangle primitives, CPU base-color materials, texture metadata, and raw animation channels. | CPU glTF 2.0 parser with Basic/Lambert material mapping; the exact route is `www/examples/canvas/loader/canvas_loader_gltf.js`. PBR extensions and compressed GPU formats remain explicit boundaries. |
| `webgl_loader_gltf_instancing`, `webgl_loader_gltf_progressive_lod`, `webgl_loader_gltf_variants` | `GLTFLoader` CPU paths decode `EXT_mesh_gpu_instancing` to `InstancedMesh`, `MSFT_lod` to `LOD`, and `KHR_materials_variants` to source mappings. | Exact Canvas2D routes use deterministic embedded fixtures: `canvas_loader_gltf_instancing.js`, `canvas_loader_gltf_progressive_lod.js`, and `canvas_loader_gltf_variants.js`. Variant switching remains metadata-only because shader/PBR material selection is not required for the CPU contract. |
| `webgl_loader_imagebitmap` | `ImageBitmapLoader` fetch/createImageBitmap path and bitmap disposal | Exact route uses `ImageBitmapLoader` with a deterministic inline image, CPU `Texture` sampling, and a DataTexture fallback when browser bitmap APIs are unavailable. | Browser fetch/createImageBitmap and bitmap lifecycle are conditional; GPU texture upload/filtering is omitted. |
| `webgl_loader_ttf` | `TTFLoader` TrueType binary parsing and `Font.generateShapes` | `TTFLoader` decodes cmap/metrics/glyf outlines and `TTFFont` emits CPU `Shape` contours; exact route: `canvas_loader_ttf.js`. | CFF/OpenType outlines and browser/GPU font rasterization remain out; TrueType glyf conversion is implemented. |
| `webgl_loader_texture_dds` | `DDSLoader` uncompressed RGB/BGR/RGBA/BGRA mipmapped texture decode | Exact route `canvas_loader_texture_dds.js` decodes bounded uncompressed DDS payloads into CPU `DataTexture` mipmaps. | DXT/BCn compression, cubemaps, and GPU transcoding remain unsupported. |
| `webgl_loader_bvh` | `BVHLoader` hierarchy and motion channels | `BVHLoader` maps BVH joints to CPU `Bone`/`Skeleton`/`AnimationClip` tracks; exact route: `canvas_loader_bvh.js`. | CPU skeleton lines and animation are implemented; WebGL skinning/debug renderer is omitted. |
| `webgl_loader_nrrd` | `NRRDLoader` decodes scalar volume data and produces a display slice. | `NRRDLoader` accepts inline raw/ascii/hex one-to-three-dimensional data and converts a bounded slice to a nearest-neighbour RGBA `DataTexture`; exact route: `canvas_loader_nrrd.js`. | Detached/compressed payloads and GPU volume raymarching remain out; CPU slice/texture conversion is implemented. |
| `webgl_loader_texture_tga` | `TGALoader` decodes indexed, true-color, and grayscale TGA images, including packet RLE and origin flags. | `TGALoader` produces top-left RGBA pixels for `DataTexture`; exact route: `canvas_loader_texture_tga.js`. | GPU filtering/mipmap behavior is omitted; CPU texture sampling is implemented. |
| `webgl_loader_vox` | `VOXLoader` decodes MagicaVoxel chunks, palette colors, and scene transforms. | `VOXLoader` produces greedy CPU voxel geometry, vertex colors, scene metadata, and an occupancy/color volume; exact route: `canvas_loader_vox.js`. | Official Data3DTexture output is GPU-only; CPU volume data and renderable geometry are implemented. |
| `webgl_loader_obj` | `OBJLoader` parses positions, UVs, normals, polygon triangulation, negative indices, object groups, and `usemtl` assignments when a caller supplies a CPU material table. | CPU text parser; `MTLLoader` parses Wavefront material colors, opacity, illumination, and `map_Kd` metadata/CPU texture bindings; no GPU material or renderer state. |
| `webgl_loader_gcode` | `GCodeLoader` parses modal G-code movement, layer comments, feed rates, and extrusion into red travel/green extrusion `LineSegments`; optional `splitLayer` mirrors THREE's route. | CPU text parser and line geometry; machine-specific commands, arc interpolation, and GPU renderer state are outside the loader boundary. |
| `webgl_loader_svg` | `SVGLoader` parses path, rect, rounded rect, circle, ellipse, line, polyline, and polygon elements with inherited styles and affine transforms. | Exact route uses CPU `SVGLoader` → `ShapeGeometry`; CSS selectors, gradients, unit conversion, and stroke expansion remain backlog work. |
| `webgl_loader_stl` | `STLLoader` parses ASCII and binary triangle streams into EASEL geometry. | CPU binary/text decoder; no GPU dependency. |
| `webgl_loader_pdb` | `PDBLoader` parses ATOM/HETATM and CONECT records into atom/bond geometries plus metadata. | CPU fixed-column text parser; no GPU dependency. |
| `webgl_loader_pcd` | `PCDLoader` parses ASCII PCD point-cloud headers, XYZ positions, and packed RGB colors. | CPU text parser; binary/GPU point-cloud paths remain explicit future work. |
| `webgl_loader_ply` | `PLYLoader` parses ASCII and binary PLY vertices, colors, normals, UVs, custom attributes, and polygon faces. | CPU text/binary decoder; no GPU dependency. |
| `webgl_loader_xyz` | `XYZLoader` parses XYZ and XYZRGB point-cloud text into EASEL geometry. | CPU text parser; no GPU dependency. |
| `physics_rapier_basic` | `PhysicsWorld` fixed-step rigid-body integration and scene transform synchronization. | Partial CPU AABB/circle baseline; it does not expose Rapier WASM compatibility or the upstream Rapier helper contract. Shadows, PBR, and WebGL rendering remain out. |
| `physics_rapier_joints` | `RapierPhysics` spherical/revolute/distance joint setup | `PhysicsJoints` provides deterministic CPU distance, spherical, revolute, and spring constraints; exact route: `canvas_physics_rapier_joints.js`. | Rapier WASM collider identity, angular inertia, and GPU renderer/helper are omitted; translation constraints are implemented. |
| `physics_rapier_instancing` | `RapierPhysics` instanced rigid bodies and per-instance transform updates | `PhysicsWorld` now supports reusable `SphereShape` plus sphere/AABB and sphere/sphere contacts; exact route: `canvas_physics_rapier_instancing.js` synchronizes deterministic CPU bodies into `InstancedMesh`. | Rapier WASM, angular inertia, and GPU instancing buffers are omitted; CPU instance transforms and collision response are implemented. |
| `physics_rapier_terrain`, `physics_ammo_terrain` | Heightfield terrain, rigid-body gravity, and collision response | `HeightfieldShape` samples a bounded CPU heightfield; exact routes use fixed-step `PhysicsWorld` collision and Canvas2D debug geometry. | WASM engine identity and GPU shadows are omitted; heightfield sampling and CPU collision are implemented. |
| `physics_rapier_vehicle_controller` | Rapier vehicle controller, wheel state, throttle/brake input, and terrain contact | `VehicleController` owns deterministic CPU chassis/wheel state over `PhysicsWorld`; exact route exposes throttle, brake, and reset behavior. | Rapier WASM, tire/friction solver fidelity, angular inertia, and GPU vehicle rendering are omitted. |
| `physics_ammo_instancing`, `physics_jolt_instancing` | Ammo/Jolt instanced rigid bodies and transform updates | Exact routes use deterministic CPU rigid bodies and `InstancedMesh` transform synchronization; no WASM dependency is required. | Ammo/Jolt WASM identity and GPU renderer paths are omitted; CPU body state and instance transforms are implemented. |
| `physics_ammo_break`, `physics_ammo_cloth`, `physics_ammo_rope`, `physics_ammo_volume` | Ammo rigid fracture, cloth/rope constraints, and soft volume | Exact routes use `ParticleWorld`/`DistanceConstraint` CPU equivalents for fracture particles, cloth grids, ropes, and soft volumes. | Ammo WASM, angular/soft-body solver fidelity, and GPU shadows/instancing are omitted; CPU particle state and constraints are implemented. |
| `physics_rapier_character_controller` | Rapier kinematic capsule controller, gravity, grounding, and computed movement. | `CharacterController` owns a capsule, fixed-step gravity/jump/grounding, and triangle-aware `Octree` collision; exact route: `canvas_physics_rapier_character_controller.js`. | Rapier autostep, WASM collider identity, and dynamic-body interaction remain separate candidates. |
| `svg_lines`, `svg_sandbox` | `SVGPathParser`, `SVGPathSerializer`, `SVGObject`, and `SVGRenderer` provide CPU path conversion and DOM SVG output. | SVG/DOM overlay is kept outside the Canvas2D rasterizer; no GPU renderer is used. |
| `webaudio_orientation`, `webaudio_sandbox`, `webaudio_timing`, `webaudio_visualizer` | `AudioGraph`, `AudioAnalyzer`, and Canvas2D visualizer helpers provide typed Web Audio integration and safe no-audio fallback. | Browser audio is optional and disposed by each example; visual output is Canvas2D, not shader-based. |
| `misc_exporter_gltf`, `misc_exporter_obj`, `misc_exporter_gcode`, `misc_exporter_ply`, `misc_exporter_stl` | CPU exporters serialize transformed EASEL mesh triangles to deterministic glTF JSON/data buffers or format-specific text/binary data where the format supports it. | glTF and OBJ/MTL preserve supported geometry, CPU material color/opacity, texture references, and animation channels; PLY carries normals/UVs/colors; STL is ASCII geometry/normals only; G-code is a sliced toolpath representation. GPU-only shader/PBR semantics are not exported. |
| `css2d_label` | `CSS2DObject` and `CSS2DRenderer` project a DOM label from an EASEL camera into an overlay root. | DOM/CSS remains an overlay; CPU Canvas2D rendering and camera projection remain reusable, with no GPU renderer dependency. |
| `css3d_mixed`, `css3d_molecules`, `css3d_orthographic`, `css3d_periodictable`, `css3d_sandbox`, `css3d_sprites`, `css3d_youtube` | `CSS3DObject`/`CSS3DSprite` and `CSS3DRenderer` project DOM panels, molecules, tables, sprites, and iframe panels through perspective or orthographic cameras; molecule atoms use `PDBLoader`. | DOM/CSS overlay behavior and cleanup are implemented; CSS3D content is not folded into the Canvas2D framebuffer. |
| `games_fps` | `Capsule`, `Octree`, and `PointerLockControls` provide a CPU first-person baseline over generated scene geometry. | Partial: input/gravity/capsule behavior is retained, but the helper is an AABB list rather than a triangle octree and the official GLTF/shadow/PBR path is replaced. |
| `misc_controls_arcball`, `misc_controls_drag`, `misc_controls_fly`, `misc_controls_map`, `misc_controls_pointerlock`, `misc_controls_trackball`, `misc_controls_transform` | CPU camera, pointer, and transform controls implement browser input, movement, camera projection, node transforms, visible gizmo handles, snapping, and disposal. | TransformControls now supplies a Canvas2D-renderable CPU gizmo and projection-based axis/plane/ring hit testing; GPU-only film/HDR/PBR stages are omitted. |
| `webxr_xr_cubes`, `webxr_xr_controls_transform`, `webxr_xr_dragging`, `webxr_xr_haptics`, `webxr_vr_handinput` | WebXR session/input/controller or hand state and desktop fallback | Exact `www/examples/xr/` routes expose Canvas2D previews, optional session/input listeners, capability/error status, and deterministic desktop controls. | XR frame submission, headset pose rendering, native layers, and device haptics remain browser/device boundaries. |

**Audit result:** all 149 rows previously classified `external` are concrete implementation candidates under the user's expanded non-GPU policy. No GPU/device-only row is promoted to a renderer parity target. Implemented slices above are exact-ID routes; remaining rows stay backlog candidates until their reusable CPU/browser contract and validation exist.
