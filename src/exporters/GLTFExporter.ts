import type { AnimationClip } from "../animation/AnimationClip.ts";
import { Interpolation } from "../animation/Track.ts";
import type { Node } from "../core/Node.ts";
import type { Geometry } from "../geometry/Geometry.ts";
import type { Material } from "../materials/Material.ts";
import { Mesh } from "../objects/Mesh.ts";
import type { Texture } from "../textures/Texture.ts";
import type { MaterialLike, MutableDocument } from "./_GLTFInternals.ts";
import {
  BinaryBuilder,
  bounds,
  clamp,
  encodeBase64,
  finite,
  safeExtras,
  tuple3,
  tuple4,
} from "./_GLTFInternals.ts";

const ANIMATION_TRACK_PATTERN =
  /^(?:(?<selector>.+?)\.)?(?<path>position|quaternion|rotation|scale)(?:\[.*\])?$/u;
const NORMAL_ATTRIBUTE = "NORMAL";
const TANGENT_ATTRIBUTE = "TANGENT";
const TEXCOORD_ATTRIBUTE = "TEXCOORD_0";
const COLOR_ATTRIBUTE = "COLOR_0";
const SELECTOR_GROUP = "selector";
const PATH_GROUP = "path";
const ANIMATIONS_USER_DATA = "animations";

