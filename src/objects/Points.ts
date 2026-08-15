import type { Intersection, Raycaster } from "../core/Raycaster.ts";
import { Node } from "../core/Node.ts";
import type { Geometry } from "../geometry/Geometry.ts";
import type { Material } from "../materials/Material.ts";
import { raycastPointsGeometry } from "./raycast.ts";

/** Point cloud rasterized as individual vertices. */
export class Points extends Node {
  /** Serialization discriminator for this runtime type. */
  override type: string = "Points";

  /** Type guard identifying this concrete object type. */
  get isPoints(): true {
    return true;
  }

  /** Geometry providing point positions and optional morph channels. */
  geometry: Geometry | undefined;

  /** Material used to rasterize each point. */
  material: Material | undefined;

  /** Morph target names mapped to their attribute indices. */
  morphTargetDictionary: Record<string, number> | undefined = undefined;

  /** Per-target weights applied when morphing point positions. */
  morphTargetInfluences: number[] | undefined = undefined;

  /** Constructs a point cloud with optional geometry and material. */
  constructor(
    geometry: Geometry | undefined = void 0,
    material: Material | undefined = void 0,
  ) {
    super();
    this.geometry = geometry;
    this.material = material;
    this.updateMorphTargets();
  }

  /** Appends CPU ray intersections for this point cloud to the supplied array. */
  raycast(raycaster: Raycaster, intersects: Intersection[]): void {
    raycastPointsGeometry(
      this,
      this.geometry,
      this.matrixWorld,
      this.scale,
      raycaster,
      intersects,
    );
  }

  /** Populates morph target names and zeroed influence values when available. */
  updateMorphTargets(): void {
    const morphAttributes = this.geometry?.morphAttributes;
    const keys = morphAttributes ? Object.keys(morphAttributes) : [];
    const first =
      keys.length > 0 ? morphAttributes?.[keys[0] ?? ""] : undefined;
    if (first === undefined || first.length === 0) {
      this.morphTargetDictionary = undefined;
      this.morphTargetInfluences = undefined;
      return;
    }
    const dictionary: Record<string, number> = {};
    const influences: number[] = [];
    for (let index = 0; index < first.length; index++) {
      dictionary[first[index]?.name ?? String(index)] = index;
      influences.push(0);
    }
    this.morphTargetDictionary = dictionary;
    this.morphTargetInfluences = influences;
  }

  /** Returns an independent copy with cloned mutable state. */
  override clone(): Points {
    return new Points(this.geometry, this.material).copy(this);
  }

  /** Copies mutable state from another instance. */
  override copy(source: Points, recursive: boolean = true): this {
    super.copy(source, recursive);
    this.geometry = source.geometry;
    this.material = source.material;
    this.morphTargetDictionary =
      source.morphTargetDictionary === undefined
        ? undefined
        : { ...source.morphTargetDictionary };
    this.morphTargetInfluences = source.morphTargetInfluences?.slice();
    return this;
  }
}
