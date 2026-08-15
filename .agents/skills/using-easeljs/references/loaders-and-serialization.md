# Loaders, exporters, and serialization

All names below are root exports in EASEL 0.7.0. Loaders decode browser- or
CPU-accessible data; they do not create GPU resources.

## Shared loader lifecycle

`Loader` accepts an optional `LoadingManager` and exposes accessor properties
for `path`, `resourcePath`, `crossOrigin`, `withCredentials`, `requestHeader`,
and optional `cache`.

```ts
loader.load(url, onLoad?, onProgress?, onError?);
const value = await loader.loadAsync(url, onProgress?);
```

Base `loadAsync` is `Promise<unknown>`; only use a narrower promise result when
the concrete declaration supplies one. `GLTFLoader` and `MTLLoader` do.
`LoadingManager` tracks start/end/error, URL modification, handler registration,
and an `AbortController`; `manager.abort()` cancels active managed work.
`FileLoader`, `ImageLoader`, `ImageBitmapLoader`, and `MTLLoader` also expose
`abort()`.

## Choose by asset

| Asset | Loader | Primary result |
| --- | --- | --- |
| animation JSON | `AnimationLoader` | `AnimationClip[]` |
| audio | `AudioLoader` | `AudioBufferLike` |
| BVH motion | `BVHLoader` | skeleton, root/bones, clip, frame metadata |
| geometry JSON | `GeometryLoader` | `Geometry` |
| glTF/GLB CPU data | `GLTFLoader` | `GLTFLoaderResult` with scenes, cameras, animations, materials and extension metadata |
| Wavefront material/object | `MTLLoader`, `OBJLoader` | `MTLMaterialTable`, `Group` |
| PLY/STL/PCD/XYZ | matching loader | `Geometry` |
| G-code | `GCodeLoader` | `Group` |
| SVG | `SVGLoader` | paths plus source XML |
| TTF | `TTFLoader` | `TTFLoaderResult`; wrap with `TTFFont` for shapes |
| PDB | `PDBLoader` | atom/bond geometries plus atom JSON |
| NRRD | `NRRDLoader` | `NRRDVolume`; derive slices or `DataTexture` |
| MagicaVoxel | `VOXLoader` | chunks, optional scene, nodes, palette |
| image | `ImageLoader`, `ImageBitmapLoader`, `TextureLoader` | image/bitmap/`Texture` |
| CPU texture formats | `DDSLoader`, `HDRLoader`/`RGBELoader`, `TGALoader`, `TIFFLoader` | parsed RGBA data / `DataTexture` path |
| generic data | `FileLoader`, `DataTextureLoader` | selected response / subclass result |
| scene/material JSON | `ObjectLoader`, `MaterialLoader` | `Node`, `Material` |

Compressed GPU texture payloads are not a supported rendering path. In
particular, `DDSLoader` accepts portable uncompressed 24/32-bit DDS data and
rejects DXT/BCn/ETC/DX10/cubemap payloads rather than pretending they are CPU
RGBA pixels.

## High-use examples

```ts
const gltf = await new EASEL.GLTFLoader().loadAsync("/model.gltf");
scene.add(gltf.scene);
```

```ts
const mtl = await new EASEL.MTLLoader().loadAsync("/model.mtl");
const objLoader = new EASEL.OBJLoader().setMaterials(mtl);
objLoader.load("/model.obj", (group) => scene.add(group), undefined, reportError);
```

```ts
new EASEL.TextureLoader().load(
  "/atlas.png",
  (texture) => {
    texture.needsUpdate = true;
    material.map = texture;
  },
  undefined,
  reportError,
);
```

Dispose loaded geometry, materials, and textures when ownership ends. Loader
objects themselves generally have no `dispose()`.

## Serialization

`Node`, `Scene`, `Geometry`, `Material`, `Texture`, cameras, lights, fog, and
animation clips expose source-specific `toJSON`/standalone serialization APIs.
`GeometryLoader` is the single geometry-JSON loader. It accepts complete
`Geometry.toJSON()` records, their flat `data` payloads, the loader's historical
flat attribute form, and compatible nested geometry records. Supported typed
attributes, index width, morph channels, draw range, bounds, names, parameters,
and user data are retained. Use `ObjectLoader`, `GeometryLoader`,
`MaterialLoader`, or `AnimationLoader` for the corresponding JSON format. Do
not assume an `ObjectLoader` JSON document is a glTF document.

## Exporters

| Exporter | Input | Return |
| --- | --- | --- |
| `OBJExporter` | `Node`, optional material-library name | text |
| `MTLExporter` | `Node`, optional texture-path resolver | text |
| `PLYExporter` | `Node`, optional binary flag | text or `Uint8Array` |
| `STLExporter` | `Node`, optional solid name | ASCII STL text |
| `GCodeExporter` | `Node` or prepared slices | G-code text / slice data |
| `GLTFExporter` | `Node`, optional animations/buffer settings | `GLTFExportResult` |
| `EXRExporter` | `DataTexture` or `EXRPixelSource` | `Uint8Array` |

```ts
const result = await new EASEL.GLTFExporter().parseAsync(scene, {
  embedBuffers: true,
  animations: clips,
});

const ply = new EASEL.PLYExporter().parse(scene, { binary: true });
```

Exporters return data and do not trigger downloads. Application code owns Blob,
URL, file-write, and cleanup behavior. There is no exporter `dispose()` method.