/** Options controlling deterministic CPU glTF 2.0 output. */
export interface GLTFExporterOptions {
  /** Embed the binary payload as a data URI in the buffer descriptor. */
  readonly embedBuffers?: boolean;
  /** External URI to record when binary embedding is disabled. */
  readonly bufferUri?: string;
  /** Animation clips to serialize instead of clips found in root user data. */
  readonly animations?: readonly AnimationClip[];
  /** Generator label stored in the glTF asset metadata. */
  readonly generator?: string;
  /** Normalize each exported normal vector before writing it. */
  readonly normalizeNormals?: boolean;
}
/** JSON document emitted by the CPU glTF exporter. */
export interface GLTFExportDocument {
  /** glTF asset version and exporter identification metadata. */
  readonly asset: {
    /** glTF specification version emitted by this exporter. */
    readonly version: "2.0";
    /** Human-readable generator label for the exported document. */
    readonly generator: string;
  };
  /** Index of the scene selected as the document's default scene. */
  readonly scene: number;
  /** Scene records containing root node indices. */
  readonly scenes: readonly GLTFExportScene[];
  /** Node hierarchy and transform records. */
  readonly nodes: readonly GLTFExportNode[];
  /** Mesh records containing triangle primitives. */
  readonly meshes: readonly GLTFExportMesh[];
  /** Binary buffer descriptors referenced by buffer views. */
  readonly buffers: readonly GLTFExportBuffer[];
  /** Byte ranges into the binary buffers. */
  readonly bufferViews: readonly GLTFExportBufferView[];
  /** Typed access into binary attribute and index data. */
  readonly accessors: readonly GLTFExportAccessor[];
  /** Material records when exported meshes use materials. */
  readonly materials?: readonly GLTFExportMaterial[];
  /** Texture records associated with exported images. */
  readonly textures?: readonly GLTFExportTexture[];
  /** Image source records referenced by textures. */
  readonly images?: readonly GLTFExportImage[];
  /** Sampler records used to sample exported textures. */
  readonly samplers?: readonly GLTFExportSampler[];
  /** Animation sampler and channel records. */
  readonly animations?: readonly GLTFExportAnimation[];
}
/** A glTF scene reference emitted by {@link GLTFExporter}. */
export interface GLTFExportScene {
  /** Optional source node name retained for the scene. */
  readonly name?: string;
  /** Indices of the scene's root nodes. */
  readonly nodes: readonly number[];
}
/** A glTF node with EASEL transform and hierarchy state. */
export interface GLTFExportNode {
  /** Optional scene-graph node name. */
  readonly name?: string;
  /** Index of the mesh attached to this node. */
  readonly mesh?: number;
  /** Translation applied to the node in local coordinates. */
  readonly translation: readonly [number, number, number];
  /** Unit quaternion describing the node's local rotation. */
  readonly rotation: readonly [number, number, number, number];
  /** Local scale along the x, y, and z axes. */
  readonly scale: readonly [number, number, number];
  /** Child node indices in document order. */
  readonly children?: readonly number[];
  /** JSON-safe application metadata copied to glTF extras. */
  readonly extras?: Readonly<Record<string, unknown>>;
}
/** One triangle primitive and its CPU-supported material. */
export interface GLTFExportMesh {
  /** Optional mesh name retained in the glTF record. */
  readonly name?: string;
  /**
   * The sole triangle primitive, referencing POSITION and any supported NORMAL,
   * TANGENT, TEXCOORD_0, or COLOR_0 accessors, its index accessor, and an
   * optional CPU-material mapping.
   */
  readonly primitives: readonly [GLTFExportPrimitive];
}
/** glTF primitive attribute/index/material references. */
export interface GLTFExportPrimitive {
  /** Map of glTF semantic names to accessor indices. */
  readonly attributes: Readonly<Record<string, number>>;
  /** Accessor index containing triangle vertex indices. */
  readonly indices: number;
  /** Optional material index applied to the primitive. */
  readonly material?: number;
  /** glTF triangles mode value emitted by the exporter. */
  readonly mode: 4;
}
/** Binary buffer descriptor. */
export interface GLTFExportBuffer {
  /** Total byte length of the buffer payload. */
  readonly byteLength: number;
  /** Optional URI for an externally stored binary payload. */
  readonly uri?: string;
}
/** Binary buffer view descriptor. */
export interface GLTFExportBufferView {
  /** Index of the buffer containing this byte range. */
  readonly buffer: 0;
  /** Byte offset from the start of the referenced buffer. */
  readonly byteOffset: number;
  /** Number of bytes in this view. */
  readonly byteLength: number;
  /** Optional glTF target identifying attributes or element indices. */
  readonly target?: 34962 | 34963;
}
/** Accessor descriptor for packed float attributes or integer indices. */
export interface GLTFExportAccessor {
  /** Index of the buffer view containing accessor data. */
  readonly bufferView: number;
  /** Optional byte offset within the referenced buffer view. */
  readonly byteOffset?: 0;
  /** glTF component type for floating-point or index data. */
  readonly componentType: 5123 | 5125 | 5126;
  /** Number of values or vectors represented by the accessor. */
  readonly count: number;
  /** Shape of each logical accessor element. */
  readonly type: "SCALAR" | "VEC2" | "VEC3" | "VEC4";
  /** Optional component-wise lower bounds for the accessor values. */
  readonly min?: readonly number[];
  /** Optional component-wise upper bounds for the accessor values. */
  readonly max?: readonly number[];
}
/** CPU material representation mapped to glTF PBR base-color semantics. */
export interface GLTFExportMaterial {
  /** Optional material name retained in the exported document. */
  readonly name?: string;
  /** Base-color, texture, and fixed metallic/roughness values. */
  readonly pbrMetallicRoughness: {
    /** RGBA factor multiplied with the material's base color. */
    readonly baseColorFactor: readonly [number, number, number, number];
    /** Optional exported texture index for the base color. */
    readonly baseColorTexture?: { readonly index: number };
    /** Fixed zero metallic factor used by the CPU export mapping. */
    readonly metallicFactor: 0;
    /** Fixed one roughness factor used by the CPU export mapping. */
    readonly roughnessFactor: 1;
  };
  /** Blend mode marker for discrete transparent materials. */
  readonly alphaMode?: "BLEND";
  /** Whether both sides of the material's triangles should be rendered. */
  readonly doubleSided?: boolean;
  /** JSON-safe material metadata describing the source material type. */
  readonly extras?: Readonly<Record<string, unknown>>;
}
/** glTF texture descriptor for a source URI retained by a CPU Texture. */
export interface GLTFExportTexture {
  /** Optional sampler index used to read the image. */
  readonly sampler?: number;
  /** Index of the image record supplying the texture pixels. */
  readonly source: number;
}
/** Image URI descriptor. Pixel payload encoding remains the host's responsibility. */
export interface GLTFExportImage {
  /** URI of the image payload retained by the exported document. */
  readonly uri?: string;
  /** Optional image name from the source texture. */
  readonly name?: string;
  /** JSON-safe application metadata attached to the image. */
  readonly extras?: Readonly<Record<string, unknown>>;
}
/** Nearest-neighbour sampler descriptor matching EASEL's CPU texture contract. */
export interface GLTFExportSampler {
  /** Nearest-neighbour magnification filter constant. */
  readonly magFilter: 9728;
  /** Nearest-neighbour minification filter constant. */
  readonly minFilter: 9728;
  /** Optional horizontal wrapping mode for texture coordinates. */
  readonly wrapS?: number;
  /** Optional vertical wrapping mode for texture coordinates. */
  readonly wrapT?: number;
}
/** glTF animation sampler/channel collection. */
export interface GLTFExportAnimation {
  /** Optional animation clip name. */
  readonly name?: string;
  /** Accessor mappings for animation input times and output values. */
  readonly samplers: readonly GLTFExportAnimationSampler[];
  /** Node channels that consume the animation samplers. */
  readonly channels: readonly GLTFExportAnimationChannel[];
}
/** Animation input/output accessor references. */
export interface GLTFExportAnimationSampler {
  /** Accessor index containing keyframe input times. */
  readonly input: number;
  /** Accessor index containing output transform values. */
  readonly output: number;
  /** Interpolation mode supported by the exporter. */
  readonly interpolation: "LINEAR" | "STEP";
}
/** Animation target node/path reference. */
export interface GLTFExportAnimationChannel {
  /** Index of the animated node. */
  readonly sampler: number;
  /** Node property targeted by the channel. */
  readonly target: {
    /** Index of the node receiving sampled values. */
    readonly node: number;
    /** Transform path updated by the channel. */
    readonly path: "translation" | "rotation" | "scale";
  };
}
/** Result containing both the JSON glTF document and its binary payload. */
export interface GLTFExportResult {
  /** JSON document describing the exported scene. */
  readonly json: GLTFExportDocument;
  /** Aligned binary payload referenced by the document. */
  readonly binary: Uint8Array;
  /** Data URI containing the binary payload for embedded delivery. */
  readonly dataUri: string;
}

