import type { OrthographicCamera } from "../cameras/OrthographicCamera.ts";
import type { PerspectiveCamera } from "../cameras/PerspectiveCamera.ts";
import { Scene } from "../core/Scene.ts";
import type { Material } from "../materials/Material.ts";
import type { Texture } from "../textures/Texture.ts";
import { parseAnimations } from "./_gltf/animations.ts";
import {
  parseAccessors,
  parseBufferViews,
  readAccessor as readAccessorValue,
  resolveBuffers,
} from "./_gltf/buffer.ts";
import { parseCamera } from "./_gltf/cameras.ts";
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
import type { NodeRecord } from "./_gltf/nodes.ts";
import { buildNode } from "./_gltf/nodes.ts";
import { array, finite, integer, record } from "./_gltf/validation.ts";
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
  /** CPU material family used when constructing parsed mesh materials. */
  readonly materialType?: "basic" | "lambert";
  /** Decoded textures keyed by their glTF texture indices. */
  readonly textures?: GLTFTextureMap;
  /** Buffer payloads supplied by the host for external or URI-less buffers. */
  readonly buffers?: ReadonlyArray<ArrayBuffer | ArrayBufferView | undefined>;
  /** Binary chunk used for the first URI-less buffer in a GLB-style document. */
  readonly binaryChunk?: ArrayBuffer | ArrayBufferView;
  /** Multiplier converting MSFT_lod screen coverage into traversal distances. */
  readonly lodDistanceScale?: number;
}
/** Decoded source attribute used to construct CPU instances. */
export interface GLTFInstanceAttributeInfo {
  /** glTF semantic identifying the per-instance attribute. */
  readonly semantic: string;
  /** Index of the accessor containing the attribute values. */
  readonly accessor: number;
  /** Component type used to decode the attribute. */
  readonly type: string;
  /** Number of instances represented by the decoded values. */
  readonly count: number;
  /** Flattened CPU values decoded from the accessor. */
  readonly values: readonly number[];
  /** Whether the source accessor marked these values as normalized. */
  readonly normalized: boolean;
}
/** CPU representation of an EXT_mesh_gpu_instancing node extension. */
export interface GLTFNodeInstancingInfo {
  /** Index of the node carrying the instancing extension. */
  readonly node: number;
  /** Number of instances decoded from the extension attributes. */
  readonly count: number;
  /** Decoded source attributes keyed by glTF semantic name. */
  readonly attributes: Readonly<Record<string, GLTFInstanceAttributeInfo>>;
}
/** CPU representation of an MSFT_lod node extension. */
export interface GLTFNodeLODInfo {
  /** Index of the node carrying the level-of-detail extension. */
  readonly node: number;
  /** Node indices ordered from highest to lowest detail. */
  readonly ids: readonly number[];
  /** Optional screen-coverage hints copied from the source node extras. */
  readonly screenCoverage: readonly number[] | undefined;
}
/** Source material mapping for one KHR_materials_variants primitive entry. */
export interface GLTFVariantMapping {
  /** Index of the mesh containing the mapped primitive. */
  readonly mesh: number;
  /** Index of the primitive receiving the material mapping. */
  readonly primitive: number;
  /** Index of the material selected by this variant mapping. */
  readonly material: number;
  /** Source variant indices that select this material mapping. */
  readonly variants: readonly number[];
}
/** Named KHR_materials_variants entry. */
export interface GLTFVariantInfo {
  /** Source variant index. */
  readonly index: number;
  /** Source variant name or generated fallback name. */
  readonly name: string;
}
/** Base-color texture reference retained when no decoded CPU texture is supplied. */
export interface GLTFTextureReference {
  /** Index of the glTF texture record. */
  readonly index: number;
  /** Texture-coordinate set used by the material. */
  readonly texCoord: number;
  /** Image source index, when available. */
  readonly source: number | undefined;
  /** URI for an externally addressable image source, when available. */
  readonly uri: string | undefined;
  /** Buffer-view index for embedded image data, when available. */
  readonly bufferView: number | undefined;
  /** MIME type declared for the image source, when available. */
  readonly mimeType: string | undefined;
}
/** CPU material and source metadata for one glTF material. */
export interface GLTFMaterialInfo {
  /** Index of the source material record. */
  readonly index: number;
  /** Source material name. */
  readonly name: string;
  /** EASEL material constructed for rendering the source material. */
  readonly material: Material;
  /** RGBA base-color factor from the source material. */
  readonly baseColorFactor: readonly [number, number, number, number];
  /** Base-color texture reference, when provided by the source. */
  readonly baseColorTexture: GLTFTextureReference | undefined;
  /** Source alpha rendering mode. */
  readonly alphaMode: "OPAQUE" | "MASK" | "BLEND";
  /** Alpha threshold used by mask materials. */
  readonly alphaCutoff: number;
  /** Whether the source material is double-sided. */
  readonly doubleSided: boolean;
}
/** Source animation target metadata, including KHR_animation_pointer paths. */
export interface GLTFAnimationTarget {
  /** Optional index of the node receiving the animation. */
  readonly node?: number;
  /** Source property path targeted by the animation channel. */
  readonly path: string;
  /** Optional JSON Pointer for extension-defined animation targets. */
  readonly pointer?: string;
}
/** One decoded animation channel. Values remain source-shaped CPU arrays. */
export interface GLTFAnimationChannel {
  /** Target metadata describing the animated node or JSON pointer. */
  readonly target: GLTFAnimationTarget;
  /** Interpolation mode used between decoded keyframes. */
  readonly interpolation: "LINEAR" | "STEP" | "CUBICSPLINE";
  /** Keyframe times in seconds. */
  readonly times: readonly number[];
  /** Raw output values in the source accessor shape. */
  readonly values: readonly number[];
}
/** Animation data suitable for conversion to EASEL tracks by an application. */
export interface GLTFAnimation {
  /** Source animation name or generated fallback name. */
  readonly name: string;
  /** Decoded animation channels. */
  readonly channels: readonly GLTFAnimationChannel[];
}
/** Result shape modeled after THREE.GLTFLoader, with CPU scene resources. */
export interface GLTFLoaderResult {
  /** First or selected scene constructed from the document. */
  readonly scene: Scene;
  /** All scenes constructed from the document. */
  readonly scenes: readonly Scene[];
  /** Cameras found in the selected scene resources. */
  readonly cameras: readonly (PerspectiveCamera | OrthographicCamera)[];
  /** Decoded animation channels grouped by source animation. */
  readonly animations: readonly GLTFAnimation[];
  /** CPU materials and source metadata for each parsed material. */
  readonly materials: readonly GLTFMaterialInfo[];
  /** Texture references used by parsed materials. */
  readonly textures: readonly GLTFTextureReference[];
  /** Asset-level metadata copied from the source document. */
  readonly asset: Readonly<Record<string, unknown>>;
  /** EXT_mesh_gpu_instancing metadata decoded for the document. */
  readonly instancing: readonly GLTFNodeInstancingInfo[];
  /** MSFT_lod metadata decoded for the document. */
  readonly lods: readonly GLTFNodeLODInfo[];
  /** Named KHR_materials_variants entries. */
  readonly variants: readonly GLTFVariantInfo[];
  /** KHR_materials_variants material mappings. */
  readonly variantMappings: readonly GLTFVariantMapping[];
}
type AccessorReader = (index: number) => number[];
type AccessorData = {
  readonly accessors: ReturnType<typeof parseAccessors>;
  readonly readAccessor: AccessorReader;
};
type SceneBuildInput = {
  readonly scenes: GLTFDocument[];
  readonly selectedScene: number;
  readonly nodeDefs: NodeRecord[];
  readonly meshDefs: GLTFDocument[];
  readonly cameras: readonly (PerspectiveCamera | OrthographicCamera)[];
  readonly readAccessor: AccessorReader;
  readonly materials: readonly GLTFMaterialInfo[];
  readonly defaultMaterial: Material;
  readonly context: BuildContext;
};
type BuiltScenes = {
  readonly sceneObjects: Scene[];
  readonly firstSceneCameras: (PerspectiveCamera | OrthographicCamera)[];
};

