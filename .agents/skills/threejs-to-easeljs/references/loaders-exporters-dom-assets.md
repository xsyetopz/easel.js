# Loaders, exporters, DOM, and assets

## Shared loading roles

Both packages expose `AnimationLoader`, `AudioLoader`, `Cache`,
`DataTextureLoader`, `FileLoader`, `ImageBitmapLoader`, `ImageLoader`, `Loader`,
loader utilities, `LoadingManager`, `MaterialLoader`, `ObjectLoader`, and
`TextureLoader`. Three r185 also exposes `BufferGeometryLoader`; EASEL does not.
Use EASEL's canonical `GeometryLoader` for `Geometry.toJSON()` records, their
flat `data` payloads, and compatible nested geometry records. It retains the
supported attribute storage types, index width, morph data, draw range, bounds,
names, parameters, and user data.

Matching roles do not make Three JSON, material, geometry, or object schemas interchangeable. Inspect constructor options, return types, diagnostics, progress, abort behavior, URL resolution, credentials, and the exact consumer.

## Format loaders

EASEL 0.7.0 root exports these r185 add-on names:

`BVHLoader`, `DDSLoader`, `GCodeLoader`, `GLTFLoader`, `HDRLoader`, `RGBELoader` (an alias of `HDRLoader`), `MTLLoader`, `NRRDLoader`, `OBJLoader`, `PCDLoader`, `PDBLoader`, `PLYLoader`, `STLLoader`, `SVGLoader`, `TGALoader`, `TIFFLoader`, `TTFLoader`, `VOXLoader`, and `XYZLoader`.

Start each at `adapt`. Verified high-risk boundaries include:

- **GLTF:** `load()` handles JSON glTF and external or data buffers. `parse()` accepts a JSON document or string plus supplied `buffers` or a `binaryChunk`; do not assume automatic GLB-container parsing. It constructs CPU TRIANGLES, STRIP, and FAN geometry with POSITION and optional NORMAL, TEXCOORD_0, and COLOR_0, plus node transforms and cameras. Materials reduce to Basic/Lambert base color, optional caller-supplied base-color texture, double side, and quantized blend alpha. Texture references remain metadata unless decoded textures are supplied. Animations are decoded channel records. Instancing, LOD, and material-variant metadata have bounded support. Skins, rendered morphs, PBR maps, Draco, Meshopt, and KTX2 pipelines are not implied.
- **OBJ/MTL:** CPU parsers and material tables exist. Test polygon triangulation, line and point handling, smoothing, object/group splits, texture resolution, diagnostics, and target single-material constraints.
- **DDS:** only uncompressed RGB/RGBA CPU pixels are accepted; DXT/BCn/ETC/DX10 and cubemaps are rejected.
- **HDR/RGBE:** samples are tone-mapped to packed sRGB RGBA bytes for a `DataTexture`; this does not provide an HDR framebuffer, environment, or PMREM pipeline.
- **SVG:** supported elements, paths, styles, and affine transforms are parsed without a DOM into CPU `ShapePath` data. This is not a browser's full SVG/CSS implementation.
- **NRRD, VOX, TTF, scientific, and CAD-style formats:** result objects are target-specific CPU data. Read declarations and tests before assuming Three add-on helpers or render behavior.

r185 add-ons without a verified same-name EASEL loader include 3DM, 3MF, AMF, Collada, Draco, EXR, FBX, Font, HDRCubeTexture, IES, KMZ, KTX/KTX2, LDraw, LUT, Lottie, LWO, MaterialX, MD2/MDD, PVR, TDS, UltraHDR, USD/USDZ, VRML, and VTK loaders.

This inventory does not prove that a format is impossible. Keep an independent CPU parser or converter, construct target resources, or leave uninvestigated variants `UNKNOWN`.

## Asset preflight

Inventory each production asset by extension and variant: compression, container, extensions, buffer layout, dependent URLs, texture encoding, primitive modes, groups, skins, morphs, animations, cameras, and custom metadata.

For every family, test:

- the actual production fixture and a malformed fixture;
- missing dependencies, URL resolution, data URLs, CORS, credentials, progress, cancellation when supported, and failure UI;
- exact result graph, names, transforms, materials, texture pixels, bounds, animation records, and retained metadata;
- memory release and repeated load/dispose behavior;
- rendering of every object/material pair produced by the loader.

One friendly fixture establishes only that fixture.

## Exporters

| r185 add-on | EASEL 0.7.0 | Adaptation |
| --- | --- | --- |
| `GLTFExporter` | `GLTFExporter` | Returns `{ json, binary, dataUri }` synchronously or through a callback overload; it is a deterministic CPU glTF subset, not Three's GLB, extension, or plugin surface. |
| `OBJExporter` | `OBJExporter` | Returns OBJ text from target meshes; material output is separate through `MTLExporter`. |
| `PLYExporter` | `PLYExporter` | Returns ASCII text or little-endian `Uint8Array` with `{ binary: true }`. |
| `STLExporter` | `STLExporter` | Emits ASCII STL; do not copy r185 binary-option assumptions. |
| `EXRExporter` | `EXRExporter` | Accepts `DataTexture` or raw CPU RGBA input; it does not accept WebGL/WebGPU render targets or provide PMREM/compression. |
| `DRACOExporter`, `KTX2Exporter`, `USDZExporter` | no verified same-name equivalent | Retain a converter/exporter or mark the requirement `UNKNOWN`. |
| no same r185 exporter | `GCodeExporter`, `MTLExporter` | Target additions; inspect their output contracts before use. |

Validate exporters with a downstream parser, round-trip, or target consumer, not just a non-empty result. Include coordinate system, index width, colors, normals, UVs, names, hierarchy, binary layout, determinism, errors, and large inputs.

## DOM renderers

EASEL exports `CSS2DRenderer`/`CSS2DObject`, `CSS3DRenderer`/`CSS3DObject`/`CSS3DSprite`, and `SVGRenderer`/`SVGObject`. They map r185 add-on roles but are not drop-in implementations and do not add GPU features to the main renderer.

Audit their options-object constructors, supported camera projections, object and material subsets, DOM attachment, sizing, z-order, pointer/event behavior, framework ownership, and cleanup. The SVG renderer supports its documented line, basic-mesh, and custom-SVG subset; verify actual output rather than the class name.
