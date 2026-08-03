import { Path } from "./Path.ts";
import { Shape } from "./Shape.ts";

/** Builder for Shape objects from SVG-style subpaths. */
export class ShapePath {
  type = "ShapePath";
  #subPaths: Path[] = [];
  #currentPath: Path | undefined = undefined;

  /** Starts a new sub-path at (x, y). */
  moveTo(x: number, y: number): this {
    this.#currentPath = new Path();
    this.#subPaths.push(this.#currentPath);
    this.#currentPath.moveTo(x, y);
    return this;
  }

  lineTo(x: number, y: number): this {
    this.#currentPath?.lineTo(x, y);
    return this;
  }

  quadraticCurveTo(cpX: number, cpY: number, x: number, y: number): this {
    this.#currentPath?.quadraticCurveTo(cpX, cpY, x, y);
    return this;
  }

  bezierCurveTo(
    cp1X: number,
    cp1Y: number,
    cp2X: number,
    cp2Y: number,
    x: number,
    y: number,
  ): this {
    this.#currentPath?.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, x, y);
    return this;
  }

  /**
   * Converts accumulated sub-paths into Shape objects.
   * Each sub-path becomes a Shape; isCCW controls winding-order interpretation.
   */
  toShapes(_isCCW = false): Shape[] {
    if (this.#subPaths.length === 0) return [];

    const shapes: Shape[] = [];
    for (const path of this.#subPaths) {
      const shape = new Shape();
      for (const curve of path.curves) shape.add(curve);
      shapes.push(shape);
    }
    return shapes;
  }
}
