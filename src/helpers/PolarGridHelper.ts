import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import { Color, type ColorValue } from "../math/Color.ts";
import { LineSegments } from "../objects/LineSegments.ts";

/** Canonical polar-grid colors. */
export interface PolarGridHelperColors {
  /** First color in the alternating radial/ring pattern. */
  readonly first: Color;
  /** Second color in the alternating radial/ring pattern. */
  readonly second: Color;
}

/** Accepted values for replacing polar-grid colors. */
export interface PolarGridHelperColorValues {
  /** First color in the alternating radial/ring pattern. */
  readonly first: ColorValue;
  /** Second color in the alternating radial/ring pattern. */
  readonly second: ColorValue;
}

/** Polar grid of radial sectors and concentric rings on the XZ plane. */
export class PolarGridHelper extends LineSegments {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "PolarGridHelper";

  /** Returns `true` for this concrete type. */
  get isPolarGridHelper(): true {
    return true;
  }

  #radius: number;
  #sectors: number;
  #rings: number;
  #divisions: number;
  readonly #colors: PolarGridHelperColors;

  /** Constructs radial sectors and concentric rings on the XZ plane. */
  constructor(
    radius: number = 10,
    sectors: number = 16,
    rings: number = 8,
    divisions: number = 64,
    color1: Color | number | string = 0x444444,
    color2: Color | number | string = 0x888888,
  ) {
    assertPositiveFinite(radius, "radius");
    assertIntegerAtLeast(sectors, 2, "sectors");
    assertIntegerAtLeast(rings, 1, "rings");
    assertIntegerAtLeast(divisions, 3, "divisions");

    const first = color1 instanceof Color ? color1 : new Color(color1);
    const second = color2 instanceof Color ? color2 : new Color(color2);
    const positions = new Float32Array((sectors + rings * divisions) * 6);
    const colors = new Float32Array(positions.length);
    let offset = 0;

    for (let sector = 0; sector < sectors; sector++) {
      const angle = (sector / sectors) * Math.PI * 2;
      const color = sector % 2 === 0 ? second : first;
      offset = writeSegment(
        positions,
        colors,
        offset,
        0,
        0,
        Math.sin(angle) * radius,
        Math.cos(angle) * radius,
        color,
      );
    }

    for (let ring = 0; ring < rings; ring++) {
      const color = ring % 2 === 0 ? second : first;
      const ringRadius = radius * (1 - ring / rings);
      for (let division = 0; division < divisions; division++) {
        const start = (division / divisions) * Math.PI * 2;
        const end = ((division + 1) / divisions) * Math.PI * 2;
        offset = writeSegment(
          positions,
          colors,
          offset,
          Math.sin(start) * ringRadius,
          Math.cos(start) * ringRadius,
          Math.sin(end) * ringRadius,
          Math.cos(end) * ringRadius,
          color,
        );
      }
    }

    const geometry = new Geometry();
    geometry.setAttribute("position", new Attribute(positions, 3));
    geometry.setAttribute("color", new Attribute(colors, 3));
    super(geometry, new LineMaterial());
    this.#radius = radius;
    this.#sectors = sectors;
    this.#rings = rings;
    this.#divisions = divisions;
    this.#colors = { first: first.clone(), second: second.clone() };
  }

  /** Outer radius of the grid. */
  get radius(): number {
    return this.#radius;
  }

  /** Sets radius and mutates cached position storage. */
  set radius(value: number) {
    assertPositiveFinite(value, "radius");
    this.#radius = value;
    this.#writeGeometry();
  }

  /** Number of radial spokes around the XZ-plane grid. */
  get sectors(): number {
    return this.#sectors;
  }

  /** Number of concentric rings inside the outer radius. */
  get rings(): number {
    return this.#rings;
  }

  /** Number of line divisions per ring. */
  get divisions(): number {
    return this.#divisions;
  }

  /** Mutable colors used by alternating spokes and rings. */
  get colors(): PolarGridHelperColors {
    return this.#colors;
  }

