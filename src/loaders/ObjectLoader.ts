import type { AnimationClip } from "../animation/AnimationClip.ts";
import type { Node, NodeJSON } from "../core/Node.ts";
import type { Shape } from "../curves/Shape.ts";
import type { Geometry } from "../geometry/Geometry.ts";
import type { Light } from "../lights/Light.ts";
import type { Material } from "../materials/Material.ts";
import type { Skeleton } from "../objects/Skeleton.ts";
import type { Texture } from "../textures/Texture.ts";
import {
  collectBones,
  collectNodes,
  type ObjectRecord,
} from "./_ObjectLoaderHelpers.ts";
import {
  bindLightTargetRecords,
  parseObjectRecord,
} from "./_ObjectLoaderObjects.ts";
import {
  parseAnimationRecords,
  parseGeometryRecords,
  parseImageRecords,
  parseMaterialRecords,
  parseShapeRecords,
  parseTextureRecords,
} from "./_ObjectLoaderResources.ts";
import {
  bindSkeletonRecords,
  parseSkeletonRecords,
} from "./_ObjectLoaderSkeletons.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";
import type { LoadingManager } from "./LoadingManager.ts";

/** Loads a JSON scene graph and returns a Node hierarchy. */
export class ObjectLoader extends Loader {
  /** Constructs a scene-graph loader bound to a LoadingManager. */
  constructor(manager: LoadingManager | undefined = void 0) {
    super(manager);
  }

  /** Loads a scene graph from a JSON resource. */
  override load(
    url: string,
    onLoad?: (node: Node) => void,
    onProgress: ((event: ProgressEvent) => void) | undefined = void 0,
    onError: ((err: unknown) => void) | undefined = void 0,
  ): void {
    const fileLoader = new FileLoader(this.manager);
    fileLoader.cache = this.cache;
    fileLoader.path = this.path;
    fileLoader.responseType = "json";
    fileLoader.requestHeader = this.requestHeader;

    fileLoader.load(
      url,
      (json) => {
        onLoad?.(this.parse(json as ObjectRecord));
      },
      onProgress,
      onError,
    );
  }

  /** Parses a canonical EASEL node record. */
  override parse(json: NodeJSON | ObjectRecord): Node {
    const record = json as ObjectRecord;
    const images = this.parseImages(record);
    const textures = this.parseTextures(record, images);
    const geometries = this.parseGeometries(record);
    const materials = this.parseMaterials(record, geometries, textures);
    const object = this.parseObject(record, geometries, materials, textures);
    const skeletons = this.parseSkeletons(record, collectBones(object));
    if (skeletons.size > 0) this.bindSkeletons(object, skeletons);
    this.bindLightTargets(object, collectNodes(object));
    return object;
  }

  /** Asynchronously parses a JSON scene graph. */
  parseAsync(data: unknown): Promise<unknown> {
    return Promise.resolve(this.parse(data as NodeJSON | ObjectRecord));
  }

  /** Parses geometry data from JSON, delegating to typed geometry loaders. */
  parseGeometries(json: ObjectRecord): Map<string, Geometry> {
    return parseGeometryRecords(this, json);
  }

  /** Parses material data from JSON, delegating to MaterialLoader. */
  parseMaterials(
    json: ObjectRecord,
    geometries: Map<string, Geometry>,
    textures: Map<string, Texture> = new Map(),
  ): Map<string, Material> {
    return parseMaterialRecords(this, json, geometries, textures);
  }

  /** Parses animation clips from JSON. */
  parseAnimations(json: ObjectRecord): AnimationClip[] {
    return parseAnimationRecords(this, json);
  }

  /** Parses image URL references from JSON into a uuid→URL map. */
  parseImages(json: ObjectRecord): Map<string, unknown> {
    return parseImageRecords(json);
  }

  /** Asynchronously parses image references; resolves with the URL map. */
  parseImagesAsync(json: ObjectRecord): Promise<Map<string, unknown>> {
    return Promise.resolve(this.parseImages(json));
  }

  /** Parses shape data from JSON using Shape.fromJSON. */
  parseShapes(json: ObjectRecord): Map<string, Shape> {
    return parseShapeRecords(json);
  }

  /** Parses skeleton data from JSON, resolving bone references. */
  parseSkeletons(json: ObjectRecord, bones: unknown): Map<string, Skeleton> {
    return parseSkeletonRecords(json, bones);
  }

  /** Parses texture data from JSON, creating Texture instances. */
  parseTextures(
    json: ObjectRecord,
    images: Map<string, unknown>,
  ): Map<string, Texture> {
    return parseTextureRecords(json, images);
  }

  /** Parses an object from JSON with optional geometry/material maps. */
  parseObject(
    data: ObjectRecord,
    geometries: Map<string, Geometry> = new Map(),
    materials: Map<string, Material> = new Map(),
    textures: Map<string, Texture> = new Map(),
  ): Node {
    return parseObjectRecord(data, { geometries, materials, textures });
  }

  /** Binds parsed skeletons to SkinnedMesh instances in the tree. */
  bindSkeletons(object: Node, skeletons: Map<string, Skeleton>): void {
    bindSkeletonRecords(object, skeletons);
  }

  /** Resolves light target UUIDs to scene-graph node references. */
  bindLightTargets(object: Node, lights: Map<string, Light> | Node[]): void {
    bindLightTargetRecords(object, lights);
  }
}
