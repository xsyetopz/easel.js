import type { AnimationClip } from "../animation/AnimationClip.ts";
import { Interpolation } from "../animation/Track.ts";
import type { Node } from "../core/Node.ts";
import type { Material } from "../materials/Material.ts";
import { Mesh } from "../objects/Mesh.ts";
import type { Texture } from "../textures/Texture.ts";

/** Options controlling deterministic CPU glTF 2.0 output. */
export interface GLTFExporterOptions {
  /** Embeds the binary payload as a data URI in the JSON document. Defaults to true. */
  readonly embedBuffers?: boolean;
  /** URI used when {@link embedBuffers} is false. Defaults to `scene.bin`. */
  readonly bufferUri?: string;
  /** Animation clips to serialize as glTF animation channels. */
  readonly animations?: readonly AnimationClip[];
  /** Generator label written into the glTF asset metadata. */
  readonly generator?: string;
  /** Normalizes every exported NORMAL attribute; defaults to true. */
  readonly normalizeNormals?: boolean;
}

/** JSON document emitted by the CPU glTF exporter. */
export interface GLTFExportDocument {
  /** glTF asset metadata. */
  readonly asset: { readonly version: "2.0"; readonly generator: string };
  /** Active scene index. */
  readonly scene: number;
  /** Scene descriptions in document order. */
  readonly scenes: readonly GLTFExportScene[];
  /** Node hierarchy records. */
  readonly nodes: readonly GLTFExportNode[];
  /** Mesh primitive records. */
  readonly meshes: readonly GLTFExportMesh[];
  /** Binary buffer descriptors. */
  readonly buffers: readonly GLTFExportBuffer[];
  /** Binary buffer-view descriptors. */
  readonly bufferViews: readonly GLTFExportBufferView[];
  /** Accessor descriptors. */
  readonly accessors: readonly GLTFExportAccessor[];
  /** CPU-supported material records. */
  readonly materials?: readonly GLTFExportMaterial[];
  /** Texture records referencing exported images. */
  readonly textures?: readonly GLTFExportTexture[];
  /** Image URI records. */
  readonly images?: readonly GLTFExportImage[];
  /** Nearest-neighbour sampler records. */
  readonly samplers?: readonly GLTFExportSampler[];
  /** Exported animation records. */
  readonly animations?: readonly GLTFExportAnimation[];
}

/** A glTF scene reference emitted by {@link GLTFExporter}. */
export interface GLTFExportScene {
  /** Optional scene name. */
  readonly name?: string;
  /** Root node indices. */
  readonly nodes: readonly number[];
}

/** A glTF node with EASEL transform and hierarchy state. */
export interface GLTFExportNode {
  /** Optional node name. */
  readonly name?: string;
  /** Mesh index attached to the node. */
  readonly mesh?: number;
  /** Translation in parent space. */
  readonly translation: readonly [number, number, number];
  /** Quaternion rotation in parent space. */
  readonly rotation: readonly [number, number, number, number];
  /** Scale in parent space. */
  readonly scale: readonly [number, number, number];
  /** Child node indices. */
  readonly children?: readonly number[];
  /** JSON-safe application metadata. */
  readonly extras?: Readonly<Record<string, unknown>>;
}

/** One triangle primitive and its CPU-supported material. */
export interface GLTFExportMesh {
  /** Optional mesh name. */
  readonly name?: string;
  /** Triangle primitives in this mesh. */
  readonly primitives: readonly [GLTFExportPrimitive];
}

/** glTF primitive attribute/index/material references. */
export interface GLTFExportPrimitive {
  /** Attribute semantic to accessor index mapping. */
  readonly attributes: Readonly<Record<string, number>>;
  /** Index accessor. */
  readonly indices: number;
  /** Material index. */
  readonly material?: number;
  /** glTF primitive mode; always triangles. */
  readonly mode: 4;
}

/** Binary buffer descriptor. */
export interface GLTFExportBuffer {
  /** Number of bytes in the binary payload. */
  readonly byteLength: number;
  /** Embedded data URI or external buffer URI. */
  readonly uri?: string;
}

