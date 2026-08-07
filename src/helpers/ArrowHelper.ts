import { Node } from "../core/Node.ts";
import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { ConeGeometry } from "../geometry/primitives/ConeGeometry.ts";
import { BasicMaterial } from "../materials/BasicMaterial.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import { Color, type ColorValue } from "../math/Color.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Line } from "../objects/Line.ts";
import { Mesh } from "../objects/Mesh.ts";

const Y_AXIS = new Vector3(0, 1, 0);

/** Readonly direction components used by an arrow helper. */
export interface ArrowDirection {
  /** Normalized arrow direction X component. */
  readonly x: number;
  /** Normalized arrow direction Y component. */
  readonly y: number;
  /** Normalized arrow direction Z component. */
  readonly z: number;
}

/** Optional direction, origin, dimensions, and color for an ArrowHelper. */
export interface ArrowHelperOptions {
  /** Direction vector; it is normalized and must be non-zero. */
  readonly direction?: ArrowDirection;
  /** Local-space start position of the arrow shaft. */
  readonly origin?: ArrowDirection;
  /** Total arrow length in local units. */
  readonly length?: number;
  /** RGB color shared by the shaft and cone materials. */
  readonly color?: ColorValue;
  /** Cone length in local units. */
  readonly headLength?: number;
  /** Cone width in local units. */
  readonly headWidth?: number;
}

/** Line-and-cone helper aligned to a direction without per-frame work. */
export class ArrowHelper extends Node {
  /** String identifier used by runtime type checks and serialization. */
  override type = "ArrowHelper";

  /** Returns `true` for this concrete type. */
  get isArrowHelper(): true {
    return true;
  }

  /** Line child representing the shaft. */
  readonly line: Line;

  /** Mesh child representing the cone head. */
  readonly cone: Mesh;

  readonly #direction = new Vector3(0, 1, 0);
  readonly #color = new Color(0xffff00);
  #length = 1;
  #headLength = 0.2;
  #headWidth = 0.04;

  /** Constructs reusable shaft and cone geometry aligned to the supplied direction. */
  constructor(options: ArrowHelperOptions = {}) {
    super();
    const direction = options.direction ?? Y_AXIS;
    const origin = options.origin ?? new Vector3();
    const length = options.length ?? 1;
    const color = options.color ?? 0xffff00;
    const headLength = options.headLength ?? length * 0.2;
    const headWidth = options.headWidth ?? headLength * 0.2;
    const lineGeometry = new Geometry().setAttribute(
      "position",
      new Attribute(new Float32Array([0, 0, 0, 0, 1, 0]), 3),
    );
    this.line = new Line(lineGeometry, new LineMaterial({ color }));
    this.cone = new Mesh(
      new ConeGeometry(0.5, 1, 5, 1),
      new BasicMaterial({ color }),
    );
    this.add(this.line, this.cone);
    this.position.set(origin.x, origin.y, origin.z);
    this.#length = validatePositive(length, "length");
    this.#headLength = validateRange(headLength, 0, this.#length, "headLength");
    this.#headWidth = validatePositive(headWidth, "headWidth", true);
    this.#color.set(color);
    this.direction = direction;
    this.#updateDimensions();
  }

  /** Normalized direction vector used by the helper quaternion. */
  get direction(): ArrowDirection {
    return this.#direction;
  }

  /** Rotates the helper to the supplied non-zero direction. */
  set direction(value: ArrowDirection) {
    if (
      !(
        Number.isFinite(value.x) &&
        Number.isFinite(value.y) &&
        Number.isFinite(value.z)
      )
    ) {
      throw new RangeError("ArrowHelper.direction must be finite.");
    }
    this.#direction.set(value.x, value.y, value.z);
    if (this.#direction.lengthSq === 0) {
      throw new RangeError("ArrowHelper.direction must be non-zero.");
    }
    this.#direction.normalize();
    this.quaternion.setFromUnitVectors(Y_AXIS, this.#direction);
  }

  /** Total arrow length in local units. */
  get length(): number {
    return this.#length;
  }

  /** Resizes the arrow while preserving valid head dimensions. */
  set length(value: number) {
    this.#length = validatePositive(value, "length");
    if (this.#headLength > value) this.#headLength = value;
    this.#updateDimensions();
  }

  /** Cone length in local units. */
  get headLength(): number {
    return this.#headLength;
  }

  /** Resizes the arrow head along its axis. */
  set headLength(value: number) {
    this.#headLength = validateRange(value, 0, this.#length, "headLength");
    this.#updateDimensions();
  }

  /** Cone width in local units. */
  get headWidth(): number {
    return this.#headWidth;
  }

  /** Resizes the arrow head across its axis. */
  set headWidth(value: number) {
    this.#headWidth = validatePositive(value, "headWidth", true);
    this.#updateDimensions();
  }

  /** Shared shaft and head color. */
  get color(): Color {
    return this.#color;
  }

  /** Recolors both child materials immediately. */
  set color(value: ColorValue) {
    this.#color.set(value);
    const lineMaterial = this.line.material;
    const coneMaterial = this.cone.material;
    if (lineMaterial) lineMaterial.color.copy(this.#color);
    if (coneMaterial instanceof BasicMaterial)
      coneMaterial.color.copy(this.#color);
  }

  /** Updates arrow dimensions with three.js-compatible defaults. */
  setLength(length: number, headLength?: number, headWidth?: number): void {
    this.length = length;
    const resolvedHeadLength = headLength ?? length * 0.2;
    const resolvedHeadWidth = headWidth ?? resolvedHeadLength * 0.2;
    this.headLength = resolvedHeadLength;
    this.headWidth = resolvedHeadWidth;
  }

  /** Returns an independent helper with independently owned geometry and materials. */
  override clone(): ArrowHelper {
    return new ArrowHelper().copy(this);
  }

  /** Copies transform and arrow settings without replacing child storage. */
  override copy(source: ArrowHelper): this {
    super.copy(source, false);
    this.line.copy(source.line, false);
    this.line.geometry = source.line.geometry?.clone();
    this.line.material = source.line.material?.clone();
    this.cone.copy(source.cone, false);
    this.cone.geometry = source.cone.geometry?.clone();
    this.cone.material = source.cone.material?.clone();
    this.#length = source.length;
    this.#headLength = source.headLength;
    this.#headWidth = source.headWidth;
    this.direction = source.direction;
    this.color = source.color;
    this.#updateDimensions();
    return this;
  }

  /** Releases shaft and head geometry and materials. */
  dispose(): void {
    this.line.geometry?.dispose();
    this.line.material?.dispose();
    this.cone.geometry?.dispose();
    this.cone.material?.dispose();
  }

  #updateDimensions(): void {
    this.line.scale.set(1, this.#length - this.#headLength, 1);
    this.cone.position.set(0, this.#length - this.#headLength * 0.5, 0);
    this.cone.scale.set(this.#headWidth, this.#headLength, this.#headWidth);
  }
}

function validatePositive(
  value: number,
  name: string,
  allowZero = false,
): number {
  if (!Number.isFinite(value) || (allowZero ? value < 0 : value <= 0)) {
    throw new RangeError(
      `ArrowHelper.${name} must be finite and ${allowZero ? "non-negative" : "positive"}.`,
    );
  }
  return value;
}

function validateRange(
  value: number,
  minimum: number,
  maximum: number,
  name: string,
): number {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(
      `ArrowHelper.${name} must be between ${minimum} and ${maximum}.`,
    );
  }
  return value;
}
