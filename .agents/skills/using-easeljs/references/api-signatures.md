# API signatures

Source: declaration emit from repository `src/` at `REVISION = "0.7.0"`.
This is a high-use signature guide, not a substitute for the complete root
surface in [API exports](api-exports.md). For an omitted member, inspect the
installed `dist/**/*.d.ts` file named by that export guide. Do not infer a
three.js signature.

## Renderer and frame preparation

```ts
interface RendererOptions {
  width?: number;
  height?: number;
  canvas?: HTMLCanvasElement;
  sortObjects?: boolean;
}

class Renderer {
  sortObjects: boolean;
  constructor(options?: RendererOptions);
  get domElement(): HTMLCanvasElement | undefined;
  get width(): number;
  get height(): number;
  prepare(scene: Scene, camera: Camera, force?: boolean): void;
  render(scene: Scene, camera: Camera, timings?: RenderTimings): void;
  setSize(width: number, height: number): void;
  get clearColor(): number;
  set clearColor(value: Color | number);
  dispose(): void;
}
```

`Renderer` has no `pixelRatio`, `setPixelRatio`, `setClearColor`, or
`setAnimationLoop` API in 0.7.0. After transform/control changes, call
`renderer.prepare(scene, camera)` before `renderer.render(...)`. `prepare`
updates scene world matrices and the camera inverse view matrix; `render` does
not do that work.

`RenderTimings` is a root-exported type with `clearMs`, `traversalMs`,
`fogCullMs`, `sortMs`, `shadeRasterMs`, `uploadMs`, `totalMs`, and optional
`profileTraversal`, `travUpdateWorldMs`, `travWalkMs`, `travProjectMs`,
`travAssembleMs`, and `travDrawCalls` fields.

## Scene, nodes, and cameras

```ts
class Node extends EventDispatcher {
  constructor(options?: { uuid?: string });
  readonly uuid: string;
  parent: Node | undefined;
  children: Node[];
  position: Vector3;
  rotation: Euler;
  quaternion: Quaternion;
  scale: Vector3;
  pivot: Vector3 | undefined;
  matrixAutoUpdate: boolean;
  add(...objects: Node[]): this;
  remove(...objects: Node[]): this;
  clear(): this;
  removeFromParent(): this;
  attach(object: Node): this;
  updateMatrix(): void;
  updateMatrixWorld(updateParents?: boolean, updateChildren?: boolean, force?: boolean): void;
  getObjectByName(name: string): Node | undefined;
  toJSON(): NodeJSON;
}

class Camera extends Node {
  constructor(options?: { near?: number; far?: number; tileSize?: number });
  near: number;
  far: number;
  tileSize: number;
  readonly projectionMatrix: Matrix4;
  readonly projectionMatrixInverse: Matrix4;
  readonly matrixWorldInverse: Matrix4;
  updateProjectionMatrix(): void;
  updateMatrixWorldInverse(): this;
  updateViewMatrix(updateParents?: boolean, updateChildren?: boolean, force?: boolean): this;
}

new PerspectiveCamera({
  fov?: number,
  aspect?: number,
  near?: number,
  far?: number,
  tileSize?: number,
  zoom?: number,
})

new OrthographicCamera({
  left?: number,
  right?: number,
  top?: number,
  bottom?: number,
  near?: number,
  far?: number,
  tileSize?: number,
  zoom?: number,
})

new ArrayCamera({
  arrayCameras?: PerspectiveCamera[],
  fov?: number,
  aspect?: number,
  near?: number,
  far?: number,
  tileSize?: number,
  zoom?: number,
})

class StereoCamera {
  aspect: number;
  eyeSep: number;
  cameraL: PerspectiveCamera;
  cameraR: PerspectiveCamera;
  update(camera: PerspectiveCamera): void;
}
```

Perspective and orthographic cameras expose `zoom`, `view`,
`setViewOffset(...)`, and `clearViewOffset()`. Perspective cameras also expose
`focus`, `filmGauge`, `filmOffset`, `focalLength`, `effectiveFOV`,
`filmWidth`, `filmHeight`, `viewBoundsAt(...)`, and `viewSizeAt(...)`. Change
projection fields, then call `updateProjectionMatrix()`.

`Scene.background` is `Color | number | Texture | undefined`; `Scene.fog` is
`Fog | undefined`. `Scene.environment` and `Scene.overrideMaterial` currently
use `null` for absence and are retained scene data; the CPU renderer ignores
environment/PBR settings.

## Controls

Every concrete control constructor attaches browser listeners immediately; call
`dispose()` on teardown. Per-frame signatures differ:

