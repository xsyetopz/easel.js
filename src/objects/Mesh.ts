import { Node } from "../core/Node.ts";
import type { Intersection, Raycaster } from "../core/Raycaster.ts";
import {
  type Geometry,
  registerGeometryCacheInvalidator,
  unregisterGeometryCacheInvalidator,
} from "../geometry/Geometry.ts";
import type { Material } from "../materials/Material.ts";
import type { Vector3 } from "../math/Vector3.ts";
import { raycastMeshGeometry } from "./raycast.ts";

interface MorphAttributeLike {
  readonly length: number;
  readonly name?: string;
  readonly getX?: (index: number) => number;
  readonly getY?: (index: number) => number;
  readonly getZ?: (index: number) => number;
}

/** Triangulated surface with geometry and material. */
export class Mesh extends Node {
  /** Serialization discriminator for this runtime type. */
  override type: string = "Mesh";

  /** Type guard identifying this concrete object type. */
  get isMesh(): true {
    return true;
  }

  #geometry: Geometry | undefined;

  #count = 1;

  readonly #invalidateGeometryCaches = (): void => {
    const caches = this as unknown as {
      _worldNormalCache: Float32Array | undefined;
      _worldNormalCacheKey: Float32Array | undefined;
      _instWorldNormals: Float32Array[] | undefined;
      _instWorldNormalKey: Float32Array[] | undefined;
    };
    caches._worldNormalCache = undefined;
    caches._worldNormalCacheKey = undefined;
    caches._instWorldNormals = undefined;
    caches._instWorldNormalKey = undefined;
  };

  /** Material used to rasterize the triangulated surface. */
  material: Material | undefined;

  /** Morph target names mapped to their attribute indices. */
  morphTargetDictionary: Record<string, number> | undefined = undefined;

  /** Per-target weights applied when morphing mesh positions. */
  morphTargetInfluences: number[] | undefined = undefined;

  /** Constructs a mesh with optional geometry and material. */
  constructor(
    geometry: Geometry | undefined = void 0,
    material: Material | undefined = void 0,
  ) {
    super();
    this.geometry = geometry;
    this.material = material;
    this.updateMorphTargets();
  }

  /** Geometry providing triangle positions, indices, and vertex channels. */
  get geometry(): Geometry | undefined {
    return this.#geometry;
  }

  /** Replaces the geometry and invalidates cached world-normal data. */
  set geometry(value: Geometry | undefined) {
    if (value === this.#geometry) return;
    if (this.#geometry) {
      unregisterGeometryCacheInvalidator(
        this.#geometry,
        this.#invalidateGeometryCaches,
      );
    }
    this.#geometry = value;
    if (value) {
      registerGeometryCacheInvalidator(value, this.#invalidateGeometryCaches);
    }
    this.#invalidateGeometryCaches();
    this.updateMorphTargets();
  }

  /** Number of times the object is rendered by instance-aware consumers. */
  get count(): number {
    return this.#count;
  }

  /** Changes the number of rendered instances. */
  set count(value: number) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError("Mesh.count must be a non-negative safe integer.");
    }
    this.#count = value;
  }

  /** Populates morph target names and zeroed influence values when available. */
  updateMorphTargets(): void {
    const geometry = this.#geometry;
    const morphAttributes = geometry?.morphAttributes;
    if (morphAttributes === undefined) {
      this.morphTargetDictionary = undefined;
      this.morphTargetInfluences = undefined;
      return;
    }

    const keys = Object.keys(morphAttributes);
    const first = keys.length > 0 ? morphAttributes[keys[0] ?? ""] : undefined;
    if (first === undefined || first.length === 0) {
      this.morphTargetDictionary = undefined;
      this.morphTargetInfluences = undefined;
      return;
    }

    const dictionary: Record<string, number> = {};
    const influences: number[] = [];
    for (let index = 0; index < first.length; index++) {
      const name = first[index]?.name ?? String(index);
      dictionary[name] = index;
      influences.push(0);
    }
    this.morphTargetDictionary = dictionary;
    this.morphTargetInfluences = influences;
  }

  /** Reads a local vertex position after applying the active morph targets. */
  getVertexPosition(index: number, target: Vector3): Vector3 {
    const position = this.#geometry?.getAttribute("position");
    if (position === undefined || index < 0 || index >= position.count) {
      return target.set(0, 0, 0);
    }
    target.set(
      position.getX(index),
      position.getY(index),
      position.getZ(index),
    );

    const geometry = this.#geometry;
    const morphAttributes = geometry?.morphAttributes as
      | { position?: MorphAttributeLike[] }
      | undefined;
    const morphPosition = morphAttributes?.position;
    const influences = this.morphTargetInfluences;
    if (morphPosition === undefined || influences === undefined) return target;

    const relative = geometry?.morphTargetsRelative === true;
    const baseX = target.x;
    const baseY = target.y;
    const baseZ = target.z;
    let morphX = 0;
    let morphY = 0;
    let morphZ = 0;
    for (let morphIndex = 0; morphIndex < morphPosition.length; morphIndex++) {
      const influence = influences[morphIndex] ?? 0;
      const morph = morphPosition[morphIndex];
      if (influence === 0 || morph === undefined) continue;
      const getX = morph.getX;
      const getY = morph.getY;
      const getZ = morph.getZ;
      if (!(getX && getY && getZ)) continue;
      const x = getX.call(morph, index);
      const y = getY.call(morph, index);
      const z = getZ.call(morph, index);
      morphX += (relative ? x : x - baseX) * influence;
      morphY += (relative ? y : y - baseY) * influence;
      morphZ += (relative ? z : z - baseZ) * influence;
    }
    return target.set(baseX + morphX, baseY + morphY, baseZ + morphZ);
  }

  /** Appends CPU ray intersections for this mesh geometry to the supplied array. */
  raycast(raycaster: Raycaster, intersects: Intersection[]): void {
    raycastMeshGeometry(
      this,
      this.geometry,
      this.matrixWorld,
      raycaster,
      intersects,
    );
  }

  /** Returns an independent copy with cloned mutable state. */
  override clone(): Mesh {
    return new Mesh(this.geometry, this.material).copy(this);
  }

  /** Copies mutable state from another instance. */
  override copy(source: Mesh, recursive: boolean = true): this {
    super.copy(source, recursive);
    this.geometry = source.geometry;
    this.material = source.material;
    this.count = source.count;
    this.morphTargetDictionary =
      source.morphTargetDictionary === undefined
        ? undefined
        : { ...source.morphTargetDictionary };
    this.morphTargetInfluences = source.morphTargetInfluences?.slice();
    return this;
  }
}
