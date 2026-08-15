import { OrthographicCamera } from "../cameras/OrthographicCamera.ts";
import { PerspectiveCamera } from "../cameras/PerspectiveCamera.ts";
import { Scene } from "../core/Scene.ts";
import type { Material } from "../materials/Material.ts";
import type { Texture } from "../textures/Texture.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";
import { parseAnimations } from "./_gltf/animations.ts";
import { parseCamera } from "./_gltf/cameras.ts";
import {
  parseAccessors,
  parseBufferViews,
  readAccessor,
  resolveBuffers,
} from "./_gltf/buffer.ts";
import type { BuildContext } from "./_gltf/extensions.ts";
import {
  parseInstancing,
  parseLOD,
  parseVariants,
} from "./_gltf/extensions.ts";
import {
  createDefaultMaterial,
  parseMaterials,
  parseTextureReferences,
} from "./_gltf/materials.ts";
import { buildNode } from "./_gltf/nodes.ts";
import type { NodeRecord } from "./_gltf/nodes.ts";
import { array, finite, integer, record } from "./_gltf/validation.ts";

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
  override parse(
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
    const buffers = resolveBuffers(document, options);
    const bufferViews = parseBufferViews(document);
    const accessors = parseAccessors(document);
    const readAccessorFn = (index: number): number[] =>
      readAccessor(index, accessors, bufferViews, buffers);
    const materialResult = parseMaterials(document, options);
    const defaultMaterial = createDefaultMaterial(options);
    const meshDefs = array(document["meshes"] ?? [], "meshes").map(
      (item, index) => record(item, `meshes[${index}]`),
    );
    const variantResult = parseVariants(document, meshDefs);
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
        const instancing = parseInstancing(
          nodeIndex,
          node,
          accessors,
          readAccessorFn,
        );
        if (instancing) context.instancing.set(nodeIndex, instancing);
      }
      const lod = parseLOD(nodeIndex, node, nodeDefs.length);
      if (lod) context.lods.set(nodeIndex, lod);
    }
    const cameraDefs = array(document["cameras"] ?? [], "cameras").map(
      (item, index) => record(item, `cameras[${index}]`),
    );
    const cameras = cameraDefs.map((camera, index) =>
      parseCamera(camera, index),
    );
    const textures = parseTextureReferences(document);
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
          buildNode(
            integer(nodeIndex, "scene node index"),
            nodeDefs,
            meshDefs,
            cameras,
            readAccessorFn,
            materialResult.materials,
            defaultMaterial,
            sceneIndex === selectedScene ? firstSceneCameras : undefined,
            context,
          ),
        );
      }
      sceneObjects.push(scene);
    }
    const animations = parseAnimations(document, readAccessorFn);
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