| Control | Constructor | Per-frame / action API |
| --- | --- | --- |
| `OrbitControls` | `(camera, domElement)` | `update(): boolean`, `reset()`, `dispose()` |
| `MapControls` | `(camera, domElement)` | inherits `OrbitControls` |
| `ArcballControls` | `(camera, domElement)` | `update(): boolean`, `saveState()`, `reset()`, `dispose()` |
| `TrackballControls` | `(camera, domElement)` | `update(): boolean`, `handleResize()`, `reset()`, `dispose()` |
| `FirstPersonControls` | `(camera, domElement)` | `update(delta?: number): boolean`, `handleResize()`, `dispose()` |
| `FlyControls` | `(camera, domElement)` | `update(delta: number): boolean`, `dispose()` |
| `PointerLockControls` | `(camera, domElement)` | `lock(unadjustedMovement?)`, `unlock()`, `moveForward()`, `moveRight()`, `dispose()` |
| `DragControls` | `(objects, camera, domElement, raycaster?)` | `activate()`, `deactivate()`, `dispose()` |
| `TransformControls` | `(camera, domElement, raycaster?)` | `attach(node)`, `detach()`, `update(): boolean`, `dispose()` |

`Controls` is the general base class: `constructor(object: Node,
domElement?: EventTarget)`, `connect(element)`, `disconnect()`, `update(delta?)`,
and `dispose()`.

## Geometry and attributes

```ts
class Attribute {
  constructor(array: AttributeArray | number[], itemSize: number, normalized?: boolean);
  get array(): AttributeArray;
  get itemSize(): number;
  get normalized(): boolean;
  get count(): number;
  needsUpdate: boolean;
  setXYZ(index: number, x: number, y: number, z: number): this;
  set(values: ArrayLike<number>, offset?: number): this;
  clone(): Attribute;
}

class Geometry {
  setPositions(array: Float32Array | number[]): this;
  setFromPoints(points: Array<{ x: number; y: number; z?: number }>): this;
  setUVs(array: Float32Array | number[]): this;
  setColors(array: Float32Array | number[]): this;
  setNormals(array: Float32Array | number[]): this;
  setTangents(array: Float32Array | number[]): this;
  set index(array: Uint16Array | Uint32Array | number[] | undefined);
  get index(): Uint16Array | Uint32Array | undefined;
  setDrawRange(start: number, count: number): this;
  computeVertexNormals(): this;
  normalizeNormals(): this;
  computeTangents(): this;
  computeBoundingBox(): this;
  computeBoundingSphere(): this;
  clone(): Geometry;
  dispose(): void;
}
```

There is no `Geometry.setIndex()` in 0.7.0; assign `geometry.index = indices`.

## Materials and textures

```ts
interface MaterialOptions {
  name?: string;
  layer?: number;
  opacity?: number;
  transparent?: boolean;
  depthTest?: boolean;
  depthWrite?: boolean;
  shading?: number;
  side?: number;
  visible?: boolean;
  wireframe?: boolean;
  vertexColors?: boolean;
}

class Material {
  opacity: number; // integer 0 opaque through 8 fully transparent
  transparent: boolean;
  depthTest: boolean;
  depthWrite: boolean;
  wireframe: boolean;
  vertexColors: boolean;
  assign(values?: Readonly<Record<string, unknown>>): this;
  toJSON(): MaterialJSON;
  dispose(): void;
}

new Texture(image?: TextureImageSource, mapping?, wrapS?, wrapT?, magFilter?,
  minFilter?, format?, type?, anisotropy?, colorSpace?)
new DataTexture(data: Uint8ClampedArray, width: number, height: number)
new CanvasTexture(canvas: HTMLCanvasElement)
new VideoTexture(video: HTMLVideoElement)
```

`Texture.update()` explicitly rebuilds a dirty CPU cache. `needsUpdate = true`
marks the source dirty; `data`, `width`, and `height` expose the bounded cache.
Image sources clamp to 128×128 and sampling stays nearest-neighbor.

## Animation

```ts
new Track(name, times, values, options?: {
  itemSize?: number,
  interpolation?: InterpolationMode,
  inTangents?: Float32Array | readonly number[],
  outTangents?: Float32Array | readonly number[],
  endingStart?: InterpolationEndingMode,
  endingEnd?: InterpolationEndingMode,
})

new AnimationClip(name?: string, duration?: number,
  tracks?: AnimationTrack[], blendMode?: AnimationBlendMode)
new Animator(root: object)
animator.clipAction(clip, localRoot?).setLoop(Loop.Repeat, Infinity).play()
animator.update(deltaSeconds)
```

The old numeric fourth `Track` argument and `LoopRepeat`/`LoopOnce`/
`LoopPingPong` root values are not 0.7.0 APIs. Use `TrackOptions.itemSize` and
`Loop.Repeat`/`Loop.Once`/`Loop.PingPong`.

## Picking