function field(value: Readonly<Record<string, unknown>>, key: string): unknown {
  return value[key];
}

function parseAccessorData(
  document: GLTFDocument,
  options: GLTFLoaderOptions,
): AccessorData {
  const buffers = resolveBuffers(document, options);
  const views = parseBufferViews(document);
  const accessors = parseAccessors(document);
  return {
    accessors,
    readAccessor: (index: number): number[] =>
      readAccessorValue(index, accessors, views, buffers),
  };
}

function parseDefinitions(document: GLTFDocument): {
  meshDefs: GLTFDocument[];
  nodeDefs: NodeRecord[];
} {
  const meshDefs = array(field(document, "meshes") ?? [], "meshes").map(
    (item, index) => record(item, `meshes[${index}]`),
  );
  const nodeDefs = array(field(document, "nodes") ?? [], "nodes").map(
    (item, index) => record(item, `nodes[${index}]`) as NodeRecord,
  );
  return { meshDefs, nodeDefs };
}

function createBuildContext(options: GLTFLoaderOptions): BuildContext {
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
  return context;
}

function collectNodeExtensions(
  nodeDefs: readonly NodeRecord[],
  accessors: ReturnType<typeof parseAccessors>,
  readAccessor: AccessorReader,
  context: BuildContext,
): void {
  for (const [nodeIndex, node] of nodeDefs.entries()) {
    if (node.mesh !== undefined) {
      const instancing = parseInstancing(
        nodeIndex,
        node,
        accessors,
        readAccessor,
      );
      if (instancing) context.instancing.set(nodeIndex, instancing);
    }
    const lod = parseLOD(nodeIndex, node, nodeDefs.length);
    if (lod) context.lods.set(nodeIndex, lod);
  }
}

