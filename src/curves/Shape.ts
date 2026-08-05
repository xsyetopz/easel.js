import type { Vector2 } from "../math/Vector2.ts";
import { Path } from "./Path.ts";

/** Closed 2D path with optional holes for triangulation or extrusion. */
export class Shape extends Path {
  /** Serialization discriminator for this runtime type. */
  override type: string = "Shape";
  #holes: Path[] = [];

  /** Mutable paths that define holes inside this shape. */
  get holes(): Path[] {
    return this.#holes;
  }

  /** Samples each hole path at the requested subdivision count. */
  getPointsHoles(divisions: number): Vector2[][] {
    return this.#holes.map((hole) => hole.getPoints(divisions) as Vector2[]);
  }

  /** Samples the outline and all hole paths for triangulation. */
  extractPoints(divisions: number): {
    shape: Vector2[];
    holes: Vector2[][];
  } {
    return {
      shape: this.getPoints(divisions) as Vector2[],
      holes: this.getPointsHoles(divisions),
    };
  }

  /** Returns an independent copy with cloned outline and holes. */
  override clone(): Shape {
    return new Shape().copy(this);
  }

  /** Copies the outline, holes, and base path settings. */
  override copy(source: Shape): this {
    super.copy(source);
    this.#holes = source.holes.map((hole) => hole.clone());
    return this;
  }

  /** Serializes this shape and its holes. */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      holes: this.#holes.map((hole) => hole.toJSON()),
    };
  }

  /** Restores the outline and hole paths from serialized data. */
  override fromJSON(json: Record<string, unknown>): this {
    super.fromJSON(json);
    const holes = json["holes"];
    this.#holes = Array.isArray(holes)
      ? holes
          .filter((hole): hole is Record<string, unknown> => isRecord(hole))
          .map((hole) => new Path().fromJSON(hole))
      : [];
    return this;
  }
}

/** Narrows unknown input to a JSON object record. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