```ts
class Raycaster {
  constructor(origin?: Vector3, direction?: Vector3, near?: number, far?: number);
  lineThreshold: number;
  pointsThreshold: number;
  setFromCamera(coords: { x: number; y: number }, camera: RaycastCamera): this;
  intersectObject(object: RaycastObject, recursive?: boolean,
    intersects?: Intersection[]): Intersection[];
  intersectObjects(objects: readonly RaycastObject[], recursive?: boolean,
    intersects?: Intersection[]): Intersection[];
}
```

The public `PerspectiveCamera` and `OrthographicCamera` satisfy
`RaycastCamera`; prepare their matrices first and pass the camera directly.

## Loaders

All root loader classes use callbacks. Base `Loader.loadAsync(url, onProgress?)`
returns `Promise<unknown>` unless a subclass narrows it. `FileLoader`,
`ImageLoader`, `ImageBitmapLoader`, and `MTLLoader` expose `abort()`; the shared
`LoadingManager` exposes `abort()` for its active work.

High-use narrowed signatures:

```ts
new TextureLoader(manager?).load(url, onLoad?: (texture: Texture) => void, onProgress?, onError?)
new GeometryLoader().load(url, onLoad?: (geometry: Geometry) => void, onProgress?, onError?)
new OBJLoader().load(url, onLoad?: (group: Group) => void, onProgress?, onError?)
new PLYLoader().load(url, onLoad?: (geometry: Geometry) => void, onProgress?, onError?)
new STLLoader().load(url, onLoad?: (geometry: Geometry) => void, onProgress?, onError?)
new SVGLoader().load(url, onLoad?: (result: SVGLoaderResult) => void, onProgress?, onError?)
new GLTFLoader().load(url, onLoad?: (result: GLTFLoaderResult) => void, onProgress?, onError?)
new GLTFLoader().loadAsync(url, onProgress?): Promise<GLTFLoaderResult>
new MTLLoader(manager?, options?).loadAsync(url, onProgress?): Promise<MTLMaterialTable>
new NRRDLoader().load(url, onLoad?: (volume: NRRDVolume) => void, onProgress?, onError?)
new BVHLoader(manager?, options?).load(url, onLoad?: (result: BVHLoaderResult) => void, onProgress?, onError?)
new TTFLoader().load(url, onLoad?: (fontData: TTFLoaderResult) => void, onProgress?, onError?)
```

The root also exports `AnimationLoader`, `AudioLoader`, `BufferGeometryLoader`,
`DataTextureLoader`, `DDSLoader`, `FileLoader`, `GCodeLoader`, `HDRLoader`
(`RGBELoader` alias), `ImageBitmapLoader`, `ImageLoader`, `MaterialLoader`,
`ObjectLoader`, `PCDLoader`, `PDBLoader`, `TGALoader`, `TIFFLoader`,
`VOXLoader`, and `XYZLoader`. Format parse results are not interchangeable;
read the specific result type from [API exports](api-exports.md).

## Exporters

```ts
new OBJExporter().parse(root: Node, options?: OBJExporterOptions): string
new MTLExporter().parse(root: Node, options?: MTLExporterOptions): string
new PLYExporter().parse(root: Node, options?: { binary?: boolean }): string | Uint8Array
new STLExporter().parse(root: Node, name?: string): string
new GCodeExporter().parse(root: Node, options?: GCodeExporterOptions): string
new EXRExporter().parse(source: DataTexture | EXRPixelSource,
  options?: EXRExporterOptions): Uint8Array
new GLTFExporter().parse(root: Node,
  options?: GLTFExporterOptions): GLTFExportResult
new GLTFExporter().parseAsync(root: Node,
  options?: GLTFExporterOptions): Promise<GLTFExportResult>
```

`GLTFExporter.parse` also has a callback overload. Exporters return data; they
do not download files or own a disposal lifecycle.

## Audio

```ts
new AudioGraph(options?: {
  context?: AudioContextLike | null,
  destination?: AudioNodeLike,
  masterVolume?: number,
})
new AudioAnalyzer(source: AudioContextLike | AudioContext |
  AnalyserNodeLike | AnalyserNode | null, options?: AudioAnalyzerOptions)
new AudioListener()
new Audio(listener: AudioListener)
new PositionalAudio(listener: AudioListener)
```

`AudioGraph` exposes `available`, `context`, `output`, `connect`,
`createMediaElementSource`, `createOscillator`, `createStereoPanner`,
`createAnalyzer`, `resume`, `suspend`, `playTone`, and `dispose`. Visualization
is by standalone `drawFrequencyBars`, `drawTimeDomainWaveform`, and
`drawAudioAnalyzer` functions from `AudioVisualizer.ts`; there is no
`CanvasAudioVisualizer` class.
