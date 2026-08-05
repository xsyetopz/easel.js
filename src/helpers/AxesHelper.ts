import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import { Color, type ColorValue } from "../math/Color.ts";
import { LineSegments } from "../objects/LineSegments.ts";

/** Mutable colors used for the three axis lines. */
export interface AxisColors {
  /** Color used for the X-axis line. */
  readonly x: Color;
  /** Color used for the Y-axis line. */
  readonly y: Color;
  /** Color used for the Z-axis line. */
  readonly z: Color;
}

/** Color values accepted by AxesHelper.colors. */
export interface AxisColorValues {
  /** Color used for the X-axis line. */
  readonly x: ColorValue;
  /** Color used for the Y-axis line. */
  readonly y: ColorValue;
  /** Color used for the Z-axis line. */
  readonly z: ColorValue;
}

/** Displays the three coordinate axes as explicitly colored lines. */
export class AxesHelper extends LineSegments {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "AxesHelper";

  /** Returns `true` for this concrete type. */
  get isAxesHelper(): true {
    return true;
  }

  readonly #colors: AxisColors;

  /** Constructs fixed-size X, Y, and Z axis line geometry. */
  constructor(size: number = 1) {
    if (!Number.isFinite(size) || size <= 0) {
      throw new RangeError("AxesHelper size must be positive and finite.");
    }
    const geometry = new Geometry();
    geometry.setAttribute(
      "position",
      new Attribute(
        new Float32Array([
          0,
          0,
          0,
          size,
          0,
          0,
          0,
          0,
          0,
          0,
          size,
          0,
          0,
          0,
          0,
          0,
          0,
          size,
        ]),
        3,
      ),
    );
    geometry.setAttribute(
      "color",
      new Attribute(
        new Float32Array([
          1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1,
        ]),
        3,
      ),
    );
    super(geometry, new LineMaterial());
    this.#colors = {
      x: new Color(0xff0000),
      y: new Color(0x00ff00),
      z: new Color(0x0000ff),
    };
  }

  /** Mutable colors used by helper line vertices. */
  get colors(): AxisColors {
    return this.#colors;
  }

  /** Replaces axis colors; call updateColors() to publish them to geometry. */
  set colors(value: AxisColorValues) {
    this.#colors.x.set(value.x);
    this.#colors.y.set(value.y);
    this.#colors.z.set(value.z);
  }

  /** Explicitly writes the current axis colors into existing vertex storage. */
  updateColors(): this {
    const attribute = this.geometry?.getAttribute("color");
    if (!(attribute?.array instanceof Float32Array)) {
      throw new Error("AxesHelper color storage is unavailable.");
    }
    const { x, y, z } = this.#colors;
    attribute.array.set([
      x.r,
      x.g,
      x.b,
      x.r,
      x.g,
      x.b,
      y.r,
      y.g,
      y.b,
      y.r,
      y.g,
      y.b,
      z.r,
      z.g,
      z.b,
      z.r,
      z.g,
      z.b,
    ]);
    attribute.needsUpdate = true;
    return this;
  }

  /** Returns an independent helper with copied geometry, material, and colors. */
  override clone(): AxesHelper {
    return new AxesHelper().copy(this);
  }

  /** Copies transform, geometry, material, and canonical axis colors. */
  override copy(source: AxesHelper): this {
    super.copy(source, false);
    this.geometry = source.geometry?.clone();
    this.material = source.material?.clone();
    this.#colors.x.copy(source.colors.x);
    this.#colors.y.copy(source.colors.y);
    this.#colors.z.copy(source.colors.z);
    return this;
  }

  /** Releases owned geometry, materials, and CPU buffers. */
  dispose(): void {
    this.geometry?.dispose();
    this.material?.dispose();
  }
}