/** Binary buffer view descriptor. */
export interface GLTFExportBufferView {
  /** Buffer index; exporter emits one buffer. */
  readonly buffer: 0;
  /** Byte offset into the buffer. */
  readonly byteOffset: number;
  /** Number of bytes in the view. */
  readonly byteLength: number;
  /** Optional ARRAY_BUFFER or ELEMENT_ARRAY_BUFFER target. */
  readonly target?: 34962 | 34963;
}

/** Accessor descriptor for packed float attributes or integer indices. */
export interface GLTFExportAccessor {
  /** Buffer-view index containing the accessor data. */
  readonly bufferView: number;
  /** Byte offset within the buffer view. */
  readonly byteOffset?: 0;
  /** Accessor component type. */
  readonly componentType: 5123 | 5125 | 5126;
  /** Number of elements. */
  readonly count: number;
  /** Element shape. */
  readonly type: "SCALAR" | "VEC2" | "VEC3" | "VEC4";
  /** Per-component minimum values. */
  readonly min?: readonly number[];
  /** Per-component maximum values. */
  readonly max?: readonly number[];
}

/** CPU material representation mapped to glTF PBR base-color semantics. */
export interface GLTFExportMaterial {
  /** Optional material name. */
  readonly name?: string;
  /** CPU material mapped to glTF base-color PBR fields. */
  readonly pbrMetallicRoughness: {
    /** RGBA base-color factor. */
    readonly baseColorFactor: readonly [number, number, number, number];
    /** Optional base-color texture index. */
    readonly baseColorTexture?: { readonly index: number };
    /** EASEL materials export as non-metallic. */
    readonly metallicFactor: 0;
    /** EASEL materials export with full roughness. */
    readonly roughnessFactor: 1;
  };
  /** Blend mode when discrete opacity is below opaque. */
  readonly alphaMode?: "BLEND";
  /** Whether both triangle sides are retained. */
  readonly doubleSided?: boolean;
  /** Source material metadata. */
  readonly extras?: Readonly<Record<string, unknown>>;
}

/** glTF texture descriptor for a source URI retained by a CPU Texture. */
export interface GLTFExportTexture {
  /** Sampler index. */
  readonly sampler?: number;
  /** Image source index. */
  readonly source: number;
}

/** Image URI descriptor. Pixel payload encoding remains the host's responsibility. */
export interface GLTFExportImage {
  /** Image URL or data URI. */
  readonly uri?: string;
  /** Optional image name. */
  readonly name?: string;
  /** Source image metadata. */
  readonly extras?: Readonly<Record<string, unknown>>;
}

/** Nearest-neighbour sampler descriptor matching EASEL's CPU texture contract. */
export interface GLTFExportSampler {
  /** Magnification filter; nearest only. */
  readonly magFilter: 9728;
  /** Minification filter; nearest only. */
  readonly minFilter: 9728;
  /** Optional S wrapping mode. */
  readonly wrapS?: number;
  /** Optional T wrapping mode. */
  readonly wrapT?: number;
}

/** glTF animation sampler/channel collection. */
export interface GLTFExportAnimation {
  /** Optional animation name. */
  readonly name?: string;
  /** Animation sampler records. */
  readonly samplers: readonly GLTFExportAnimationSampler[];
  /** Animation target channels. */
  readonly channels: readonly GLTFExportAnimationChannel[];
}

/** Animation input/output accessor references. */
export interface GLTFExportAnimationSampler {
  /** Input time accessor index. */
  readonly input: number;
  /** Output value accessor index. */
  readonly output: number;
  /** Interpolation mode. */
  readonly interpolation: "LINEAR" | "STEP";
}

/** Animation target node/path reference. */
export interface GLTFExportAnimationChannel {
  /** Sampler index. */
  readonly sampler: number;
  /** Target node and transform path. */
  readonly target: {
    readonly node: number;
    readonly path: "translation" | "rotation" | "scale";
  };
}

