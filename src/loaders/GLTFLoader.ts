import { OrthographicCamera } from "../cameras/OrthographicCamera.ts";
import { PerspectiveCamera } from "../cameras/PerspectiveCamera.ts";
import { Side } from "../core/Constants.ts";
import type { Node } from "../core/Node.ts";
import { Scene } from "../core/Scene.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { BasicMaterial } from "../materials/BasicMaterial.ts";
import { LambertMaterial } from "../materials/LambertMaterial.ts";
import type { Material } from "../materials/Material.ts";
import { Color } from "../math/Color.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { Quaternion } from "../math/Quaternion.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Group } from "../objects/Group.ts";
import { InstancedMesh } from "../objects/InstancedMesh.ts";
import { LOD } from "../objects/LOD.ts";
import { Mesh } from "../objects/Mesh.ts";
import type { Texture } from "../textures/Texture.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";

/** JSON-shaped glTF 2.0 document accepted by the CPU parser. */
export type GLTFDocument = Readonly<Record<string, unknown>>;

/** CPU texture supplied by an application for a glTF texture index. */
export type GLTFTextureMap =
  | ReadonlyMap<number, Texture>
  | Readonly<Record<number | string, Texture>>;

/** Options controlling glTF CPU material selection and buffer resolution. */
export interface GLTFLoaderOptions {
  /** Selects the supported CPU material implementation. Defaults to Lambert. */
  readonly materialType?: "basic" | "lambert";
  /** Existing decoded CPU textures keyed by glTF texture index. */
  readonly textures?: GLTFTextureMap;
  /** Buffer payloads supplied by a host for URI-less or external buffers. */
  readonly buffers?: ReadonlyArray<ArrayBuffer | ArrayBufferView | undefined>;
  /** Binary chunk used for a URI-less first buffer in a .glb-style document. */
  readonly binaryChunk?: ArrayBuffer | ArrayBufferView;
  /** Multiplier used when converting MSFT_lod screen coverage to distances. */
  readonly lodDistanceScale?: number;
}

/** Decoded source attribute used to construct CPU instances. */
export interface GLTFInstanceAttributeInfo {
  /** glTF instance attribute semantic, including custom underscore-prefixed names. */
  readonly semantic: string;
  /** Source accessor index. */
  readonly accessor: number;
  /** Source accessor component type. */
  readonly type: string;
  /** Number of instances represented by this attribute. */
  readonly count: number;
  /** Decoded values in accessor order. */
  readonly values: readonly number[];
  /** Whether the source accessor normalized integer values before decoding. */
  readonly normalized: boolean;
}

/** CPU representation of an EXT_mesh_gpu_instancing node extension. */
export interface GLTFNodeInstancingInfo {
  /** Source node index carrying the extension. */
  readonly node: number;
  /** Number of instances decoded from the extension attributes. */
  readonly count: number;
  /** Decoded source attributes keyed by semantic. */
  readonly attributes: Readonly<Record<string, GLTFInstanceAttributeInfo>>;
}

/** CPU representation of an MSFT_lod node extension. */
export interface GLTFNodeLODInfo {
  /** Source node index carrying the extension. */
  readonly node: number;
  /** Source node indices ordered from highest to lowest detail. */
  readonly ids: readonly number[];
  /** Optional MSFT_screencoverage hints copied from node extras. */
  readonly screenCoverage: readonly number[] | undefined;
}

/** Source material mapping for one KHR_materials_variants primitive entry. */
export interface GLTFVariantMapping {
  /** Source mesh index. */
  readonly mesh: number;
  /** Source primitive index within the mesh. */
  readonly primitive: number;
  /** Material selected by this mapping. */
  readonly material: number;
  /** Variant indices that select the mapped material. */
  readonly variants: readonly number[];
}

/** Named KHR_materials_variants entry. */
export interface GLTFVariantInfo {
  /** Source variant index. */
  readonly index: number;
  /** Source variant name or generated name. */
  readonly name: string;
}

/** Base-color texture reference retained when no decoded CPU texture is supplied. */
export interface GLTFTextureReference {
  /** glTF texture index. */
  readonly index: number;
  /** UV attribute set used by the texture. */
  readonly texCoord: number;
  /** glTF image source index. */
  readonly source: number | undefined;
  /** Image URI when the source provides one. */
  readonly uri: string | undefined;
  /** Embedded image bufferView when the source has no URI. */
  readonly bufferView: number | undefined;
  /** MIME type for an embedded image payload. */
  readonly mimeType: string | undefined;
}

/** CPU material and source metadata for one glTF material. */
export interface GLTFMaterialInfo {
  /** glTF material index. */
  readonly index: number;
  /** Source material name or generated name. */
  readonly name: string;
  /** EASEL CPU material selected for the supported subset. */
  readonly material: Material;
  /** Source base-color RGBA factor. */
  readonly baseColorFactor: readonly [number, number, number, number];
  /** Source base-color texture reference. */
  readonly baseColorTexture: GLTFTextureReference | undefined;
  /** Source alpha interpretation. */
  readonly alphaMode: "OPAQUE" | "MASK" | "BLEND";
  /** Source alpha cutoff for mask materials. */
  readonly alphaCutoff: number;
  /** Whether the source disables back-face culling. */
  readonly doubleSided: boolean;
}

/** Source animation target metadata, including KHR_animation_pointer paths. */
export interface GLTFAnimationTarget {
  /** Source node index for a core glTF animation target. */
  readonly node?: number;
  /** Source target path, including `pointer` for KHR_animation_pointer. */
  readonly path: string;
  /** JSON Pointer retained for KHR_animation_pointer channels. */
  readonly pointer?: string;
}

/** One decoded animation channel. Values remain source-shaped CPU arrays. */
export interface GLTFAnimationChannel {
  /** Source animation target metadata. */
  readonly target: GLTFAnimationTarget;
  /** Source interpolation mode. */
  readonly interpolation: "LINEAR" | "STEP" | "CUBICSPLINE";
  /** Input keyframe times. */
  readonly times: readonly number[];
  /** Raw output values in source accessor order. */
  readonly values: readonly number[];
}

/** Animation data suitable for conversion to EASEL tracks by an application. */
export interface GLTFAnimation {
  /** Source animation name or generated name. */
  readonly name: string;
  /** Decoded animation channels. */
  readonly channels: readonly GLTFAnimationChannel[];
}