  /** Replaces canonical colors and publishes them to retained storage. */
  set colors(value: PolarGridHelperColorValues) {
    this.#colors.first.set(value.first);
    this.#colors.second.set(value.second);
    this.updateColors();
  }

  /** Publishes canonical colors into the retained vertex buffer. */
  updateColors(): this {
    const attribute = this.geometry?.getAttribute("color");
    if (!(attribute?.array instanceof Float32Array)) {
      throw new Error("PolarGridHelper color storage is unavailable.");
    }
    let offset = 0;
    for (let sector = 0; sector < this.#sectors; sector++) {
      const color = sector % 2 === 0 ? this.#colors.second : this.#colors.first;
      for (let vertex = 0; vertex < 2; vertex++) {
        attribute.array.set([color.r, color.g, color.b], offset + vertex * 3);
      }
      offset += 6;
    }
    for (let ring = 0; ring < this.#rings; ring++) {
      const color = ring % 2 === 0 ? this.#colors.second : this.#colors.first;
      for (let division = 0; division < this.#divisions; division++) {
        attribute.array.set([color.r, color.g, color.b], offset);
        attribute.array.set([color.r, color.g, color.b], offset + 3);
        offset += 6;
      }
    }
    attribute.needsUpdate = true;
    return this;
  }

  /** Returns an independent helper with copied geometry, material, and colors. */
  override clone(): PolarGridHelper {
    return new PolarGridHelper(
      this.radius,
      this.sectors,
      this.rings,
      this.divisions,
      this.colors.first,
      this.colors.second,
    ).copy(this);
  }

  /** Copies transform, configuration, geometry, material, and colors. */
  override copy(source: PolarGridHelper): this {
    super.copy(source, false);
    this.#radius = source.radius;
    this.#sectors = source.sectors;
    this.#rings = source.rings;
    this.#divisions = source.divisions;
    this.#colors.first.copy(source.colors.first);
    this.#colors.second.copy(source.colors.second);
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
    const attribute = this.geometry?.getAttribute("position");
    if (!(attribute?.array instanceof Float32Array)) return;
    let offset = 0;
    for (let sector = 0; sector < this.#sectors; sector++) {
      const angle = (sector / this.#sectors) * Math.PI * 2;
      offset = writePositionSegment(
        attribute.array,
        offset,
        0,
        0,
        Math.sin(angle) * this.#radius,
        Math.cos(angle) * this.#radius,
      );
    }
    for (let ring = 0; ring < this.#rings; ring++) {
      const ringRadius = this.#radius * (1 - ring / this.#rings);
      for (let division = 0; division < this.#divisions; division++) {
        const start = (division / this.#divisions) * Math.PI * 2;
        const end = ((division + 1) / this.#divisions) * Math.PI * 2;
        offset = writePositionSegment(
          attribute.array,
          offset,
          Math.sin(start) * ringRadius,
          Math.cos(start) * ringRadius,
          Math.sin(end) * ringRadius,
          Math.cos(end) * ringRadius,
        );
      }
    }
    attribute.needsUpdate = true;
  }
}

function writePositionSegment(
  positions: Float32Array,
  offset: number,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
): number {
  positions.set([x0, 0, z0, x1, 0, z1], offset);
  return offset + 6;
}

function writeSegment(
  positions: Float32Array,
  colors: Float32Array,
  offset: number,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  color: Color,
): number {
  positions.set([x0, 0, z0, x1, 0, z1], offset);
  colors.set([color.r, color.g, color.b, color.r, color.g, color.b], offset);
  return offset + 6;
}

function assertPositiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(
      `PolarGridHelper ${name} must be positive and finite.`,
    );
  }
}

function assertIntegerAtLeast(
  value: number,
  minimum: number,
  name: string,
): void {
  if (!Number.isInteger(value) || value < minimum) {
    throw new RangeError(
      `PolarGridHelper ${name} must be an integer of at least ${minimum}.`,
    );
  }
}