/** Result containing both the JSON glTF document and its binary payload. */
export interface GLTFExportResult {
  /** JSON glTF document. */
  readonly json: GLTFExportDocument;
  /** Binary payload used by buffer views. */
  readonly binary: Uint8Array;
  /** Data URI for the binary payload. */
  readonly dataUri: string;
}

interface BufferViewWithTarget {
  readonly index: number;
  readonly byteOffset: number;
  readonly byteLength: number;
}

interface MutableDocument {
  asset: { version: "2.0"; generator: string };
  scene: number;
  scenes: GLTFExportScene[];
  nodes: GLTFExportNode[];
  meshes: GLTFExportMesh[];
  buffers: GLTFExportBuffer[];
  bufferViews: GLTFExportBufferView[];
  accessors: GLTFExportAccessor[];
  materials: GLTFExportMaterial[];
  textures: GLTFExportTexture[];
  images: GLTFExportImage[];
  samplers: GLTFExportSampler[];
  animations: GLTFExportAnimation[];
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
  ): GLTFExportResult | void {
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
  async parseAsync(
    root: Node,
    options: GLTFExporterOptions = {},
  ): Promise<GLTFExportResult> {
    return this.#serialize(root, options);
  }

  #serialize(root: Node, options: GLTFExporterOptions): GLTFExportResult {
    root.updateMatrixWorld(true, true, true);
    const document: MutableDocument = {
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
    const bytes = new BinaryBuilder();
    const nodeIndices = new Map<Node, number>();
    const meshIndices = new Map<Mesh, number>();
    const materialIndices = new Map<Material, number>();
    const textureIndices = new Map<string, number>();
    const samplerIndex = 0;
    const buildNode = (node: Node): number => {
      const index = document.nodes.length;
      nodeIndices.set(node, index);
      document.nodes.push({
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
      const mesh = node instanceof Mesh && node.geometry ? node : undefined;
      if (mesh) {
        const meshIndex = this.#writeMesh(
          mesh,
          document,
          bytes,
          materialIndices,
          textureIndices,
          samplerIndex,
          options.normalizeNormals ?? true,
        );
        meshIndices.set(mesh, meshIndex);
        document.nodes[index] = { ...document.nodes[index]!, mesh: meshIndex };
      }
      const children = node.children.map(buildNode);
      if (children.length > 0)
        document.nodes[index] = { ...document.nodes[index]!, children };
      const extras = safeExtras(node.userData);
      if (Object.keys(extras).length > 0)
        document.nodes[index] = { ...document.nodes[index]!, extras };
      return index;
    };
    const rootIndex = buildNode(root);
    document.scenes.push({
      ...(root.name ? { name: root.name } : {}),
      nodes: [rootIndex],
    });
    this.#writeAnimations(
      root,
      options.animations ?? animationsFromUserData(root),
      nodeIndices,
      document,
      bytes,
    );
    const binary = bytes.finish();
    const dataUri = `data:application/octet-stream;base64,${encodeBase64(binary)}`;
    document.buffers.push({
      byteLength: binary.byteLength,
      ...(options.embedBuffers === false
        ? { uri: options.bufferUri ?? "scene.bin" }
        : { uri: dataUri }),
    });
    return { json: document, binary, dataUri };
  }

  #writeMesh(
    mesh: Mesh,
    document: MutableDocument,
    bytes: BinaryBuilder,
    materialIndices: Map<Material, number>,
    textureIndices: Map<string, number>,
    samplerIndex: number,
    normalizeNormals: boolean,
  ): number {
    const geometry = mesh.geometry!;
    const position = geometry.getAttribute("position");
    if (!position || position.itemSize < 3)
      throw new Error(
        `GLTFExporter: mesh "${mesh.name || mesh.type}" has no POSITION attribute.`,
      );
    const attributes: Record<string, number> = {};
    attributes["POSITION"] = appendAttribute(
      document,
      bytes,
      position,
      "VEC3",
      34962,
      true,
    );
    const normal = geometry.getAttribute("normal");
    if (normal && normal.itemSize >= 3) {
      attributes["NORMAL"] = normalizeNormals
        ? appendNormalizedNormalAttribute(document, bytes, normal)
        : appendAttribute(document, bytes, normal, "VEC3", 34962, false);
    }
    const tangent = geometry.getAttribute("tangent");
    if (tangent && tangent.itemSize >= 4) {
      attributes["TANGENT"] = appendAttribute(
        document,
        bytes,
        tangent,
        "VEC4",
        34962,
        false,
      );
    }
    const uv = geometry.getAttribute("uv");
    if (uv && uv.itemSize >= 2)
      attributes["TEXCOORD_0"] = appendAttribute(
        document,
        bytes,
        uv,
        "VEC2",
        34962,
        false,
      );
    const color = geometry.getAttribute("color");
    if (color && color.itemSize >= 3)
      attributes["COLOR_0"] = appendAttribute(
        document,
        bytes,
        color,
        "VEC3",
        34962,
        false,
      );
    const indices = geometry.index
      ? Array.from(geometry.index)
      : Array.from({ length: position.count }, (_value, index) => index);
    const maxIndex = indices.reduce((max, value) => Math.max(max, value), 0);
    const indexType = maxIndex > 65535 ? 5125 : 5123;
    const indexView = bytes.append(
      indexType === 5125 ? new Uint32Array(indices) : new Uint16Array(indices),
      document,
      34963,
    );
    const indexAccessor =
      document.accessors.push({
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
        ? {
            material: this.#materialIndex(
              mesh.material,
              document,
              materialIndices,
              textureIndices,
              samplerIndex,
            ),
          }
        : {}),
    };
    const meshIndex = document.meshes.length;
    document.meshes.push({
      ...(mesh.name ? { name: mesh.name } : {}),
      primitives: [primitive],
    });
    return meshIndex;
  }

  #materialIndex(
    material: Material,
    document: MutableDocument,
    materialIndices: Map<Material, number>,
    textureIndices: Map<string, number>,
    samplerIndex: number,
  ): number {
    const existing = materialIndices.get(material);
    if (existing !== undefined) return existing;
    const source = material as MaterialLike;
    const color = source.color;
    const alpha = source.transparent ? 1 - source.opacity / 8 : 1;
    const baseColor: [number, number, number, number] = [
      clamp(color?.r ?? 1),
      clamp(color?.g ?? 1),
      clamp(color?.b ?? 1),
      clamp(alpha),
    ];
    let pbr: GLTFExportMaterial["pbrMetallicRoughness"] = {
      baseColorFactor: baseColor,
      metallicFactor: 0,
      roughnessFactor: 1,
    };
    const map = source.map;
    const extras: Record<string, unknown> = {
      easelMaterialType: material.type,
    };
    if (map) {
      const textureIndex = this.#textureIndex(
        map,
        document,
        textureIndices,
        samplerIndex,
      );
      if (textureIndex !== undefined)
        pbr = { ...pbr, baseColorTexture: { index: textureIndex } };
    }
    const result: GLTFExportMaterial = {
      ...(material.name ? { name: material.name } : {}),
      pbrMetallicRoughness: pbr,
      ...(source.transparent && alpha < 1
        ? { alphaMode: "BLEND" as const }
        : {}),
      ...(material.side === 2 ? { doubleSided: true } : {}),
      extras,
    };
    const index = document.materials.push(result) - 1;
    materialIndices.set(material, index);
    return index;
  }

  #textureIndex(
    texture: Texture,
    document: MutableDocument,
    textureIndices: Map<string, number>,
    samplerIndex: number,
  ): number | undefined {
    const source = texture.source.toJSON().url;
    if (typeof source !== "string" || source === "") return;
    const key = JSON.stringify([texture.uuid, source]);
    const existing = textureIndices.get(key);
    if (existing !== undefined) return existing;
    const imageIndex = document.images.length;
    document.images.push({
      uri: source,
      ...(texture.name ? { name: texture.name } : {}),
    });
    if (document.samplers.length === 0)
      document.samplers.push({
        magFilter: 9728,
        minFilter: 9728,
        wrapS: 33071,
        wrapT: 33071,
      });
    const index =
      document.textures.push({ sampler: samplerIndex, source: imageIndex }) - 1;
    textureIndices.set(key, index);
    return index;
  }

  #writeAnimations(
    root: Node,
    clips: readonly AnimationClip[] | undefined,
    nodeIndices: Map<Node, number>,
    document: MutableDocument,
    bytes: BinaryBuilder,
  ): void {
    if (!clips || clips.length === 0) return;
    const namedNodes = new Map<string, Node>();
    root.traverse((node) => {
      if (node.name && !namedNodes.has(node.name))
        namedNodes.set(node.name, node);
    });
    for (const clip of clips) {
      const json = clip.toJSON();
      const samplers: GLTFExportAnimationSampler[] = [];
      const channels: GLTFExportAnimationChannel[] = [];
      for (const track of json.tracks ?? []) {
        const target = animationTarget(
          track.name,
          root,
          namedNodes,
          nodeIndices,
          track.itemSize ?? 1,
        );
        if (
          !(
            target &&
            track.values.every(
              (value): value is number =>
                typeof value === "number" && Number.isFinite(value),
            )
          )
        )
          continue;
        const input = appendRawAccessor(document, bytes, track.times, "SCALAR");
        const output = appendRawAccessor(
          document,
          bytes,
          track.values as number[],
          track.itemSize === 4 ? "VEC4" : "VEC3",
        );
        const sampler = samplers.length;
        samplers.push({
          input,
          output,
          interpolation:
            track.interpolation === Interpolation.Discrete ? "STEP" : "LINEAR",
        });
        channels.push({ sampler, target });
      }
      if (channels.length > 0)
        document.animations.push({
          ...(json.name ? { name: json.name } : {}),
          samplers,
          channels,
        });
    }
  }
}

