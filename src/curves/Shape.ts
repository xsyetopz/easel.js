import type { Vector2 } from "../math/Vector2.ts";
import { Path } from "./Path.ts";

/** Closed 2D path with optional holes, used for extrusion. */
export class Shape extends Path {
  override type = "Shape";
  #holes: Path[] = [];

  get holes(): Path[] {
    return this.#holes;
  }

  /** Returns an array of point arrays, one per hole. */
  getPointsHoles(divisions: number): Vector2[][] {
    return this.#holes.map((hole) => hole.getPoints(divisions) as Vector2[]);
  }

  /** Returns the shape outline points and hole points. */
  extractPoints(divisions: number): {
    shape: Vector2[];
    holes: Vector2[][];
  } {
    return {
      shape: this.getPoints(divisions) as Vector2[],
      holes: this.getPointsHoles(divisions),
    };
  }

  override clone(): Shape {
    return new Shape().copy(this);
  }

  override copy(source: Shape): this {
    super.copy(source);
    this.#holes = source.holes.map((h) => h.clone());
    return this;
  }
}
