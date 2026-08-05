import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import { Color, type ColorValue } from "../math/Color.ts";
import { LineSegments } from "../objects/LineSegments.ts";

/** Canonical grid colors. */
export interface GridHelperColors {
  /** Color used for the grid center line. */
  readonly center: Color;
  /** Color used for non-center grid divisions. */
  readonly division: Color;
}

/** Accepted values for replacing grid colors. */
export interface GridHelperColorValues {
  /** Color used for the grid center line. */
  readonly center: ColorValue;
  /** Color used for non-center grid divisions. */
  readonly division: ColorValue;
}

/** Ground-plane grid of line segments on the XZ plane. */
export class GridHelper extends LineSegments {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "GridHelper";

  /** Returns `true` for this concrete type. */
  get isGridHelper(): true {
    return true;
  }

  #size: number;
  #divisions: number;
  readonly #colors: GridHelperColors;

  /** Constructs an XZ-plane grid with the requested size and divisions. */
  constructor(
    size: number = 10,
    divisions: number = 10,
    color1: Color | number | string = 0x444444,
    color2: Color | number | string = 0x888888,
  ) {
    if (!Number.isFinite(size) || size <= 0) {
      throw new RangeError("GridHelper size must be positive and finite.");
    }
    if (!Number.isInteger(divisions) || divisions < 1) {
      throw new RangeError("GridHelper divisions must be a positive integer.");
    }

    const centerColor = color1 instanceof Color ? color1 : new Color(color1);
    const divisionColor = color2 instanceof Color ? color2 : new Color(color2);
    const half = size / 2;
    const step = size / divisions;
    const positions = new Float32Array((divisions + 1) * 12);
    const colors = new Float32Array(positions.length);
    let offset = 0;

    for (let i = 0; i <= divisions; i++) {
      const t = -half + i * step;
      const color = i === divisions / 2 ? centerColor : divisionColor;
      positions.set([t, 0, -half, t, 0, half, -half, 0, t, half, 0, t], offset);
      colors.set(
        [
          color.r,
          color.g,
          color.b,
          color.r,
          color.g,
          color.b,
          color.r,
          color.g,
          color.b,
          color.r,
          color.g,
          color.b,
        ],
        offset,
      );
      offset += 12;
    }

    const geometry = new Geometry();
    geometry.setAttribute("position", new Attribute(positions, 3));
    geometry.setAttribute("color", new Attribute(colors, 3));
    super(geometry, new LineMaterial());
    this.#size = size;
    this.#divisions = divisions;
    this.#colors = {
      center: centerColor.clone(),
      division: divisionColor.clone(),
    };
  }

  /** Total width and depth of the grid. */
  get size(): number {
    return this.#size;
  }

  /** Sets width and depth while mutating the cached vertex storage. */
  set size(value: number) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError("GridHelper size must be positive and finite.");
    }
    this.#size = value;
    this.#writeGeometry();
  }

  /** Number of subdivisions across the grid. */
  get divisions(): number {
    return this.#divisions;
  }

  /** Canonical center and division colors. */
  get colors(): GridHelperColors {
    return this.#colors;
  }

  /** Replaces canonical colors and publishes them to the vertex buffer. */
  set colors(value: GridHelperColorValues) {
    this.#colors.center.set(value.center);
    this.#colors.division.set(value.division);
    this.updateColors();
  }

  /** Publishes canonical colors into the retained vertex storage. */
  updateColors(): this {
    const attribute = this.geometry?.getAttribute("color");
    if (!(attribute?.array instanceof Float32Array)) {
      throw new Error("GridHelper color storage is unavailable.");
    }
    const center = this.#divisions / 2;
    for (let index = 0; index <= this.#divisions; index++) {
      const color =
        index === center ? this.#colors.center : this.#colors.division;
      const offset = index * 12;
      for (let vertex = 0; vertex < 4; vertex++) {
        attribute.array.set([color.r, color.g, color.b], offset + vertex * 3);
      }
    }
    attribute.needsUpdate = true;
    return this;
  }

  /** Returns an independent helper with copied geometry, material, and colors. */
  override clone(): GridHelper {
    return new GridHelper(
      this.size,
      this.divisions,
      this.colors.center,
      this.colors.division,
    ).copy(this);
  }

  /** Copies transform, configuration, geometry, material, and colors. */
  override copy(source: GridHelper): this {
    super.copy(source, false);
    this.#size = source.size;
    this.#divisions = source.divisions;
    this.#colors.center.copy(source.colors.center);
    this.#colors.division.copy(source.colors.division);
    this.geometry = source.geometry?.clone();
    this.material = source.material?.clone();
    return this;
  }

  /** Releases owned geometry, materials, and CPU buffers. */
  dispose(): void {
    this.geometry?.dispose();
    this.material?.dispose();
  }

  #writeGeometry(): void {
    const position = this.geometry?.getAttribute("position");
    if (!(position?.array instanceof Float32Array)) return;
    const half = this.#size / 2;
    const step = this.#size / this.#divisions;
    let offset = 0;
    for (let index = 0; index <= this.#divisions; index++) {
      const t = -half + index * step;
      position.array.set(
        [t, 0, -half, t, 0, half, -half, 0, t, half, 0, t],
        offset,
      );
      offset += 12;
    }
    position.needsUpdate = true;
  }
}