interface MaterialLike {
  readonly type: string;
  readonly name: string;
  readonly color?: {
    readonly r: number;
    readonly g: number;
    readonly b: number;
  };
  readonly map?: Texture;
  readonly transparent: boolean;
  readonly opacity: number;
  readonly side: number;
}

function appendAttribute(
  document: MutableDocument,
  bytes: BinaryBuilder,
  attribute: {
    readonly count: number;
    readonly itemSize: number;
    getX(index: number): number;
    getY(index: number): number;
    getZ(index: number): number;
    getW?(index: number): number;
  },
  type: "VEC2" | "VEC3" | "VEC4",
  target: 34962,
  includeBounds: boolean,
): number {
  const values: number[] = [];
  for (let index = 0; index < attribute.count; index++) {
    values.push(attribute.getX(index), attribute.getY(index));
    if (attribute.itemSize >= 3) values.push(attribute.getZ(index));
    if (attribute.itemSize >= 4) values.push(attribute.getW?.(index) ?? 1);
  }
  return appendRawAccessor(
    document,
    bytes,
    values,
    type,
    target,
    includeBounds,
  );
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
    const x = finite(attribute.getX(index));
    const y = finite(attribute.getY(index));
    const z = finite(attribute.getZ(index));
    const length = Math.sqrt(x * x + y * y + z * z);
    if (length > 0.0005) {
      values.push(x / length, y / length, z / length);
    } else {
      values.push(1, 0, 0);
    }
  }
  return appendRawAccessor(document, bytes, values, "VEC3", 34962, false);
}

