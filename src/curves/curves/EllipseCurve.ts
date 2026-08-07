import { Vector2 } from "../../math/Vector2.ts";
import { Curve } from "../Curve.ts";

/** Two-dimensional ellipse or partial ellipse curve. */
export class EllipseCurve extends Curve {
  /** Serialization discriminator for this runtime type. */
  override type: string = "EllipseCurve";
  /** Boolean type guard for this THREE.js-compatible curve type. */
  readonly isEllipseCurve = true;
  #cx: number;
  #cy: number;
  #xRadius: number;
  #yRadius: number;
  #startAngle: number;
  #endAngle: number;
  #clockwise: boolean;
  #rotation: number;

  /** Constructs an ellipse from center, radii, angles, and rotation. */
  constructor(
    cx: number = 0,
    cy: number = 0,
    xRadius: number = 1,
    yRadius: number = 1,
    startAngle: number = 0,
    endAngle: number = Math.PI * 2,
    clockwise: boolean = false,
    rotation: number = 0,
  ) {
    super();
    this.#cx = cx;
    this.#cy = cy;
    this.#xRadius = xRadius;
    this.#yRadius = yRadius;
    this.#startAngle = startAngle;
    this.#endAngle = endAngle;
    this.#clockwise = clockwise;
    this.#rotation = rotation;
  }

  /** Ellipse center x coordinate in local units. */
  get cx(): number {
    return this.#cx;
  }

  /** Assigns the center x coordinate and invalidates cached lengths. */
  set cx(value: number) {
    this.#cx = value;
    this.updateArcLengths();
  }

  /** Ellipse center y coordinate in local units. */
  get cy(): number {
    return this.#cy;
  }

  /** Assigns the center y coordinate and invalidates cached lengths. */
  set cy(value: number) {
    this.#cy = value;
    this.updateArcLengths();
  }

  /** Radius along the local x axis, in curve units. */
  get xRadius(): number {
    return this.#xRadius;
  }

  /** Assigns the x radius and invalidates cached lengths. */
  set xRadius(value: number) {
    this.#xRadius = value;
    this.updateArcLengths();
  }

  /** Radius along the local y axis, in curve units. */
  get yRadius(): number {
    return this.#yRadius;
  }

  /** Assigns the y radius and invalidates cached lengths. */
  set yRadius(value: number) {
    this.#yRadius = value;
    this.updateArcLengths();
  }

  /** Start angle, measured in radians. */
  get startAngle(): number {
    return this.#startAngle;
  }

  /** Assigns the start angle in radians and invalidates cached lengths. */
  set startAngle(value: number) {
    this.#startAngle = value;
    this.updateArcLengths();
  }

  /** End angle, measured in radians. */
  get endAngle(): number {
    return this.#endAngle;
  }

  /** Assigns the end angle in radians and invalidates cached lengths. */
  set endAngle(value: number) {
    this.#endAngle = value;
    this.updateArcLengths();
  }

  /** Whether parameter traversal proceeds clockwise. */
  get clockwise(): boolean {
    return this.#clockwise;
  }

  /** Assigns traversal direction and invalidates cached lengths. */
  set clockwise(value: boolean) {
    this.#clockwise = value;
    this.updateArcLengths();
  }

  /** Rotation of the ellipse axes, in radians. */
  get rotation(): number {
    return this.#rotation;
  }

  /** Assigns ellipse rotation in radians and invalidates cached lengths. */
  set rotation(value: number) {
    this.#rotation = value;
    this.updateArcLengths();
  }

  /** Three.js-compatible alias for {@link cx}. */
  get aX(): number {
    return this.cx;
  }

  /** Three.js-compatible alias for {@link cx}. */
  set aX(value: number) {
    this.cx = value;
  }

  /** Three.js-compatible alias for {@link cy}. */
  get aY(): number {
    return this.cy;
  }

  /** Three.js-compatible alias for {@link cy}. */
  set aY(value: number) {
    this.cy = value;
  }

