# API signatures

Generated from `@xsyetopz/easel@0.6.1` declaration files. Use the contents
for exact constructor, property, and method shapes; do not infer omitted
options. Search this file by class heading or source path before writing a
non-trivial call. The [API exports](api-exports.md) index maps public names to
package paths, and [API constants](api-constants.md) contains literal values.

## Contents

- [Declaration lookup fallback](#declaration-lookup-fallback)
- [Generated class declarations](#generated-class-declarations)
- Classes: [AnimationAction](#animationaction), [AnimationClip](#animationclip),
  [Animator](#animator), [Attribute](#attribute),
  [BasicMaterial](#basicmaterial), [CanvasTexture](#canvastexture),
  [DataTexture](#datatexture), [Fog](#fog), [Geometry](#geometry),
  [Group](#group), [Intersection](#intersection),
  [LambertMaterial](#lambertmaterial), [Line](#line),
  [LineMaterial](#linematerial), [Material](#material),
  [MaterialOptions](#materialoptions), [Mesh](#mesh), [Node](#node),
  [OrthographicCamera](#orthographiccamera),
  [PerspectiveCamera](#perspectivecamera),
  [PerspectiveCameraOptions](#perspectivecameraoptions), [Points](#points),
  [PointsMaterial](#pointsmaterial), [Raycaster](#raycaster),
  [Renderer](#renderer), [RenderTimings](#rendertimings), [Scene](#scene),
  [Texture](#texture), [ToonMaterial](#toonmaterial), [Track](#track).

## Declaration lookup fallback

Use this when a task needs an API not covered by bundled references.

1. Find installed package:

```bash
node -e 'console.log(require.resolve("@xsyetopz/easel/package.json"))'
```

1. Read root types:

```bash
sed -n '1,240p' node_modules/@xsyetopz/easel/dist/index.d.ts
```

1. Locate the class file from the export path in `index.d.ts`.

2. Read the class declaration and options interface.

3. Use only public declarations. Private `#private` members in `.d.ts` are not
   callable.

4. If declarations and source disagree, prefer declarations for app code and
   note the mismatch.

Typical files:

- Renderer: `dist/renderers/Renderer.d.ts`
- Geometry: `dist/geometry/Geometry.d.ts`
- Materials: `dist/materials/*.d.ts`
- Cameras: `dist/cameras/*.d.ts`
- Node/Scene/Raycaster: `dist/core/*.d.ts`
- Textures: `dist/textures/*.d.ts`
- Animation: `dist/animation/*.d.ts`
- Constants: `dist/core/Constants.d.ts`

## Generated class declarations

Generated from `@xsyetopz/easel@0.6.1` declaration files. Private fields
removed.

## AnimationAction

Source: `animation/AnimationAction.d.ts`

```ts
export declare class AnimationAction {
    enabled: boolean;
    weight: number;
    timeScale: number;
    time: number;
    loop: number;
    repetitions: number;
    clampWhenFinished: boolean;
    paused: boolean;
    _fadeTarget: number | undefined;
    _fadeDuration: number | undefined;
    _fadeElapsed: number | undefined;
    constructor(clip: AnimationClip, localRoot?: object | undefined);
    get clip(): AnimationClip;
    get localRoot(): object | undefined;
    play(): this;
    stop(): this;
    reset(): this;
    setLoop(mode: number, repetitions: number): this;
    setEffectiveWeight(weight: number): this;
    getEffectiveWeight(): number;
    /** Schedules weight to animate from 0 to 1 over duration seconds. */
    fadeIn(duration: number): this;
    /** Schedules weight to animate from 1 to 0 over duration seconds. */
    fadeOut(duration: number): this;
    /** Fades out another action while this one fades in. */
    crossFadeFrom(
        fadeOutAction: AnimationAction,
        duration: number,
        _warp?: boolean,
    ): this;
    /** Fades out this action while another fades in. */
    crossFadeTo(
        fadeInAction: AnimationAction,
        duration: number,
        _warp?: boolean,
    ): this;
    /** Called by Animator.update - exposed for internal use. */
    _update(delta: number): void;
}
```

## AnimationClip

Source: `animation/AnimationClip.d.ts`

```ts
export declare class AnimationClip {
    /**
     * @param name Clip name
     * @param duration Pass -1 to compute from tracks
     * @param tracks Array of keyframe tracks
     */
    constructor(name?: string, duration?: number, tracks?: Track[]);
    get name(): string;
    get duration(): number;
    get tracks(): Track[];
    /** Finds a clip by name in an array. */
    static findByName(
        clips: AnimationClip[],
        name: string,
    ): AnimationClip | undefined;
    /** Recomputes duration from the maximum keyframe time across all tracks. */
    resetDuration(): void;
    /** Removes keyframes outside [0, duration] from all tracks. */
    trim(): void;
    /** Removes redundant keyframes where the value does not change from the previous key. */
    optimize(): void;
}
```

## Animator

Source: `animation/Animator.d.ts`

```ts
export declare class Animator {
    constructor(root: object);
    get root(): object;
    get time(): number;
    /** Finds or creates an AnimationAction for the given clip. */
    clipAction(clip: AnimationClip): AnimationAction;
    /** Returns an existing action for the clip, or undefined. */
    existingAction(clip: AnimationClip): AnimationAction | undefined;
    /** Advances all enabled actions and applies blended property values. */
    update(delta: number): void;
    /** Stops and disables all actions. */
    stopAllAction(): void;
    /** Removes all actions and bindings for the given clip. */
    uncacheClip(clip: AnimationClip): void;
    /** Removes the action and associated mixers/bindings for the given clip. */
    uncacheAction(clip: AnimationClip): void;
}
```

## Attribute

Source: `geometry/Attribute.d.ts`

```ts
export declare class Attribute {
    needsUpdate: boolean;
    constructor(array: TypedArray | number[], itemSize: number);
    get array(): TypedArray;
    get itemSize(): number;
    get count(): number;
    getX(index: number): number;
    getY(index: number): number;
    getZ(index: number): number;
    getW(index: number): number;
    setX(index: number, x: number): this;
    setXY(index: number, x: number, y: number): this;
    setXYZ(index: number, x: number, y: number, z: number): this;
    setXYZW(index: number, x: number, y: number, z: number, w: number): this;
    clone(): Attribute;
}
```

## BasicMaterial

Source: `materials/BasicMaterial.d.ts`

```ts
export declare class BasicMaterial extends Material {
    type: string;
    color: Color;
    map: Texture | undefined;
    constructor(options?: BasicMaterialOptions);
    clone(): BasicMaterial;
    copy(source: BasicMaterial): this;
}
```

## CanvasTexture

Source: `textures/CanvasTexture.d.ts`

```ts
export declare class CanvasTexture extends Texture {
    /**
     * When true, the renderer sets `needsUpdate = true` before every frame so
     * the texture is re-uploaded from the canvas automatically.
     */
    autoUpdate: boolean;
    constructor(canvas: HTMLCanvasElement);
}
```

## DataTexture

Source: `textures/DataTexture.d.ts`

```ts
export declare class DataTexture extends Texture {
    constructor(data: Uint8ClampedArray, width: number, height: number);
    get data(): ImageData | undefined;
    get width(): number;
    get height(): number;
    dispose(): void;
}
```

## Fog

Source: `scenes/Fog.d.ts`

```ts
export declare class Fog {
    constructor({ color, near, far, density }?: FogOptions);
    get color(): Color;
    get near(): number;
    set near(value: number);
    get far(): number;
    set far(value: number);
    get density(): number;
    set density(value: number);
    get lut(): Float32Array;
    clone(): Fog;
}
```

## Geometry

Source: `geometry/Geometry.d.ts`

```ts
export declare class Geometry {
    id: number;
    name: string;
    type: string;
    parameters: Record<string, unknown>;
    boundingBox: unknown;
    boundingSphere: Sphere | undefined;
    /** Sets the position attribute from a flat array of xyz values. */
    setPositions(array: Float32Array | number[]): this;
    /** Sets the uv attribute from a flat array of uv pairs. */
    setUVs(array: Float32Array | number[]): this;
    /** Per-vertex color. First-class alongside positions and UVs. */
    setColors(array: Float32Array | number[]): this;
    /** Sets the normal attribute from a flat array of normal xyz triples. */
    setNormals(array: Float32Array | number[]): this;
    /** Sets the triangle index list. */
    setIndex(array: Uint16Array | Uint32Array | number[]): this;
    getAttribute(name: string): Attribute | undefined;
    setAttribute(name: string, attribute: Attribute): this;
    deleteAttribute(name: string): boolean;
    get index(): Uint16Array | Uint32Array | undefined;
    get attributes(): Map<string, Attribute>;
    /** Compute flat (cross-product per face) vertex normals. */
    computeVertexNormals(): this;
    /** Computes a minimal bounding sphere from the position attribute. */
    computeBoundingSphere(): this;
    dispose(): void;
}
```

## Group

Source: `objects/Group.d.ts`

```ts
export declare class Group extends Node {
    type: string;
}
```

## Intersection

Source: `core/Raycaster.d.ts`

```ts
export interface Intersection {
    distance: number;
    point: Vector3;
    face: {
        a: number;
        b: number;
        c: number;
        normal: Vector3 | undefined;
    };
    object: SceneObject;
}
```

## LambertMaterial

Source: `materials/LambertMaterial.d.ts`

```ts
export declare class LambertMaterial extends Material {
    type: string;
    color: Color;
    map: Texture | undefined;
    constructor(options?: LambertMaterialOptions);
    clone(): LambertMaterial;
    copy(source: LambertMaterial): this;
}
```

## Line

Source: `objects/Line.d.ts`

```ts
export declare class Line extends Node {
    type: string;
    geometry: Geometry | undefined;
    material: Material | undefined;
    constructor(
        geometry?: Geometry | undefined,
        material?: Material | undefined,
    );
    clone(): Line;
    copy(source: Line, recursive?: boolean): this;
}
```

## LineMaterial

Source: `materials/LineMaterial.d.ts`

```ts
export declare class LineMaterial extends Material {
    type: string;
    color: Color;
    linewidth: number;
    constructor(options?: LineMaterialOptions);
    clone(): LineMaterial;
    copy(source: LineMaterial): this;
}
```

## Material

Source: `materials/Material.d.ts`

```ts
export declare class Material {
    id: number;
    name: string;
    type: string;
    /** Draw order within a tile. Higher values draw later. */
    layer: number;
    /**
     * Discrete translucency. 0 = fully opaque, 8 = nearly transparent.
     * Nine steps, precomputed. Used for blending only when transparent is true.
     */
    opacity: number;
    /** Enables translucent blending. Opacity only blends when this is true. */
    transparent: boolean;
    /** Enables depth testing against the framebuffer depth buffer. */
    depthTest: boolean;
    /** Enables depth writes after a passing depth test. */
    depthWrite: boolean;
    /** Shading model: Shading.Flat or Shading.Gouraud. */
    shading: number;
    /** Face culling: Side.Front, Side.Back, or Side.Double. */
    side: number;
    visible: boolean;
    needsUpdate: boolean;
    constructor(options?: MaterialOptions);
    clone(): Material;
    copy(source: Material): this;
    dispose(): void;
}
```

## MaterialOptions

Source: `materials/Material.d.ts`

```ts
export interface MaterialOptions {
    layer?: number;
    opacity?: number;
    transparent?: boolean;
    depthTest?: boolean;
    depthWrite?: boolean;
    shading?: number;
    side?: number;
}
```

## Mesh

Source: `objects/Mesh.d.ts`

```ts
export declare class Mesh extends Node {
    type: string;
    geometry: Geometry | undefined;
    material: Material | undefined;
    constructor(
        geometry?: Geometry | undefined,
        material?: Material | undefined,
    );
    clone(): Mesh;
    copy(source: Mesh, recursive?: boolean): this;
}
```

## Node

Source: `core/Node.d.ts`

```ts
export declare class Node extends EventDispatcher {
    id: number;
    name: string;
    type: string;
    parent: Node | undefined;
    children: Node[];
    position: Vector3;
    scale: Vector3;
    matrix: Matrix4;
    matrixWorld: Matrix4;
    matrixWorldAutoUpdate: boolean;
    matrixWorldNeedsUpdate: boolean;
    visible: boolean;
    frustumCulled: boolean;
    layers: Layers;
    userData: Record<string, unknown>;
    constructor();
    get rotation(): Euler;
    set rotation(value: Euler);
    get quaternion(): Quaternion;
    set quaternion(value: Quaternion);
    get matrixAutoUpdate(): boolean;
    set matrixAutoUpdate(value: boolean);
    get autoUpdateMatrix(): boolean;
    set autoUpdateMatrix(value: boolean);
    add(object: Node): this;
    remove(object: Node): this;
    traverse(callback: (node: Node) => void): void;
    traverseVisible(callback: (node: Node) => void): void;
    lookAt(target: Vector3 | number, y?: number, z?: number): this;
    updateMatrix(): void;
    updateMatrixWorld(
        updateParents?: boolean,
        updateChildren?: boolean,
        force?: boolean,
    ): void;
    clone(): Node;
    copy(source: Node, recursive?: boolean): this;
}
```

## OrthographicCamera

Source: `cameras/OrthographicCamera.d.ts`

```ts
export declare class OrthographicCamera extends Camera {
    type: string;
    constructor({ left, right, top, bottom, near, far, tileSize }?: {
        bottom?: number | undefined;
        far?: number | undefined;
        left?: number | undefined;
        near?: number | undefined;
        right?: number | undefined;
        tileSize?: number | undefined;
        top?: number | undefined;
    });
    get left(): number;
    set left(value: number);
    get right(): number;
    set right(value: number);
    get top(): number;
    set top(value: number);
    get bottom(): number;
    set bottom(value: number);
    updateProjectionMatrix(): void;
    clone(): OrthographicCamera;
    copy(source: Camera, recursive?: boolean): this;
}
```

## PerspectiveCamera

Source: `cameras/PerspectiveCamera.d.ts`

```ts
export declare class PerspectiveCamera extends Camera {
    type: string;
    constructor(
        { fov, aspect, near, far, tileSize }?: PerspectiveCameraOptions,
    );
    get fov(): number;
    set fov(value: number);
    get aspect(): number;
    set aspect(value: number);
    updateProjectionMatrix(): void;
    clone(): PerspectiveCamera;
    copy(source: Camera, recursive?: boolean): this;
}
```

## PerspectiveCameraOptions

Source: `cameras/PerspectiveCamera.d.ts`

```ts
export interface PerspectiveCameraOptions {
    /** Vertical field of view in degrees. */
    fov?: number;
    /** Viewport width / height. */
    aspect?: number;
    near?: number;
    far?: number;
    tileSize?: number;
}
```

## Points

Source: `objects/Points.d.ts`

```ts
export declare class Points extends Node {
    type: string;
    geometry: Geometry | undefined;
    material: Material | undefined;
    constructor(
        geometry?: Geometry | undefined,
        material?: Material | undefined,
    );
    clone(): Points;
    copy(source: Points, recursive?: boolean): this;
}
```

## PointsMaterial

Source: `materials/PointsMaterial.d.ts`

```ts
export declare class PointsMaterial extends Material {
    type: string;
    color: Color;
    /** Integer pixel radius. */
    size: number;
    /** Signals the rasterizer to use point rendering. */
    points: boolean;
    map: Texture | undefined;
    constructor(options?: PointsMaterialOptions);
    /** Alias for {@link size}, used by the rasterizer. */
    get pointRadius(): number;
    clone(): PointsMaterial;
    copy(source: PointsMaterial): this;
}
```

## Raycaster

Source: `core/Raycaster.d.ts`

```ts
export declare class Raycaster {
    ray: Ray;
    near: number;
    far: number;
    camera: RaycastCamera | undefined;
    layers: Layers;
    /** Distance tolerance for Line and Points intersection tests. */
    threshold: number;
    constructor(
        origin?: Vector3,
        direction?: Vector3,
        near?: number,
        far?: number,
    );
    set(origin: Vector3, direction: Vector3): this;
    /** Sets the ray from a camera and normalized device coordinates. */
    setFromCamera(coords: {
        x: number;
        y: number;
    }, camera: RaycastCamera): this;
    intersectObject(
        object: SceneObject,
        recursive?: boolean,
        intersects?: Intersection[],
    ): Intersection[];
    intersectObjects(
        objects: SceneObject[],
        recursive?: boolean,
        intersects?: Intersection[],
    ): Intersection[];
}
```

## Renderer

Source: `renderers/Renderer.d.ts`

```ts
export declare class Renderer {
    sortObjects: boolean;
    constructor(options?: RendererOptions);
    get domElement(): HTMLCanvasElement | undefined;
    get width(): number;
    get height(): number;
    get pixelRatio(): number;
    /** Renders a scene from a camera's perspective. */
    render(scene: SceneLike, camera: CameraLike, timings?: RenderTimings): void;
    setSize(width: number, height: number): void;
    setPixelRatio(ratio: number): void;
    /**
     * Sets the clear color used when no fog or scene.background is present.
     *
     * Overloads:
     * - `setClearColor(color: Color)` -- Color instance with .r/.g/.b in [0, 1]
     * - `setClearColor(hex: number)` -- packed hex e.g. `0xff0000`
     * - `setClearColor(r, g, b)` -- three 0-255 integers (legacy)
     */
    setClearColor(rOrColor: Color | number, g?: number, b?: number): void;
    dispose(): void;
}
```

## RenderTimings

Source: `renderers/Renderer.d.ts`

```ts
export interface RenderTimings {
    clearMs?: number;
    traversalMs?: number;
    fogCullMs?: number;
    sortMs?: number;
    shadeRasterMs?: number;
    uploadMs?: number;
    totalMs?: number;
    profileTraversal?: boolean;
    travUpdateWorldMs?: number;
    travWalkMs?: number;
    travProjectMs?: number;
    travAssembleMs?: number;
    travDrawCalls?: number;
}
```

## Scene

Source: `core/Scene.d.ts`

```ts
export declare class Scene extends Node {
    type: string;
    /**
     * When true, the renderer calls updateMatrixWorld() on the scene
     * before traversal -- matching THREE.js behaviour.
     */
    autoUpdate: boolean;
    /** Scene-level fog. Set to a Fog instance or undefined. */
    fog: Fog | undefined;
    /**
     * Background painted before any geometry. Accepts a Color instance, a hex
     * number (e.g. 0xff0000), a screen-space Texture, or undefined (falls back
     * to setClearColor).
     */
    background: Color | number | Texture | undefined;
    clone(): Scene;
}
```

## Texture

Source: `textures/Texture.d.ts`

```ts
export declare class Texture {
    static BRIGHTNESS_LEVELS: number;
    id: number;
    name: string;
    wrapS: number;
    wrapT: number;
    image: ImageSource | undefined;
    constructor(image?: ImageSource | undefined);
    get needsUpdate(): boolean;
    set needsUpdate(value: boolean);
    /** Cached pixel data, clamped to 128x128. */
    get data(): ImageData | undefined;
    get width(): number;
    get height(): number;
    /**
     * Pre-multiplied brightness variants of the texture pixel data.
     * Lazily built on first access, invalidated on needsUpdate/dispose.
     */
    get brightnessLevels(): Uint8ClampedArray[] | undefined;
    clone(): Texture;
    dispose(): void;
}
```

## ToonMaterial

Source: `materials/ToonMaterial.d.ts`

```ts
export declare class ToonMaterial extends Material {
    type: string;
    color: Color;
    gradientMap: Texture | undefined;
    constructor(options?: ToonMaterialOptions);
    clone(): ToonMaterial;
    copy(source: ToonMaterial): this;
}
```

## Track

Source: `animation/Track.d.ts`

```ts
export declare class Track {
    constructor(
        name: string,
        times: Float32Array | number[],
        values: Float32Array | number[],
        itemSize?: number,
    );
    get name(): string;
    get times(): Float32Array;
    get values(): Float32Array;
    get itemSize(): number;
    /**
     * Linear interpolation between keyframes at index and index+1.
     * @param index Index of the keyframe just before time t
     * @param t0 Time of keyframe at index
     * @param t Current time
     * @param t1 Time of keyframe at index+1
     */
    interpolate(index: number, t0: number, t: number, t1: number): number[];
    /** Returns interpolated values at the given time using binary search. */
    getValueAtTime(time: number): number[];
}
```