/** Result shape modeled after THREE.GLTFLoader, with CPU scene resources. */
export interface GLTFLoaderResult {
  /** Selected scene. */
  readonly scene: Scene;
  /** All scenes in source order. */
  readonly scenes: readonly Scene[];
  /** Cameras attached to the selected scene, or all source cameras. */
  readonly cameras: readonly (PerspectiveCamera | OrthographicCamera)[];
  /** Decoded raw animation channels. */
  readonly animations: readonly GLTFAnimation[];
  /** CPU material mappings and source metadata. */
  readonly materials: readonly GLTFMaterialInfo[];
  /** Source texture references. */
  readonly textures: readonly GLTFTextureReference[];
  /** Original asset metadata. */
  readonly asset: Readonly<Record<string, unknown>>;
  /** CPU instance attributes decoded from EXT_mesh_gpu_instancing nodes. */
  readonly instancing: readonly GLTFNodeInstancingInfo[];
  /** CPU LOD node chains decoded from MSFT_lod extensions. */
  readonly lods: readonly GLTFNodeLODInfo[];
  /** Named KHR_materials_variants entries preserved from the source. */
  readonly variants: readonly GLTFVariantInfo[];
  /** Primitive-to-material mappings declared by KHR_materials_variants. */
  readonly variantMappings: readonly GLTFVariantMapping[];
}

interface BufferViewRecord {
  buffer: number;
  byteOffset: number;
  byteLength: number;
  byteStride?: number;
}

interface AccessorRecord {
  bufferView?: number;
  byteOffset?: number;
  componentType: number;
  count: number;
  type: string;
  normalized?: boolean;
}

interface NodeRecord {
  name?: string;
  children?: number[];
  mesh?: number;
  camera?: number;
  matrix?: number[];
  translation?: number[];
  rotation?: number[];
  scale?: number[];
  extras?: unknown;
  extensions?: Readonly<Record<string, unknown>>;
}

interface InstancingData {
  readonly info: GLTFNodeInstancingInfo;
  readonly translations?: readonly number[];
  readonly rotations?: readonly number[];
  readonly scales?: readonly number[];
  readonly instanceColor?: Float32Array;
}

interface BuildContext {
  readonly instancing: Map<number, InstancingData>;
  readonly lods: Map<number, GLTFNodeLODInfo>;
  readonly activeLods: Set<number>;
  readonly lodDistanceScale: number;
}

const COMPONENT_SIZE: Readonly<Record<number, number>> = {
  5120: 1,
  5121: 1,
  5122: 2,
  5123: 2,
  5125: 4,
  5126: 4,
};

const COMPONENT_COUNT: Readonly<Record<string, number>> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
};