  /** Three.js-compatible alias for {@link rotation}. */
  get aRotation(): number {
    return this.rotation;
  }

  /** Three.js-compatible alias for {@link rotation}. */
  set aRotation(value: number) {
    this.rotation = value;
  }

  /** Three.js-compatible alias for {@link startAngle}. */
  get aStartAngle(): number {
    return this.startAngle;
  }

  /** Three.js-compatible alias for {@link startAngle}. */
  set aStartAngle(value: number) {
    this.startAngle = value;
  }

  /** Three.js-compatible alias for {@link endAngle}. */
  get aEndAngle(): number {
    return this.endAngle;
  }

  /** Three.js-compatible alias for {@link endAngle}. */
  set aEndAngle(value: number) {
    this.endAngle = value;
  }

  /** Three.js-compatible alias for {@link clockwise}. */
  get aClockwise(): boolean {
    return this.clockwise;
  }

  /** Three.js-compatible alias for {@link clockwise}. */
  set aClockwise(value: boolean) {
    this.clockwise = value;
  }

  /** Evaluates the ellipse at normalized parameter `t` in `[0, 1]`. */
  override getPoint(t: number, target: Vector2 = new Vector2()): Vector2 {
    const delta = this.#endAngle - this.#startAngle;
    const angle = this.#clockwise
      ? this.#endAngle - t * delta
      : this.#startAngle + t * delta;
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    const cosRotation = Math.cos(this.#rotation);
    const sinRotation = Math.sin(this.#rotation);
    return target.set(
      this.#cx +
        this.#xRadius * cosAngle * cosRotation -
        this.#yRadius * sinAngle * sinRotation,
      this.#cy +
        this.#xRadius * cosAngle * sinRotation +
        this.#yRadius * sinAngle * cosRotation,
    );
  }

  /** Returns an independent copy with cloned mutable state. */
  override clone(): EllipseCurve {
    return new EllipseCurve(
      this.#cx,
      this.#cy,
      this.#xRadius,
      this.#yRadius,
      this.#startAngle,
      this.#endAngle,
      this.#clockwise,
      this.#rotation,
    ).copy(this);
  }

  /** Copies values from another ellipse. */
  override copy(source: EllipseCurve): this {
    super.copy(source);
    this.#cx = source.cx;
    this.#cy = source.cy;
    this.#xRadius = source.xRadius;
    this.#yRadius = source.yRadius;
    this.#startAngle = source.startAngle;
    this.#endAngle = source.endAngle;
    this.#clockwise = source.clockwise;
    this.#rotation = source.rotation;
    return this;
  }

  /** Serializes this ellipse with THREE.js field names. */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      aX: this.#cx,
      aY: this.#cy,
      xRadius: this.#xRadius,
      yRadius: this.#yRadius,
      aStartAngle: this.#startAngle,
      aEndAngle: this.#endAngle,
      aClockwise: this.#clockwise,
      aRotation: this.#rotation,
    };
  }

  /** Restores ellipse parameters from serialized field names. */
  override fromJSON(json: Record<string, unknown>): this {
    super.fromJSON(json);
    this.#cx = numberValue(json["aX"], this.#cx);
    this.#cy = numberValue(json["aY"], this.#cy);
    this.#xRadius = numberValue(json["xRadius"], this.#xRadius);
    this.#yRadius = numberValue(json["yRadius"], this.#yRadius);
    this.#startAngle = numberValue(json["aStartAngle"], this.#startAngle);
    this.#endAngle = numberValue(json["aEndAngle"], this.#endAngle);
    this.#clockwise =
      typeof json["aClockwise"] === "boolean"
        ? json["aClockwise"]
        : this.#clockwise;
    this.#rotation = numberValue(json["aRotation"], this.#rotation);
    this.updateArcLengths();
    return this;
  }
}

/** Reads a finite numeric JSON value with a fallback. */
function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