interface ExportContext {
  readonly document: MutableDocument;
  readonly bytes: BinaryBuilder;
  readonly materialIndices: Map<Material, number>;
  readonly textureIndices: Map<string, number>;
  readonly samplerIndex: number;
  readonly normalizeNormals: boolean;
}
interface AttributeOptions {
  readonly type: "VEC2" | "VEC3" | "VEC4";
  readonly target: 34962;
  readonly includeBounds: boolean;
}
interface RawAccessorOptions {
  readonly type: "SCALAR" | "VEC2" | "VEC3" | "VEC4";
  readonly target?: 34962 | 34963;
  readonly includeBounds?: boolean;
}
interface AttributeLike {
  readonly count: number;
  readonly itemSize: number;
  getX(index: number): number;
  getY(index: number): number;
  getZ(index: number): number;
  getW?(index: number): number;
}

/** Serializes EASEL CPU scene meshes to deterministic glTF 2.0 JSON and binary. */
export class GLTFExporter {
  /** Synchronously serializes a scene graph to a JSON document and binary payload. */
  parse(root: Node, options?: GLTFExporterOptions): GLTFExportResult;
  /** THREE-shaped callback overload for hosts that prefer an asynchronous callback. */
  parse(
    root: Node,
    onDone: (result: GLTFExportResult) => void,
    onError?: (error: unknown) => void,
    options?: GLTFExporterOptions,
  ): void;
  /** Dispatches either synchronous or callback-style export. */
  parse(
    root: Node,
    optionsOrDone:
      | GLTFExporterOptions
      | ((result: GLTFExportResult) => void) = {},
    onError?: (error: unknown) => void,
    callbackOptions?: GLTFExporterOptions,
  ): GLTFExportResult | undefined {
    if (typeof optionsOrDone === "function") {
      try {
        optionsOrDone(this.#serialize(root, callbackOptions ?? {}));
      } catch (error) {
        onError?.(error);
      }
      return;
    }
    return this.#serialize(root, optionsOrDone);
  }
  /** Promise-shaped export matching THREE.GLTFExporter.parseAsync usage. */
  parseAsync(
    root: Node,
    options: GLTFExporterOptions = {},
  ): Promise<GLTFExportResult> {
    return Promise.resolve(this.#serialize(root, options));
  }
  #serialize(root: Node, options: GLTFExporterOptions): GLTFExportResult {
    root.updateMatrixWorld(true, true, true);
    const document = createDocument(options),
      context: ExportContext = {
        document,
        bytes: new BinaryBuilder(),
        materialIndices: new Map(),
        textureIndices: new Map(),
        samplerIndex: 0,
        normalizeNormals: options.normalizeNormals ?? true,
      };
    const nodeIndices = buildNodes(root, context);
    document.scenes.push({
      ...(root.name ? { name: root.name } : {}),
      nodes: [nodeIndices.get(root) ?? 0],
    });
    writeAnimations({
      root,
      clips: options.animations ?? animationsFromUserData(root),
      nodeIndices,
      context,
    });
    const binary = context.bytes.finish(),
      dataUri = `data:application/octet-stream;base64,${encodeBase64(binary)}`;
    document.buffers.push({
      byteLength: binary.byteLength,
      ...(options.embedBuffers === false
        ? { uri: options.bufferUri ?? "scene.bin" }
        : { uri: dataUri }),
    });
    return { json: document, binary, dataUri };
  }
}

function createDocument(options: GLTFExporterOptions): MutableDocument {
  return {
    asset: {
      version: "2.0",
      generator: options.generator ?? "EASEL.js GLTFExporter",
    },
    scene: 0,
    scenes: [],
    nodes: [],
    meshes: [],
    buffers: [],
    bufferViews: [],
    accessors: [],
    materials: [],
    textures: [],
    images: [],
    samplers: [],
    animations: [],
  };
}
function buildNodes(root: Node, context: ExportContext): Map<Node, number> {
  const nodeIndices = new Map<Node, number>();
  const build = (node: Node): number => {
    const index = context.document.nodes.length;
    nodeIndices.set(node, index);
    context.document.nodes.push({
      ...(node.name ? { name: node.name } : {}),
      translation: tuple3(node.position.x, node.position.y, node.position.z),
      rotation: tuple4(
        node.quaternion.x,
        node.quaternion.y,
        node.quaternion.z,
        node.quaternion.w,
      ),
      scale: tuple3(node.scale.x, node.scale.y, node.scale.z),
    });
    if (node instanceof Mesh && node.geometry)
      context.document.nodes[index] = {
        ...context.document.nodes[index],
        mesh: writeMesh(node, context),
      };
    const children = node.children.map(build);
    if (children.length > 0)
      context.document.nodes[index] = {
        ...context.document.nodes[index],
        children,
      };
    const extras = safeExtras(node.userData);
    if (Object.keys(extras).length > 0)
      context.document.nodes[index] = {
        ...context.document.nodes[index],
        extras,
      };
    return index;
  };
  build(root);
  return nodeIndices;
}

function writeMesh(mesh: Mesh, context: ExportContext): number {
  const geometry = mesh.geometry as Geometry,
    position = geometry.getAttribute("position");
  if (!position || position.itemSize < 3)
    throw new Error(
      `GLTFExporter: mesh "${mesh.name || mesh.type}" has no POSITION attribute.`,
    );
  const attributes: Record<string, number> = {
    POSITION: appendAttribute(context.document, context.bytes, position, {
      type: "VEC3",
      target: 34962,
      includeBounds: true,
    }),
  };
  appendMeshAttributes(geometry, attributes, context);
  const indices = geometry.index
      ? Array.from(geometry.index)
      : Array.from({ length: position.count }, (_value, index) => index),
    maxIndex = indices.reduce((max, value) => Math.max(max, value), 0),
    indexType = maxIndex > 65535 ? 5125 : 5123;
  const indexView = context.bytes.append(
      indexType === 5125 ? new Uint32Array(indices) : new Uint16Array(indices),
      context.document,
      34963,
    ),
    indexAccessor =
      context.document.accessors.push({
        bufferView: indexView.index,
        componentType: indexType,
        count: indices.length,
        type: "SCALAR",
        min: [0],
        max: [maxIndex],
      }) - 1;
  const primitive: GLTFExportPrimitive = {
    attributes,
    indices: indexAccessor,
    mode: 4,
    ...(mesh.material
      ? { material: materialIndex(mesh.material, context) }
      : {}),
  };
  const meshIndex = context.document.meshes.length;
  context.document.meshes.push({
    ...(mesh.name ? { name: mesh.name } : {}),
    primitives: [primitive],
  });
  return meshIndex;
}
function appendMeshAttributes(
  geometry: Geometry,
  attributes: Record<string, number>,
  context: ExportContext,
): void {
  const normal = geometry.getAttribute("normal");
  if (normal && normal.itemSize >= 3)
    attributes[NORMAL_ATTRIBUTE] = context.normalizeNormals
      ? appendNormalizedNormalAttribute(context.document, context.bytes, normal)
      : appendAttribute(context.document, context.bytes, normal, {
          type: "VEC3",
          target: 34962,
          includeBounds: false,
        });
  const tangent = geometry.getAttribute("tangent");
  if (tangent && tangent.itemSize >= 4)
    attributes[TANGENT_ATTRIBUTE] = appendAttribute(
      context.document,
      context.bytes,
      tangent,
      { type: "VEC4", target: 34962, includeBounds: false },
    );
  const uv = geometry.getAttribute("uv");
  if (uv && uv.itemSize >= 2)
    attributes[TEXCOORD_ATTRIBUTE] = appendAttribute(
      context.document,
      context.bytes,
      uv,
      { type: "VEC2", target: 34962, includeBounds: false },
    );
  const color = geometry.getAttribute("color");
  if (color && color.itemSize >= 3)
    attributes[COLOR_ATTRIBUTE] = appendAttribute(
      context.document,
      context.bytes,
      color,
      { type: "VEC3", target: 34962, includeBounds: false },
    );
}
function materialIndex(material: Material, context: ExportContext): number {
  const existing = context.materialIndices.get(material);
  if (existing !== undefined) return existing;
  const source = material as MaterialLike,
    color = source.color,
    alpha = source.transparent ? 1 - source.opacity / 8 : 1;
  let pbr: GLTFExportMaterial["pbrMetallicRoughness"] = {
    baseColorFactor: [
      clamp(color?.r ?? 1),
      clamp(color?.g ?? 1),
      clamp(color?.b ?? 1),
      clamp(alpha),
    ],
    metallicFactor: 0,
    roughnessFactor: 1,
  };
  const map = source.map;
  if (map) {
    const texture = textureIndex(map, context);
    if (texture !== undefined)
      pbr = { ...pbr, baseColorTexture: { index: texture } };
  }
  const result: GLTFExportMaterial = {
    ...(material.name ? { name: material.name } : {}),
    pbrMetallicRoughness: pbr,
    ...(source.transparent && alpha < 1 ? { alphaMode: "BLEND" as const } : {}),
    ...(material.side === 2 ? { doubleSided: true } : {}),
    extras: { easelMaterialType: material.type },
  };
  const index = context.document.materials.push(result) - 1;
  context.materialIndices.set(material, index);
  return index;
}
function textureIndex(
  texture: Texture,
  context: ExportContext,
): number | undefined {
  const source = texture.source.toJSON().url;
  if (typeof source !== "string" || source === "") return;
  const key = JSON.stringify([texture.uuid, source]),
    existing = context.textureIndices.get(key);
  if (existing !== undefined) return existing;
  const imageIndex = context.document.images.length,
    imageName = (texture as unknown as { readonly name: string }).name;
  context.document.images.push({
    uri: source,
    ...(imageName ? { name: imageName } : {}),
  });
  if (context.document.samplers.length === 0)
    context.document.samplers.push({
      magFilter: 9728,
      minFilter: 9728,
      wrapS: 33071,
      wrapT: 33071,
    });
  const index =
    context.document.textures.push({
      sampler: context.samplerIndex,
      source: imageIndex,
    }) - 1;
  context.textureIndices.set(key, index);
  return index;
}

function writeAnimations(options: {
  readonly root: Node;
  readonly clips: readonly AnimationClip[] | undefined;
  readonly nodeIndices: Map<Node, number>;
  readonly context: ExportContext;
}): void {
  if (!options.clips || options.clips.length === 0) return;
  const namedNodes = new Map<string, Node>();
  options.root.traverse((node) => {
    if (node.name && !namedNodes.has(node.name))
      namedNodes.set(node.name, node);
  });
  for (const clip of options.clips) {
    const animation = writeAnimation({
      clip,
      root: options.root,
      namedNodes,
      nodeIndices: options.nodeIndices,
      context: options.context,
    });
    if (animation) options.context.document.animations.push(animation);
  }
}
function writeAnimation(options: {
  readonly clip: AnimationClip;
  readonly root: Node;
  readonly namedNodes: Map<string, Node>;
  readonly nodeIndices: Map<Node, number>;
  readonly context: ExportContext;
}): GLTFExportAnimation | undefined {
  const json = options.clip.toJSON(),
    samplers: GLTFExportAnimationSampler[] = [],
    channels: GLTFExportAnimationChannel[] = [];
  for (const track of json.tracks ?? []) {
    const target = animationTarget(track.name, {
      root: options.root,
      namedNodes: options.namedNodes,
      nodeIndices: options.nodeIndices,
      itemSize: track.itemSize ?? 1,
    });
    if (!(target && hasFiniteValues(track.values))) continue;
    const input = appendRawAccessor(
        options.context.document,
        options.context.bytes,
        track.times,
        { type: "SCALAR" },
      ),
      output = appendRawAccessor(
        options.context.document,
        options.context.bytes,
        track.values as number[],
        { type: track.itemSize === 4 ? "VEC4" : "VEC3" },
      ),
      sampler = samplers.length;
    samplers.push({
      input,
      output,
      interpolation:
        track.interpolation === Interpolation.Discrete ? "STEP" : "LINEAR",
    });
    channels.push({ sampler, target });
  }
  if (channels.length === 0) return;
  return { ...(json.name ? { name: json.name } : {}), samplers, channels };
}
function appendAttribute(
  document: MutableDocument,
  bytes: BinaryBuilder,
  attribute: AttributeLike,
  options: AttributeOptions,
): number {
  const values: number[] = [];
  for (let index = 0; index < attribute.count; index++) {
    values.push(attribute.getX(index), attribute.getY(index));
    if (attribute.itemSize >= 3) values.push(attribute.getZ(index));
    if (attribute.itemSize >= 4) values.push(attribute.getW?.(index) ?? 1);
  }
  return appendRawAccessor(document, bytes, values, options);
}
function appendNormalizedNormalAttribute(
  document: MutableDocument,
  bytes: BinaryBuilder,
  attribute: {
    readonly count: number;
    getX(index: number): number;
    getY(index: number): number;
    getZ(index: number): number;
  },
): number {
  const values: number[] = [];
  for (let index = 0; index < attribute.count; index++) {
    const x = finite(attribute.getX(index)),
      y = finite(attribute.getY(index)),
      z = finite(attribute.getZ(index)),
      length = Math.sqrt(x * x + y * y + z * z);
    if (length > 0.0005) values.push(x / length, y / length, z / length);
    else values.push(1, 0, 0);
  }
  return appendRawAccessor(document, bytes, values, {
    type: "VEC3",
    target: 34962,
  });
}
function appendRawAccessor(
  document: MutableDocument,
  bytes: BinaryBuilder,
  values: readonly number[],
  options: RawAccessorOptions,
): number {
  const components =
    options.type === "SCALAR" ? 1 : Number(options.type.slice(3));
  if (values.length % components !== 0)
    throw new RangeError(
      `GLTFExporter: ${options.type} accessor has incomplete values.`,
    );
  const view = bytes.append(new Float32Array(values), document, options.target),
    accessor: GLTFExportAccessor = {
      bufferView: view.index,
      componentType: 5126,
      count: values.length / components,
      type: options.type,
      ...(options.includeBounds ? bounds(values, components) : {}),
    };
  return document.accessors.push(accessor) - 1;
}
function animationTarget(
  name: string,
  options: {
    readonly root: Node;
    readonly namedNodes: Map<string, Node>;
    readonly nodeIndices: Map<Node, number>;
    readonly itemSize: number;
  },
): GLTFExportAnimationChannel["target"] | undefined {
  const parts = ANIMATION_TRACK_PATTERN.exec(name);
  if (!parts) return;
  const selector = parts.groups?.[SELECTOR_GROUP],
    pathName = parts.groups?.[PATH_GROUP],
    node = selector ? options.namedNodes.get(selector) : options.root,
    index = node ? options.nodeIndices.get(node) : undefined;
  if (index === undefined) return;
  let path: "translation" | "rotation" | "scale";
  if (pathName === "position") path = "translation";
  else if (pathName === "scale") path = "scale";
  else path = "rotation";
  if (options.itemSize !== (path === "rotation" ? 4 : 3)) return;
  return { node: index, path };
}
function animationsFromUserData(
  root: Node,
): readonly AnimationClip[] | undefined {
  const value = root.userData[ANIMATIONS_USER_DATA];
  if (!Array.isArray(value)) return;
  return value.filter(
    (clip): clip is AnimationClip =>
      typeof clip === "object" &&
      clip !== null &&
      typeof (clip as AnimationClip).toJSON === "function",
  );
}
function hasFiniteValues(values: readonly unknown[]): values is number[] {
  return values.every(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );
}