function record(
  value: unknown,
  path: string,
): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`GLTFLoader: ${path} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function array(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value))
    throw new TypeError(`GLTFLoader: ${path} must be an array.`);
  return value;
}

function finite(value: unknown, path: string, fallback?: number): number {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`GLTFLoader: ${path} must be a finite number.`);
  }
  return value;
}

function integer(value: unknown, path: string, fallback?: number): number {
  const number = finite(value, path, fallback);
  if (!Number.isSafeInteger(number))
    throw new RangeError(`GLTFLoader: ${path} must be an integer.`);
  return number;
}

function numberArray(value: unknown, path: string, length?: number): number[] {
  const values = array(value, path).map((item, index) =>
    finite(item, `${path}[${index}]`),
  );
  if (length !== undefined && values.length !== length) {
    throw new RangeError(`GLTFLoader: ${path} must contain ${length} values.`);
  }
  return values;
}

function asBytes(value: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}

function decodeBase64(value: string): Uint8Array {
  if (typeof globalThis.atob === "function") {
    const text = globalThis.atob(value);
    const bytes = new Uint8Array(text.length);
    for (let index = 0; index < text.length; index++)
      bytes[index] = text.charCodeAt(index);
    return bytes;
  }
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = value.replace(/\s+/gu, "");
  const output: number[] = [];
  for (let index = 0; index < clean.length; index += 4) {
    const a = alphabet.indexOf(clean[index] ?? "A");
    const b = alphabet.indexOf(clean[index + 1] ?? "A");
    const c =
      clean[index + 2] === "=" ? 0 : alphabet.indexOf(clean[index + 2] ?? "A");
    const d =
      clean[index + 3] === "=" ? 0 : alphabet.indexOf(clean[index + 3] ?? "A");
    if (a < 0 || b < 0 || c < 0 || d < 0)
      throw new Error("GLTFLoader: invalid base64 buffer URI.");
    output.push((a << 2) | (b >> 4));
    if (clean[index + 2] !== "=") output.push(((b & 15) << 4) | (c >> 2));
    if (clean[index + 3] !== "=") output.push(((c & 3) << 6) | d);
  }
  return new Uint8Array(output);
}

function decodeDataUri(uri: string): Uint8Array {
  const comma = uri.indexOf(",");
  if (comma < 0 || !uri.startsWith("data:", 0))
    throw new Error("GLTFLoader: malformed data URI.");
  const metadata = uri.slice(5, comma).toLowerCase();
  const payload = uri.slice(comma + 1);
  if (metadata.split(";").includes("base64")) return decodeBase64(payload);
  return new TextEncoder().encode(decodeURIComponent(payload));
}

function textureFor(
  options: GLTFLoaderOptions,
  index: number,
): Texture | undefined {
  const textures = options.textures;
  if (!textures) return;
  if (textures instanceof Map) return textures.get(index);
  const table = textures as Readonly<Record<number | string, Texture>>;
  return table[index] ?? table[String(index)];
}

function setNodeTransform(node: Node, source: NodeRecord): void {
  if (source.matrix !== undefined) {
    const matrix = numberArray(source.matrix, "node.matrix", 16);
    new Matrix4()
      .fromArray(matrix)
      .decompose(node.position, node.quaternion, node.scale);
  } else {
    if (source.translation !== undefined)
      node.position.fromArray(
        numberArray(source.translation, "node.translation", 3),
      );
    if (source.rotation !== undefined)
      node.quaternion.fromArray(
        numberArray(source.rotation, "node.rotation", 4),
      );
    if (source.scale !== undefined)
      node.scale.fromArray(numberArray(source.scale, "node.scale", 3));
  }
  node.updateMatrix();
}

function setUserData(node: Node, extras: unknown, index: number): void {
  const existing = node.userData;
  if (
    extras !== undefined &&
    extras !== null &&
    typeof extras === "object" &&
    !Array.isArray(extras)
  ) {
    node.userData = {
      ...existing,
      ...(extras as Record<string, unknown>),
      gltfNodeIndex: index,
    };
  } else {
    node.userData = { ...existing, gltfNodeIndex: index };
  }
}

/** CPU glTF 2.0 loader for embedded/data URI and ordinary external buffers. */
export class GLTFLoader extends Loader {
  /** Loads a JSON glTF resource and its external buffer dependencies. */
  override load(
    url: string,
    onLoad?: (result: GLTFLoaderResult) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (error: unknown) => void,
  ): void {
    const fileLoader = new FileLoader(this.manager);
    fileLoader.cache = this.cache;
    fileLoader.path = this.path;
    fileLoader.resourcePath = this.resourcePath;
    fileLoader.responseType = "json";
    fileLoader.requestHeader = this.requestHeader;
    fileLoader.withCredentials = this.withCredentials;
    fileLoader.load(
      url,
      (value) => {
        const document = record(value, "document");
        this.#loadExternalBuffers(document, this.path + url, onProgress)
          .then((buffers) => onLoad?.(this.parse(document, { buffers })))
          .catch((error: unknown) => onError?.(error));
      },
      onProgress,
      onError,
    );
  }

  /** Promise-shaped loader result matching THREE.GLTFLoader usage. */
  override async loadAsync(
    url: string,
    onProgress?: (event: ProgressEvent) => void,
  ): Promise<GLTFLoaderResult> {
    return new Promise((resolve, reject) =>
      this.load(url, resolve, onProgress, reject),
    );
  }

  /** Parses a glTF document using only CPU-accessible buffer data. */
  parse(
    documentOrJson: GLTFDocument | string,
    options: GLTFLoaderOptions = {},
  ): GLTFLoaderResult {
    const document =
      typeof documentOrJson === "string"
        ? record(JSON.parse(documentOrJson), "document")
        : documentOrJson;
    const asset = record(document["asset"], "asset");
    const version = String(asset["version"] ?? "");
    if (!version.startsWith("2."))
      throw new Error(`GLTFLoader: unsupported asset version "${version}".`);
    const buffers = this.#resolveBuffers(document, options);
    const bufferViews = this.#parseBufferViews(document);
    const accessors = this.#parseAccessors(document);
    const readAccessor = (index: number): number[] =>
      this.#readAccessor(index, accessors, bufferViews, buffers);
    const materialResult = this.#parseMaterials(document, options);
    const meshDefs = array(document["meshes"] ?? [], "meshes").map(
      (item, index) => record(item, `meshes[${index}]`),
    );
    const variantResult = this.#parseVariants(document, meshDefs);
    const nodeDefs = array(document["nodes"] ?? [], "nodes").map(
      (item, index) => record(item, `nodes[${index}]`) as NodeRecord,
    );
    const context: BuildContext = {
      instancing: new Map(),
      lods: new Map(),
      activeLods: new Set(),
      lodDistanceScale: finite(
        options.lodDistanceScale,
        "options.lodDistanceScale",
        1,
      ),
    };
    if (context.lodDistanceScale <= 0)
      throw new RangeError(
        "GLTFLoader: options.lodDistanceScale must be positive.",
      );
    for (let nodeIndex = 0; nodeIndex < nodeDefs.length; nodeIndex++) {
      const node = nodeDefs[nodeIndex]!;
      if (node.mesh !== undefined) {
        const instancing = this.#parseInstancing(
          nodeIndex,
          node,
          accessors,
          readAccessor,
        );
        if (instancing) context.instancing.set(nodeIndex, instancing);
      }
      const lod = this.#parseLOD(nodeIndex, node, nodeDefs.length);
      if (lod) context.lods.set(nodeIndex, lod);
    }
    const cameraDefs = array(document["cameras"] ?? [], "cameras").map(
      (item, index) => record(item, `cameras[${index}]`),
    );
    const cameras = cameraDefs.map((camera, index) =>
      this.#parseCamera(camera, index),
    );
    const textures = this.#parseTextureReferences(document);
    const scenes = array(document["scenes"] ?? [{ nodes: [] }], "scenes").map(
      (item, index) => record(item, `scenes[${index}]`),
    );
    const selectedScene = integer(document["scene"], "scene", 0);
    if (selectedScene < 0 || selectedScene >= scenes.length)
      throw new RangeError("GLTFLoader: scene index is out of range.");
    const sceneObjects: Scene[] = [];
    const firstSceneCameras: (PerspectiveCamera | OrthographicCamera)[] = [];
    for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex++) {
      const sceneDef = scenes[sceneIndex]!;
      const scene = new Scene();
      scene.name =
        typeof sceneDef["name"] === "string"
          ? (sceneDef["name"] as string)
          : `Scene${sceneIndex}`;
      scene.userData = { gltfSceneIndex: sceneIndex };
      for (const nodeIndex of array(
        sceneDef["nodes"] ?? [],
        `scenes[${sceneIndex}].nodes`,
      )) {
        scene.add(
          this.#buildNode(
            integer(nodeIndex, "scene node index"),
            nodeDefs,
            meshDefs,
            cameras,
            readAccessor,
            materialResult.materials,
            sceneIndex === selectedScene ? firstSceneCameras : undefined,
            context,
          ),
        );
      }
      sceneObjects.push(scene);
    }
    const animations = this.#parseAnimations(document, readAccessor);
    return {
      scene: sceneObjects[selectedScene]!,
      scenes: sceneObjects,
      cameras: firstSceneCameras.length > 0 ? firstSceneCameras : cameras,
      animations,
      materials: materialResult.materials,
      textures,
      asset,
      instancing: [...context.instancing.values()]
        .map((entry) => entry.info)
        .sort((left, right) => left.node - right.node),
      lods: [...context.lods.values()].sort(
        (left, right) => left.node - right.node,
      ),
      variants: variantResult.variants,
      variantMappings: variantResult.mappings,
    };
  }

  #resolveBuffers(
    document: Readonly<Record<string, unknown>>,
    options: GLTFLoaderOptions,
  ): Uint8Array[] {
    const definitions = array(document["buffers"] ?? [], "buffers");
    return definitions.map((value, index) => {
      const supplied = options.buffers?.[index];
      if (supplied !== undefined) return asBytes(supplied);
      const buffer = record(value, `buffers[${index}]`);
      const uri = buffer["uri"];
      if (typeof uri === "string")
        return uri.startsWith("data:")
          ? decodeDataUri(uri)
          : (() => {
              throw new Error(
                `GLTFLoader: external buffer "${uri}" requires load() or options.buffers.`,
              );
            })();
      if (index === 0 && options.binaryChunk !== undefined)
        return asBytes(options.binaryChunk);
      throw new Error(
        `GLTFLoader: buffers[${index}] has no URI or supplied binary chunk.`,
      );
    });
  }

  #parseBufferViews(
    document: Readonly<Record<string, unknown>>,
  ): BufferViewRecord[] {
    return array(document["bufferViews"] ?? [], "bufferViews").map(
      (value, index) => {
        const view = record(value, `bufferViews[${index}]`);
        const result: BufferViewRecord = {
          buffer: integer(view["buffer"], `bufferViews[${index}].buffer`),
          byteOffset: integer(
            view["byteOffset"],
            `bufferViews[${index}].byteOffset`,
            0,
          ),
          byteLength: integer(
            view["byteLength"],
            `bufferViews[${index}].byteLength`,
          ),
        };
        if (view["byteStride"] !== undefined)
          result.byteStride = integer(
            view["byteStride"],
            `bufferViews[${index}].byteStride`,
          );
        return result;
      },
    );
  }

  #parseAccessors(
    document: Readonly<Record<string, unknown>>,
  ): AccessorRecord[] {
    return array(document["accessors"] ?? [], "accessors").map(
      (value, index) => {
        const accessor = record(value, `accessors[${index}]`);
        const result: AccessorRecord = {
          byteOffset: integer(
            accessor["byteOffset"],
            `accessors[${index}].byteOffset`,
            0,
          ),
          componentType: integer(
            accessor["componentType"],
            `accessors[${index}].componentType`,
          ),
          count: integer(accessor["count"], `accessors[${index}].count`),
          type: String(accessor["type"] ?? ""),
          normalized: accessor["normalized"] === true,
        };
        if (accessor["bufferView"] !== undefined)
          result.bufferView = integer(
            accessor["bufferView"],
            `accessors[${index}].bufferView`,
          );
        return result;
      },
    );
  }

  #readAccessor(
    index: number,
    accessors: AccessorRecord[],
    views: BufferViewRecord[],
    buffers: Uint8Array[],
  ): number[] {
    const accessor = accessors[index];
    if (!accessor)
      throw new RangeError(`GLTFLoader: accessor ${index} is missing.`);
    const components = COMPONENT_COUNT[accessor.type];
    const size = COMPONENT_SIZE[accessor.componentType];
    if (!(components && size))
      throw new Error(
        `GLTFLoader: accessor ${index} uses an unsupported type or componentType.`,
      );
    if (accessor.bufferView === undefined)
      return new Array(accessor.count * components).fill(0);
    const view = views[accessor.bufferView];
    if (!view)
      throw new RangeError(
        `GLTFLoader: bufferView ${accessor.bufferView} is missing.`,
      );
    const bytes = buffers[view.buffer];
    if (!bytes)
      throw new RangeError(`GLTFLoader: buffer ${view.buffer} is missing.`);
    const elementSize = components * size;
    const stride = view.byteStride ?? elementSize;
    if (stride < elementSize)
      throw new RangeError(
        `GLTFLoader: accessor ${index} has a byteStride smaller than its element.`,
      );
    const start = view.byteOffset + (accessor.byteOffset ?? 0);
    const end = start + Math.max(0, accessor.count - 1) * stride + elementSize;
    if (start < 0 || end > bytes.byteLength)
      throw new RangeError(
        `GLTFLoader: accessor ${index} exceeds its bufferView.`,
      );
    const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const values: number[] = [];
    for (let item = 0; item < accessor.count; item++) {
      for (let component = 0; component < components; component++) {
        const offset = start + item * stride + component * size;
        const value = this.#readComponent(data, offset, accessor.componentType);
        values.push(
          accessor.normalized
            ? this.#normalizeComponent(value, accessor.componentType)
            : value,
        );
      }
    }
    return values;
  }

  #readComponent(
    view: DataView,
    offset: number,
    componentType: number,
  ): number {
    switch (componentType) {
      case 5120:
        return view.getInt8(offset);
      case 5121:
        return view.getUint8(offset);
      case 5122:
        return view.getInt16(offset, true);
      case 5123:
        return view.getUint16(offset, true);
      case 5125:
        return view.getUint32(offset, true);
      case 5126:
        return view.getFloat32(offset, true);
      default:
        throw new Error(
          `GLTFLoader: unsupported componentType ${componentType}.`,
        );
    }
  }

  #normalizeComponent(value: number, componentType: number): number {
    switch (componentType) {
      case 5120:
        return Math.max(value / 127, -1);
      case 5121:
        return value / 255;
      case 5122:
        return Math.max(value / 32767, -1);
      case 5123:
        return value / 65535;
      case 5125:
        return value / 4294967295;
      default:
        return value;
    }
  }

  #parseMaterials(
    document: Readonly<Record<string, unknown>>,
    options: GLTFLoaderOptions,
  ): { materials: GLTFMaterialInfo[] } {
    const entries = array(document["materials"] ?? [], "materials");
    const textures = array(document["textures"] ?? [], "textures");
    const images = array(document["images"] ?? [], "images");
    const materials = entries.map((value, index) => {
      const source = record(value, `materials[${index}]`);
      const pbr = record(
        source["pbrMetallicRoughness"] ?? {},
        `materials[${index}].pbrMetallicRoughness`,
      );
      const factor =
        pbr["baseColorFactor"] === undefined
          ? [1, 1, 1, 1]
          : numberArray(
              pbr["baseColorFactor"],
              `materials[${index}].baseColorFactor`,
              4,
            );
      const baseColorFactor: [number, number, number, number] = [
        factor[0]!,
        factor[1]!,
        factor[2]!,
        factor[3]!,
      ];
      const textureInfo =
        pbr["baseColorTexture"] === undefined
          ? undefined
          : record(
              pbr["baseColorTexture"],
              `materials[${index}].baseColorTexture`,
            );
      const textureIndex =
        textureInfo === undefined
          ? undefined
          : integer(
              textureInfo["index"],
              `materials[${index}].baseColorTexture.index`,
            );
      const textureSource =
        textureIndex === undefined
          ? undefined
          : record(textures[textureIndex], `textures[${textureIndex}]`)[
              "source"
            ];
      const image =
        typeof textureSource === "number"
          ? record(images[textureSource], `images[${textureSource}]`)
          : undefined;
      const uri =
        image && typeof image["uri"] === "string"
          ? (image["uri"] as string)
          : undefined;
      const bufferView =
        image && typeof image["bufferView"] === "number"
          ? integer(image["bufferView"], "image.bufferView")
          : undefined;
      const mimeType =
        image && typeof image["mimeType"] === "string"
          ? (image["mimeType"] as string)
          : undefined;
      const baseColorTexture =
        textureIndex === undefined
          ? undefined
          : {
              index: textureIndex,
              texCoord: integer(
                textureInfo?.["texCoord"],
                "baseColorTexture.texCoord",
                0,
              ),
              source:
                typeof textureSource === "number" ? textureSource : undefined,
              uri,
              bufferView,
              mimeType,
            };
      const alphaMode =
        source["alphaMode"] === "BLEND" || source["alphaMode"] === "MASK"
          ? source["alphaMode"]
          : "OPAQUE";
      const sourceAlpha = Math.min(1, Math.max(0, baseColorFactor[3]!));
      const alpha = alphaMode === "OPAQUE" ? 1 : sourceAlpha;
      const materialOptions = {
        color: new Color().setRGB(
          baseColorFactor[0]!,
          baseColorFactor[1]!,
          baseColorFactor[2]!,
        ),
        transparent: alphaMode === "BLEND" && alpha < 1,
        opacity:
          alphaMode === "BLEND"
            ? Math.min(8, Math.max(0, Math.round((1 - alpha) * 8)))
            : 0,
        name:
          typeof source["name"] === "string"
            ? (source["name"] as string)
            : `Material${index}`,
      };
      const map =
        textureIndex === undefined
          ? undefined
          : textureFor(options, textureIndex);
      if (map !== undefined) Object.assign(materialOptions, { map });
      if (source["doubleSided"] === true)
        Object.assign(materialOptions, { side: Side.Double });
      const material =
        options.materialType === "basic"
          ? new BasicMaterial(materialOptions)
          : new LambertMaterial(materialOptions);
      return {
        index,
        name: material.name,
        material,
        baseColorFactor,
        baseColorTexture,
        alphaMode,
        alphaCutoff: finite(
          source["alphaCutoff"],
          `materials[${index}].alphaCutoff`,
          0.5,
        ),
        doubleSided: source["doubleSided"] === true,
      } satisfies GLTFMaterialInfo;
    });
    return { materials };
  }

  #parseTextureReferences(
    document: Readonly<Record<string, unknown>>,
  ): GLTFTextureReference[] {
    const textures = array(document["textures"] ?? [], "textures");
    const images = array(document["images"] ?? [], "images");
    return textures.map((value, index) => {
      const texture = record(value, `textures[${index}]`);
      const source =
        typeof texture["source"] === "number"
          ? integer(texture["source"], `textures[${index}].source`)
          : undefined;
      const image =
        source === undefined
          ? undefined
          : record(images[source], `images[${source}]`);
      return {
        index,
        texCoord: 0,
        source,
        uri:
          image && typeof image["uri"] === "string"
            ? (image["uri"] as string)
            : undefined,
        bufferView:
          image && typeof image["bufferView"] === "number"
            ? integer(image["bufferView"], `images[${source}].bufferView`)
            : undefined,
        mimeType:
          image && typeof image["mimeType"] === "string"
            ? (image["mimeType"] as string)
            : undefined,
      };
    });
  }

  #parseVariants(
    document: Readonly<Record<string, unknown>>,
    meshes: readonly Readonly<Record<string, unknown>>[],
  ): { variants: GLTFVariantInfo[]; mappings: GLTFVariantMapping[] } {
    const documentExtensions = document["extensions"];
    const extensionRoot =
      documentExtensions === undefined
        ? undefined
        : record(documentExtensions, "extensions");
    const extensionValue = extensionRoot?.["KHR_materials_variants"];
    const variantValues =
      extensionValue === undefined
        ? []
        : array(
            record(extensionValue, "extensions.KHR_materials_variants")[
              "variants"
            ] ?? [],
            "extensions.KHR_materials_variants.variants",
          );
    const variants = variantValues.map((value, index) => {
      const variant = record(
        value,
        `extensions.KHR_materials_variants.variants[${index}]`,
      );
      return {
        index,
        name:
          typeof variant["name"] === "string"
            ? (variant["name"] as string)
            : `Variant${index}`,
      } satisfies GLTFVariantInfo;
    });
    const mappings: GLTFVariantMapping[] = [];
    for (let meshIndex = 0; meshIndex < meshes.length; meshIndex++) {
      const primitives = array(
        meshes[meshIndex]!["primitives"] ?? [],
        `meshes[${meshIndex}].primitives`,
      );
      for (
        let primitiveIndex = 0;
        primitiveIndex < primitives.length;
        primitiveIndex++
      ) {
        const primitive = record(
          primitives[primitiveIndex],
          `meshes[${meshIndex}].primitives[${primitiveIndex}]`,
        );
        const primitiveExtensions = primitive["extensions"];
        const primitiveRoot =
          primitiveExtensions === undefined
            ? undefined
            : record(
                primitiveExtensions,
                `meshes[${meshIndex}].primitives[${primitiveIndex}].extensions`,
              );
        const variantExtension = primitiveRoot?.["KHR_materials_variants"];
        if (variantExtension === undefined) continue;
        const variantMappings = array(
          record(
            variantExtension,
            "primitive.extensions.KHR_materials_variants",
          )["mappings"],
          `meshes[${meshIndex}].primitives[${primitiveIndex}].extensions.KHR_materials_variants.mappings`,
        );
        for (
          let mappingIndex = 0;
          mappingIndex < variantMappings.length;
          mappingIndex++
        ) {
          const mapping = record(
            variantMappings[mappingIndex],
            `meshes[${meshIndex}].primitives[${primitiveIndex}].extensions.KHR_materials_variants.mappings[${mappingIndex}]`,
          );
          const material = integer(
            mapping["material"],
            "variant mapping.material",
          );
          const variantIds = array(
            mapping["variants"],
            "variant mapping.variants",
          ).map((value, index) =>
            integer(value, `variant mapping.variants[${index}]`),
          );
          for (const variant of variantIds)
            if (variant < 0 || variant >= variants.length)
              throw new RangeError(
                `GLTFLoader: variant index ${variant} is out of range.`,
              );
          mappings.push({
            mesh: meshIndex,
            primitive: primitiveIndex,
            material,
            variants: variantIds,
          });
        }
      }
    }
    return { variants, mappings };
  }

  #parseCamera(
    source: Readonly<Record<string, unknown>>,
    index: number,
  ): PerspectiveCamera | OrthographicCamera {
    const type = source["type"];
    if (type === "orthographic") {
      const orthographic = record(
        source["orthographic"],
        `cameras[${index}].orthographic`,
      );
      const xmag = finite(orthographic["xmag"], "camera.xmag");
      const ymag = finite(orthographic["ymag"], "camera.ymag");
      return new OrthographicCamera({
        left: -xmag,
        right: xmag,
        top: ymag,
        bottom: -ymag,
        near: finite(orthographic["znear"], "camera.znear"),
        far: finite(orthographic["zfar"], "camera.zfar"),
      });
    }
    if (type !== "perspective")
      throw new Error(`GLTFLoader: unsupported camera type at index ${index}.`);
    const perspective = record(
      source["perspective"],
      `cameras[${index}].perspective`,
    );
    return new PerspectiveCamera({
      fov: (finite(perspective["yfov"], "camera.yfov") * 180) / Math.PI,
      aspect: finite(perspective["aspectRatio"], "camera.aspectRatio", 1),
      near: finite(perspective["znear"], "camera.znear"),
      far: finite(perspective["zfar"], "camera.zfar", 2000),
    });
  }

  #parseInstancing(
    nodeIndex: number,
    source: NodeRecord,
    accessors: readonly AccessorRecord[],
    readAccessor: (index: number) => number[],
  ): InstancingData | undefined {
    const extensionValue = source.extensions?.["EXT_mesh_gpu_instancing"];
    if (extensionValue === undefined) return;
    const extension = record(
      extensionValue,
      `nodes[${nodeIndex}].extensions.EXT_mesh_gpu_instancing`,
    );
    const attributes = record(
      extension["attributes"],
      `nodes[${nodeIndex}].extensions.EXT_mesh_gpu_instancing.attributes`,
    );
    const entries = Object.entries(attributes);
    if (entries.length === 0) return;
    const decoded: Record<string, GLTFInstanceAttributeInfo> = {};
    let count: number | undefined;
    let translations: readonly number[] | undefined;
    let rotations: readonly number[] | undefined;
    let scales: readonly number[] | undefined;
    let instanceColor: Float32Array | undefined;
    for (const [semantic, value] of entries) {
      const accessorIndex = integer(
        value,
        `nodes[${nodeIndex}].extensions.EXT_mesh_gpu_instancing.attributes.${semantic}`,
      );
      const accessor = accessors[accessorIndex];
      if (!accessor)
        throw new RangeError(
          `GLTFLoader: instancing accessor ${accessorIndex} is missing.`,
        );
      const expectedType =
        semantic === "ROTATION"
          ? "VEC4"
          : semantic === "TRANSLATION" || semantic === "SCALE"
            ? "VEC3"
            : undefined;
      if (expectedType !== undefined && accessor.type !== expectedType) {
        throw new Error(
          `GLTFLoader: instancing attribute ${semantic} must use ${expectedType}.`,
        );
      }
      if (
        semantic === "TRANSLATION" || semantic === "SCALE"
          ? accessor.componentType !== 5126
          : semantic === "ROTATION" &&
            accessor.componentType !== 5126 &&
            !(
              accessor.normalized === true &&
              (accessor.componentType === 5120 ||
                accessor.componentType === 5122)
            )
      ) {
        throw new Error(
          `GLTFLoader: instancing attribute ${semantic} uses an unsupported component type.`,
        );
      }
      if (count !== undefined && accessor.count !== count)
        throw new Error(
          "GLTFLoader: instancing attributes must have the same count.",
        );
      count = accessor.count;
      const values = readAccessor(accessorIndex);
      decoded[semantic] = {
        semantic,
        accessor: accessorIndex,
        type: accessor.type,
        count: accessor.count,
        values,
        normalized: accessor.normalized === true,
      };
      if (semantic === "TRANSLATION") translations = values;
      else if (semantic === "ROTATION") rotations = values;
      else if (semantic === "SCALE") scales = values;
      else if (
        semantic === "_COLOR_0" ||
        semantic === "_COLOR" ||
        semantic === "COLOR_0"
      ) {
        const components = COMPONENT_COUNT[accessor.type];
        if (components !== 3 && components !== 4)
          throw new Error(
            `GLTFLoader: instancing color attribute ${semantic} must use VEC3 or VEC4.`,
          );
        instanceColor = new Float32Array(accessor.count * 3);
        for (let item = 0; item < accessor.count; item++) {
          instanceColor[item * 3] = values[item * components] ?? 1;
          instanceColor[item * 3 + 1] = values[item * components + 1] ?? 1;
          instanceColor[item * 3 + 2] = values[item * components + 2] ?? 1;
        }
      }
    }
    const info: GLTFNodeInstancingInfo = {
      node: nodeIndex,
      count: count ?? 0,
      attributes: decoded,
    };
    return {
      info,
      ...(translations === undefined ? {} : { translations }),
      ...(rotations === undefined ? {} : { rotations }),
      ...(scales === undefined ? {} : { scales }),
      ...(instanceColor === undefined ? {} : { instanceColor }),
    };
  }

  #parseLOD(
    nodeIndex: number,
    source: NodeRecord,
    nodeCount: number,
  ): GLTFNodeLODInfo | undefined {
    const extensionValue = source.extensions?.["MSFT_lod"];
    if (extensionValue === undefined) return;
    const extension = record(
      extensionValue,
      `nodes[${nodeIndex}].extensions.MSFT_lod`,
    );
    const ids = array(
      extension["ids"],
      `nodes[${nodeIndex}].extensions.MSFT_lod.ids`,
    ).map((value, index) =>
      integer(value, `nodes[${nodeIndex}].extensions.MSFT_lod.ids[${index}]`),
    );
    const seen = new Set<number>();
    for (const id of ids) {
      if (id < 0 || id >= nodeCount)
        throw new RangeError(
          `GLTFLoader: MSFT_lod node id ${id} is out of range.`,
        );
      if (id === nodeIndex || seen.has(id))
        throw new Error(
          `GLTFLoader: MSFT_lod ids for node ${nodeIndex} must be unique and cannot reference itself.`,
        );
      seen.add(id);
    }
    const extras = source.extras;
    let screenCoverage: readonly number[] | undefined;
    if (
      extras !== null &&
      typeof extras === "object" &&
      !Array.isArray(extras)
    ) {
      const coverage = (extras as Readonly<Record<string, unknown>>)[
        "MSFT_screencoverage"
      ];
      if (coverage !== undefined)
        screenCoverage = numberArray(
          coverage,
          `nodes[${nodeIndex}].extras.MSFT_screencoverage`,
        );
    }
    return { node: nodeIndex, ids, screenCoverage };
  }

  #nodeTransformMatrix(source: NodeRecord): Matrix4 {
    if (source.matrix !== undefined)
      return new Matrix4().fromArray(
        numberArray(source.matrix, "node.matrix", 16),
      );
    const position =
      source.translation === undefined
        ? new Vector3()
        : new Vector3().fromArray(
            numberArray(source.translation, "node.translation", 3),
          );
    const quaternion =
      source.rotation === undefined
        ? new Quaternion()
        : new Quaternion().fromArray(
            numberArray(source.rotation, "node.rotation", 4),
          );
    const scale =
      source.scale === undefined
        ? new Vector3(1, 1, 1)
        : new Vector3().fromArray(numberArray(source.scale, "node.scale", 3));
    return new Matrix4().compose(position, quaternion, scale);
  }

  #applyRelativeNodeTransform(
    object: Node,
    source: NodeRecord,
    parentMatrix: Matrix4,
  ): void {
    const relative = parentMatrix
      .clone()
      .invert()
      .multiply(this.#nodeTransformMatrix(source));
    relative.decompose(object.position, object.quaternion, object.scale);
    object.updateMatrix();
  }

  #lodDistance(info: GLTFNodeLODInfo, level: number, scale: number): number {
    if (level === 0) return 0;
    const coverage = info.screenCoverage?.[level];
    if (coverage !== undefined && coverage > 0) return scale / coverage;
    return level * 10 * scale;
  }

  #buildNode(
    index: number,
    nodes: NodeRecord[],
    meshes: Readonly<Record<string, unknown>>[],
    cameras: readonly (PerspectiveCamera | OrthographicCamera)[],
    readAccessor: (index: number) => number[],
    materials: readonly GLTFMaterialInfo[],
    collectCameras: (PerspectiveCamera | OrthographicCamera)[] | undefined,
    context: BuildContext,
  ): Group | Mesh | LOD | Scene | PerspectiveCamera | OrthographicCamera {
    const source = nodes[index];
    if (!source) throw new RangeError(`GLTFLoader: node ${index} is missing.`);
    const lodInfo = context.lods.get(index);
    if (lodInfo !== undefined && !context.activeLods.has(index)) {
      context.activeLods.add(index);
      const lod = new LOD();
      lod.name = source.name ?? `Node${index}`;
      const parentMatrix = this.#nodeTransformMatrix(source);
      setNodeTransform(lod, source);
      const levelIndices = [index, ...lodInfo.ids];
      for (let level = 0; level < levelIndices.length; level++) {
        const levelIndex = levelIndices[level]!;
        const levelObject = this.#buildNodeContent(
          levelIndex,
          nodes,
          meshes,
          cameras,
          readAccessor,
          materials,
          collectCameras,
          context,
          false,
        );
        if (level > 0) {
          const levelSource = nodes[levelIndex]!;
          this.#applyRelativeNodeTransform(
            levelObject,
            levelSource,
            parentMatrix,
          );
        }
        lod.addLevel(
          levelObject,
          this.#lodDistance(lodInfo, level, context.lodDistanceScale),
        );
        levelObject.visible = level === 0;
      }
      lod.userData = { gltfNodeIndex: index, gltfLOD: lodInfo };
      setUserData(lod, source.extras, index);
      context.activeLods.delete(index);
      return lod;
    }
    return this.#buildNodeContent(
      index,
      nodes,
      meshes,
      cameras,
      readAccessor,
      materials,
      collectCameras,
      context,
    );
  }

  #buildNodeContent(
    index: number,
    nodes: NodeRecord[],
    meshes: Readonly<Record<string, unknown>>[],
    cameras: readonly (PerspectiveCamera | OrthographicCamera)[],
    readAccessor: (index: number) => number[],
    materials: readonly GLTFMaterialInfo[],
    collectCameras: (PerspectiveCamera | OrthographicCamera)[] | undefined,
    context: BuildContext,
    applyTransform: boolean = true,
  ): Group | Mesh | LOD | Scene | PerspectiveCamera | OrthographicCamera {
    const source = nodes[index];
    if (!source) throw new RangeError(`GLTFLoader: node ${index} is missing.`);
    const camera =
      source.camera === undefined
        ? undefined
        : cameras[integer(source.camera, `nodes[${index}].camera`)];
    let object: Group | Mesh | LOD | PerspectiveCamera | OrthographicCamera;
    if (camera) {
      object = camera.clone();
      collectCameras?.push(object);
    } else if (source.mesh !== undefined) {
      object = this.#buildMesh(
        integer(source.mesh, `nodes[${index}].mesh`),
        meshes,
        readAccessor,
        materials,
        context.instancing.get(index),
      );
    } else {
      object = new Group();
    }
    if (source.name !== undefined) object.name = source.name;
    if (applyTransform) setNodeTransform(object, source);
    setUserData(object, source.extras, index);
    const instancing = context.instancing.get(index);
    if (instancing)
      object.userData = { ...object.userData, gltfInstancing: instancing.info };
    for (const child of source.children ?? [])
      object.add(
        this.#buildNode(
          integer(child, `nodes[${index}].children`),
          nodes,
          meshes,
          cameras,
          readAccessor,
          materials,
          collectCameras,
          context,
        ),
      );
    return object;
  }

  #buildMesh(
    index: number,
    meshes: Readonly<Record<string, unknown>>[],
    readAccessor: (index: number) => number[],
    materials: readonly GLTFMaterialInfo[],
    instancing?: InstancingData,
  ): Group | InstancedMesh | Mesh {
    const meshDef = meshes[index];
    if (!meshDef) throw new RangeError(`GLTFLoader: mesh ${index} is missing.`);
    const primitives = array(
      meshDef["primitives"] ?? [],
      `meshes[${index}].primitives`,
    );
    const objects: Mesh[] = [];
    for (
      let primitiveIndex = 0;
      primitiveIndex < primitives.length;
      primitiveIndex++
    ) {
      const primitive = record(
        primitives[primitiveIndex],
        `meshes[${index}].primitives[${primitiveIndex}]`,
      );
      const mode = integer(primitive["mode"], "primitive.mode", 4);
      if (mode !== 4 && mode !== 5 && mode !== 6)
        throw new Error(
          `GLTFLoader: primitive mode ${mode} is outside the CPU triangle path.`,
        );
      const attributes = record(
        primitive["attributes"],
        "primitive.attributes",
      );
      const positionAccessor = integer(
        attributes["POSITION"],
        "primitive.attributes.POSITION",
      );
      const positions = readAccessor(positionAccessor);
      const geometry = new Geometry().setPositions(positions);
      if (typeof attributes["NORMAL"] === "number")
        geometry.setNormals(
          readAccessor(
            integer(attributes["NORMAL"], "primitive.attributes.NORMAL"),
          ),
        );
      if (typeof attributes["TEXCOORD_0"] === "number")
        geometry.setUVs(
          readAccessor(
            integer(
              attributes["TEXCOORD_0"],
              "primitive.attributes.TEXCOORD_0",
            ),
          ),
        );
      if (typeof attributes["COLOR_0"] === "number") {
        const colors = readAccessor(
          integer(attributes["COLOR_0"], "primitive.attributes.COLOR_0"),
        );
        const components = colors.length / (positions.length / 3);
        geometry.setColors(
          components === 4
            ? colors.filter((_value, component) => component % 4 !== 3)
            : colors,
        );
      }
      const sourceIndices =
        primitive["indices"] === undefined
          ? Array.from({ length: positions.length / 3 }, (_value, item) => item)
          : readAccessor(integer(primitive["indices"], "primitive.indices"));
      const indices: number[] = [];
      if (mode === 4) indices.push(...sourceIndices);
      else if (mode === 5) {
        for (let item = 0; item + 2 < sourceIndices.length; item++) {
          if (item % 2 === 0)
            indices.push(
              sourceIndices[item]!,
              sourceIndices[item + 1]!,
              sourceIndices[item + 2]!,
            );
          else
            indices.push(
              sourceIndices[item + 1]!,
              sourceIndices[item]!,
              sourceIndices[item + 2]!,
            );
        }
      } else
        for (let item = 1; item + 1 < sourceIndices.length; item++)
          indices.push(
            sourceIndices[0]!,
            sourceIndices[item]!,
            sourceIndices[item + 1]!,
          );
      geometry.index = indices.some((value) => value > 65535)
        ? new Uint32Array(indices)
        : indices;
      if (geometry.getAttribute("normal") === undefined)
        geometry.computeVertexNormals();
      const materialIndex =
        primitive["material"] === undefined
          ? undefined
          : integer(primitive["material"], "primitive.material");
      const info =
        materialIndex === undefined ? undefined : materials[materialIndex];
      const object = instancing
        ? new InstancedMesh(geometry, info?.material, instancing.info.count)
        : new Mesh(geometry, info?.material);
      if (instancing) {
        const translation = instancing.translations;
        const rotation = instancing.rotations;
        const scale = instancing.scales;
        const position = new Vector3();
        const quaternion = new Quaternion();
        const size = new Vector3(1, 1, 1);
        const matrix = new Matrix4();
        for (let instance = 0; instance < instancing.info.count; instance++) {
          if (translation) position.fromArray(translation, instance * 3);
          else position.set(0, 0, 0);
          if (rotation) quaternion.fromArray(rotation, instance * 4);
          else quaternion.set(0, 0, 0, 1);
          if (scale) size.fromArray(scale, instance * 3);
          else size.set(1, 1, 1);
          (object as InstancedMesh).setMatrixAt(
            instance,
            matrix.compose(position, quaternion, size),
          );
        }
        if (instancing.instanceColor)
          (object as InstancedMesh).instanceColor = instancing.instanceColor;
      }
      object.name =
        typeof meshDef["name"] === "string"
          ? (meshDef["name"] as string)
          : `Mesh${index}`;
      object.userData = {
        gltfMeshIndex: index,
        gltfPrimitiveIndex: primitiveIndex,
        ...(info
          ? {
              gltfMaterialIndex: info.index,
              gltfBaseColorTexture: info.baseColorTexture,
            }
          : {}),
        ...(instancing ? { gltfInstancing: instancing.info } : {}),
      };
      objects.push(object);
    }
    if (objects.length === 1) return objects[0]!;
    const group = new Group();
    group.name =
      typeof meshDef["name"] === "string"
        ? (meshDef["name"] as string)
        : `Mesh${index}`;
    group.add(...objects);
    return group;
  }

  #parseAnimations(
    document: Readonly<Record<string, unknown>>,
    readAccessor: (index: number) => number[],
  ): GLTFAnimation[] {
    return array(document["animations"] ?? [], "animations").map(
      (value, index) => {
        const source = record(value, `animations[${index}]`);
        const samplers = array(
          source["samplers"] ?? [],
          `animations[${index}].samplers`,
        ).map((item) => record(item, "animation sampler"));
        const channels = array(
          source["channels"] ?? [],
          `animations[${index}].channels`,
        ).map((item, channelIndex) => {
          const channel = record(
            item,
            `animations[${index}].channels[${channelIndex}]`,
          );
          const target = record(channel["target"], "animation target");
          const samplerIndex = integer(
            channel["sampler"],
            "animation sampler index",
          );
          const sampler = samplers[samplerIndex];
          if (!sampler)
            throw new RangeError("GLTFLoader: animation sampler is missing.");
          const interpolation =
            sampler["interpolation"] === "STEP" ||
            sampler["interpolation"] === "CUBICSPLINE"
              ? sampler["interpolation"]
              : "LINEAR";
          const path = String(target["path"] ?? "");
          const targetExtensions = target["extensions"];
          const extensionRoot =
            targetExtensions === undefined
              ? undefined
              : record(targetExtensions, "animation target.extensions");
          const pointerExtension = extensionRoot?.["KHR_animation_pointer"];
          if (path === "pointer") {
            if (pointerExtension === undefined)
              throw new TypeError(
                "GLTFLoader: animation target pointer extension is missing.",
              );
            const pointer = record(
              pointerExtension,
              "animation target.extensions.KHR_animation_pointer",
            )["pointer"];
            if (
              typeof pointer !== "string" ||
              pointer.length === 0 ||
              !pointer.startsWith("/")
            ) {
              throw new TypeError(
                "GLTFLoader: animation pointer must be a non-empty JSON pointer.",
              );
            }
            return {
              target: { path, pointer },
              interpolation,
              times: readAccessor(
                integer(sampler["input"], "animation sampler.input"),
              ),
              values: readAccessor(
                integer(sampler["output"], "animation sampler.output"),
              ),
            } satisfies GLTFAnimationChannel;
          }
          return {
            target: {
              node: integer(target["node"], "animation target.node"),
              path,
            },
            interpolation,
            times: readAccessor(
              integer(sampler["input"], "animation sampler.input"),
            ),
            values: readAccessor(
              integer(sampler["output"], "animation sampler.output"),
            ),
          } satisfies GLTFAnimationChannel;
        });
        return {
          name:
            typeof source["name"] === "string"
              ? (source["name"] as string)
              : `Animation${index}`,
          channels,
        } satisfies GLTFAnimation;
      },
    );
  }

  async #loadExternalBuffers(
    document: Readonly<Record<string, unknown>>,
    sourceUrl: string,
    onProgress?: (event: ProgressEvent) => void,
  ): Promise<ReadonlyArray<ArrayBuffer | undefined>> {
    const buffers = array(document["buffers"] ?? [], "buffers");
    const base = sourceUrl.includes("/")
      ? sourceUrl.slice(0, sourceUrl.lastIndexOf("/") + 1)
      : this.resourcePath;
    return Promise.all(
      buffers.map(async (value, index) => {
        const source = record(value, `buffers[${index}]`);
        const uri = source["uri"];
        if (typeof uri !== "string" || uri.startsWith("data:")) return;
        const loader = new FileLoader(this.manager);
        loader.cache = this.cache;
        loader.responseType = "arraybuffer";
        loader.requestHeader = this.requestHeader;
        loader.withCredentials = this.withCredentials;
        const resolved = (() => {
          try {
            return new URL(uri, base).href;
          } catch {
            return base + uri;
          }
        })();
        return (await loader.loadAsync(resolved, onProgress)) as ArrayBuffer;
      }),
    );
  }
}