function appendRawAccessor(
  document: MutableDocument,
  bytes: BinaryBuilder,
  values: readonly number[],
  type: "SCALAR" | "VEC2" | "VEC3" | "VEC4",
  target?: 34962 | 34963,
  includeBounds = false,
): number {
  const components = type === "SCALAR" ? 1 : Number(type.slice(3));
  if (values.length % components !== 0)
    throw new RangeError(
      `GLTFExporter: ${type} accessor has incomplete values.`,
    );
  const view = bytes.append(new Float32Array(values), document, target);
  const count = values.length / components;
  const accessor: GLTFExportAccessor = {
    bufferView: view.index,
    componentType: 5126,
    count,
    type,
    ...(includeBounds ? bounds(values, components) : {}),
  };
  return document.accessors.push(accessor) - 1;
}

function bounds(
  values: readonly number[],
  components: number,
): { min: number[]; max: number[] } {
  const min = new Array<number>(components).fill(Number.POSITIVE_INFINITY);
  const max = new Array<number>(components).fill(Number.NEGATIVE_INFINITY);
  for (let index = 0; index < values.length; index++) {
    const component = index % components;
    min[component] = Math.min(min[component]!, values[index]!);
    max[component] = Math.max(max[component]!, values[index]!);
  }
  return { min, max };
}