function parseCameras(
  document: GLTFDocument,
): (PerspectiveCamera | OrthographicCamera)[] {
  return array(field(document, "cameras") ?? [], "cameras").map((item, index) =>
    parseCamera(record(item, `cameras[${index}]`), index),
  );
}

function parseSceneDefinitions(document: GLTFDocument): {
  scenes: GLTFDocument[];
  selectedScene: number;
} {
  const scenes = array(
    field(document, "scenes") ?? [{ nodes: [] }],
    "scenes",
  ).map((item, index) => record(item, `scenes[${index}]`));
  const selectedScene = integer(field(document, "scene"), "scene", 0);
  if (selectedScene < 0 || selectedScene >= scenes.length)
    throw new RangeError("GLTFLoader: scene index is out of range.");
  return { scenes, selectedScene };
}

function buildScenes(input: SceneBuildInput): BuiltScenes {
  const sceneObjects: Scene[] = [];
  const firstSceneCameras: (PerspectiveCamera | OrthographicCamera)[] = [];
  for (const [sceneIndex, sceneDef] of input.scenes.entries()) {
    const scene = new Scene();
    const name = field(sceneDef, "name");
    scene.name = typeof name === "string" ? name : `Scene${sceneIndex}`;
    scene.userData = { gltfSceneIndex: sceneIndex };
    for (const nodeIndex of array(
      field(sceneDef, "nodes") ?? [],
      `scenes[${sceneIndex}].nodes`,
    ))
      scene.add(
        buildNode(integer(nodeIndex, "scene node index"), {
          nodes: input.nodeDefs,
          meshes: input.meshDefs,
          cameras: input.cameras,
          readAccessor: input.readAccessor,
          materials: input.materials,
          defaultMaterial: input.defaultMaterial,
          collectCameras:
            sceneIndex === input.selectedScene ? firstSceneCameras : undefined,
          context: input.context,
        }),
      );
    sceneObjects.push(scene);
  }
  return { sceneObjects, firstSceneCameras };
}

function resolveBufferUrl(uri: string, base: string): string {
  try {
    return new URL(uri, base).href;
  } catch {
    return base + uri;
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
  override loadAsync(
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
    const asset = record(field(document, "asset"), "asset");
    const version = String(field(asset, "version") ?? "");
    if (!version.startsWith("2."))
      throw new Error(`GLTFLoader: unsupported asset version "${version}".`);
    const { accessors, readAccessor } = parseAccessorData(document, options);
    const materialResult = parseMaterials(document, options);
    const { meshDefs, nodeDefs } = parseDefinitions(document);
    const variantResult = parseVariants(document, meshDefs);
    const context = createBuildContext(options);
    collectNodeExtensions(nodeDefs, accessors, readAccessor, context);
    const cameras = parseCameras(document);
    const textures = parseTextureReferences(document);
    const { scenes, selectedScene } = parseSceneDefinitions(document);
    const { sceneObjects, firstSceneCameras } = buildScenes({
      scenes,
      selectedScene,
      nodeDefs,
      meshDefs,
      cameras,
      readAccessor,
      materials: materialResult.materials,
      defaultMaterial: createDefaultMaterial(options),
      context,
    });
    const scene = sceneObjects[selectedScene];
    if (scene === undefined)
      throw new RangeError("GLTFLoader: scene index is out of range.");
    return {
      scene,
      scenes: sceneObjects,
      cameras: firstSceneCameras.length > 0 ? firstSceneCameras : cameras,
      animations: parseAnimations(document, readAccessor),
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

  #loadExternalBuffers(
    document: Readonly<Record<string, unknown>>,
    sourceUrl: string,
    onProgress?: (event: ProgressEvent) => void,
  ): Promise<ReadonlyArray<ArrayBuffer | undefined>> {
    const buffers = array(field(document, "buffers") ?? [], "buffers");
    const base = sourceUrl.includes("/")
      ? sourceUrl.slice(0, sourceUrl.lastIndexOf("/") + 1)
      : this.resourcePath;
    return Promise.all(
      buffers.map(async (value, index) => {
        const source = record(value, `buffers[${index}]`);
        const uri = field(source, "uri");
        if (typeof uri !== "string" || uri.startsWith("data:")) return;
        const loader = new FileLoader(this.manager);
        loader.cache = this.cache;
        loader.responseType = "arraybuffer";
        loader.requestHeader = this.requestHeader;
        loader.withCredentials = this.withCredentials;
        return (await loader.loadAsync(
          resolveBufferUrl(uri, base),
          onProgress,
        )) as ArrayBuffer;
      }),
    );
  }
}
