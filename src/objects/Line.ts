import type { Intersection, Raycaster } from "../core/Raycaster.ts";
import { Node } from "../core/Node.ts";
import { Attribute } from "../geometry/Attribute.ts";
import type { Geometry } from "../geometry/Geometry.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import { Vector3 } from "../math/Vector3.ts";
import { raycastLineGeometry } from "./raycast.ts";

const _lineStart = new Vector3();
const _lineEnd = new Vector3();

/** Polyline rendered as connected segments from its position channel. */
export class Line extends Node {
  /** Serialization discriminator for this runtime type. */
  override type: string = "Line";

  /** Type guard identifying this concrete object type. */
  get isLine(): true {
    return true;
  }

  /** Geometry providing line positions and optional line-distance data. */
  geometry: Geometry | undefined;

  #material: LineMaterial | undefined;

  /** Morph target names mapped to their attribute indices. */
  morphTargetDictionary: Record<string, number> | undefined = undefined;

  /** Per-target weights applied when morphing line positions. */
  morphTargetInfluences: number[] | undefined = undefined;

  /** Constructs a connected line with optional geometry and material. */
  constructor(
    geometry: Geometry | undefined = void 0,
    material: LineMaterial | undefined = void 0,
  ) {
    super();
    this.geometry = geometry;
    this.material = material;
    this.updateMorphTargets();
  }

  /** Material used to rasterize the line segments. */
  get material(): LineMaterial | undefined {
    return this.#material;
  }

  /** Replaces the line material; only `LineMaterial` values are accepted. */
  set material(value: LineMaterial | undefined) {
    if (value !== undefined && !(value instanceof LineMaterial)) {
      throw new TypeError("Line.material must be a LineMaterial or undefined");
    }
    this.#material = value;
  }

  /** Computes cumulative distances for connected non-indexed line vertices. */
  computeLineDistances(): this {
    const geometry = this.geometry;
    const position = geometry?.getAttribute("position");
    if (geometry === undefined || position === undefined || geometry.index) {
      return this;
    }

    const lineDistances = new Float32Array(position.count);
    for (let index = 1; index < position.count; index++) {
      _lineStart.set(
        position.getX(index - 1),
        position.getY(index - 1),
        position.getZ(index - 1),
      );
      _lineEnd.set(
        position.getX(index),
        position.getY(index),
        position.getZ(index),
      );
      lineDistances[index] =
        lineDistances[index - 1] + _lineStart.distanceTo(_lineEnd);
    }
    geometry.setAttribute("lineDistance", new Attribute(lineDistances, 1));
    return this;
  }

  /** Appends CPU ray intersections for this line to the supplied array. */
  raycast(raycaster: Raycaster, intersects: Intersection[]): void {
    let lineType: "loop" | "segments" | "line";
    if (this.type === "LineLoop") {
      lineType = "loop";
    } else if (this.type === "LineSegments") {
      lineType = "segments";
    } else {
      lineType = "line";
    }
    raycastLineGeometry(
      this,
      this.geometry,
      this.matrixWorld,
      this.scale,
      lineType,
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
  override clone(): Line {
    return new Line(this.geometry, this.material).copy(this);
  }

  /** Copies mutable state from another instance. */
  override copy(source: Line, recursive: boolean = true): this {
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