function animationTarget(
  name: string,
  root: Node,
  namedNodes: Map<string, Node>,
  nodeIndices: Map<Node, number>,
  itemSize: number,
): GLTFExportAnimationChannel["target"] | undefined {
  const parts = name.match(
    /^(?:(.+?)\.)?(position|quaternion|rotation|scale)(?:\[.*\])?$/u,
  );
  if (!parts) return;
  const selector = parts[1];
  const pathName = parts[2];
  const node = selector ? namedNodes.get(selector) : root;
  const index = node ? nodeIndices.get(node) : undefined;
  if (index === undefined) return;
  const path =
    pathName === "position"
      ? "translation"
      : pathName === "scale"
        ? "scale"
        : "rotation";
  const expected = path === "rotation" ? 4 : 3;
  if (itemSize !== expected) return;
  return { node: index, path };
}

function animationsFromUserData(
  root: Node,
): readonly AnimationClip[] | undefined {
  const value = root.userData["animations"];
  if (!Array.isArray(value)) return;
  return value.filter(
    (clip): clip is AnimationClip =>
      typeof clip === "object" &&
      clip !== null &&
      typeof (clip as AnimationClip).toJSON === "function",
  );
}

function safeExtras(
  value: Record<string, unknown>,
): Readonly<Record<string, unknown>> {
  if (Object.keys(value).length === 0) return {};
  try {
    const json = JSON.parse(JSON.stringify(value)) as unknown;
    return json && typeof json === "object" && !Array.isArray(json)
      ? (json as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function tuple3(x: number, y: number, z: number): [number, number, number] {
  return [finite(x), finite(y), finite(z)];
}
function tuple4(
  x: number,
  y: number,
  z: number,
  w: number,
): [number, number, number, number] {
  return [finite(x), finite(y), finite(z), finite(w)];
}
function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
function clamp(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

class BinaryBuilder {
  readonly #bytes: number[] = [];

  append(
    values: Float32Array | Uint16Array | Uint32Array,
    document: MutableDocument,
    target?: 34962 | 34963,
  ): BufferViewWithTarget {
    while (this.#bytes.length % 4 !== 0) this.#bytes.push(0);
    const byteOffset = this.#bytes.length;
    const view = new Uint8Array(
      values.buffer,
      values.byteOffset,
      values.byteLength,
    );
    for (const byte of view) this.#bytes.push(byte);
    const byteLength = view.byteLength;
    const index =
      document.bufferViews.push({
        buffer: 0,
        byteOffset,
        byteLength,
        ...(target === undefined ? {} : { target }),
      }) - 1;
    return { index, byteOffset, byteLength };
  }

  finish(): Uint8Array {
    while (this.#bytes.length % 4 !== 0) this.#bytes.push(0);
    return Uint8Array.from(this.#bytes);
  }
}

function encodeBase64(bytes: Uint8Array): string {
  if (typeof globalThis.btoa === "function") {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return globalThis.btoa(binary);
  }
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] ?? 0;
    const b = bytes[index + 1];
    const c = bytes[index + 2];
    result += alphabet[a >> 2];
    result += alphabet[((a & 3) << 4) | ((b ?? 0) >> 4)];
    result +=
      b === undefined ? "=" : alphabet[((b & 15) << 2) | ((c ?? 0) >> 6)];
    result += c === undefined ? "=" : alphabet[c & 63];
  }
  return result;
}
