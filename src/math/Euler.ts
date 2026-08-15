import { safeAsin } from "./MathUtils.ts";
import { Matrix4 } from "./Matrix4.ts";
import { Quaternion } from "./Quaternion.ts";
import {
  type Axis,
  type MatrixLike,
  type RotationOrderConfig,
  GIMBAL_LOCK_THRESHOLD,
  ROTATION_ORDER_CONFIG,
} from "./_EulerConfig.ts";

/** Supported Euler rotation orders. */
export type EulerOrder = "XYZ" | "YXZ" | "ZXY" | "ZYX" | "YZX" | "XZY";

const _m = new Matrix4();

interface MatrixElements {
  m11: number;
  m12: number;
  m13: number;
  m21: number;
  m22: number;
  m23: number;
  m31: number;
  m32: number;
  m33: number;
}

/** Euler angles with configurable rotation order. */
export class Euler {
  #x = 0;
  #y = 0;
  #z = 0;
  #order: EulerOrder = "XYZ";
  #onChangeCallback: (() => void) | undefined = undefined;

  /** Constructs Euler angles in the requested rotation order. */
  constructor(
    x: number = 0,
    y: number = 0,
    z: number = 0,
    order: EulerOrder = "XYZ",
  ) {
    this.#x = x;
    this.#y = y;
    this.#z = z;
    this.#order = order;
  }

  /** Cartesian x component. */
  get x(): number {
    return this.#x;
  }

  /** Replaces the Cartesian x component. */
  set x(value: number) {
    this.#x = value;
    this.#onChange();
  }

  /** Vertical Cartesian component. */
  get y(): number {
    return this.#y;
  }

  /** Replaces the Cartesian y component. */
  set y(value: number) {
    this.#y = value;
    this.#onChange();
  }

  /** Cartesian z component. */
  get z(): number {
    return this.#z;
  }

  /** Replaces the Cartesian z component. */
  set z(value: number) {
    this.#z = value;
    this.#onChange();
  }

  /** Euler rotation order applied to the x, y, and z angles. */
  get order(): EulerOrder {
    return this.#order;
  }

  /** Replaces the Euler rotation order and invokes the change callback. */
  set order(value: EulerOrder) {
    this.#order = value;
    this.#onChange();
  }

  #onChange(): void {
    if (this.#onChangeCallback) this.#onChangeCallback();
  }

  /** Returns a new instance with the same component values. */
  clone(): Euler {
    return new Euler(this.x, this.y, this.z, this.order);
  }

  /** Copies component values from the supplied instance into this one. */
  copy(euler: Euler): this {
    this.x = euler.x;
    this.y = euler.y;
    this.z = euler.z;
    this.order = euler.order;
    this.#onChange();
    return this;
  }

  /** Reads this value's components from `array` starting at `offset`. */
  fromArray(array: [number, number, number, EulerOrder?]): this {
    this.x = array[0];
    this.y = array[1];
    this.z = array[2];
    this.order = array[3] ?? this.order;
    this.#onChange();
    return this;
  }

  /** Re-expresses this euler in a different rotation order, preserving orientation. */
  reorder(newOrder: EulerOrder): this {
    const q = new Quaternion().setFromEuler(this);
    return this.setFromQuaternion(q, newOrder);
  }

  /** Replaces all angles and optionally the rotation order. */
  set(x: number, y: number, z: number, order?: EulerOrder): this {
    this.x = x;
    this.y = y;
    this.z = z;
    if (order !== undefined) this.order = order;
    this.#onChange();
    return this;
  }

  /** Replaces these Euler angles from a quaternion. */
  setFromQuaternion(q: Quaternion, order?: EulerOrder): this {
    _m.makeRotationFromQuaternion(q);
    return this.setFromRotationMatrix(_m, order);
  }

  /** Replaces these Euler angles from a rotation matrix. */
  setFromRotationMatrix(
    m: Matrix4 | { elements: number[] },
    order?: EulerOrder,
  ): this {
    const te = m.elements;
    const currentOrder = order ?? this.order;
    this.#applyRotationOrder(currentOrder, {
      m11: te[0],
      m12: te[4],
      m13: te[8],
      m21: te[1],
      m22: te[5],
      m23: te[9],
      m31: te[2],
      m32: te[6],
      m33: te[10],
    });
    this.order = currentOrder;
    this.#onChange();
    return this;
  }

  #applyRotationOrder(ord: EulerOrder, elements: MatrixElements): void {
    const cfg = ROTATION_ORDER_CONFIG[ord];
    if (cfg === undefined) return;
    this.#applyOrderConfig(cfg, elements as unknown as MatrixLike);
  }

  #applyOrderConfig(cfg: RotationOrderConfig, m: MatrixLike): void {
    const { primary, asinVal, lockVal, locked, unlocked } = cfg;
    const asin = asinVal(m);
    this.#setAxis(primary, safeAsin(asin));
    if (Math.abs(lockVal(m)) >= GIMBAL_LOCK_THRESHOLD) {
      this.#setAxis(locked.a.axis, Math.atan2(locked.a.n(m), locked.a.d(m)));
      const fallback = Math.atan2(locked.b.n(m), locked.b.d(m));
      this.#setAxis(
        locked.b.axis,
        this.#getAxis(locked.b.axis) === 0
          ? fallback
          : this.#getAxis(locked.b.axis),
      );
    } else {
      this.#setAxis(
        unlocked.a.axis,
        Math.atan2(unlocked.a.n(m), unlocked.a.d(m)),
      );
      this.#setAxis(
        unlocked.b.axis,
        Math.atan2(unlocked.b.n(m), unlocked.b.d(m)),
      );
    }
  }

  #setAxis(axis: Axis, value: number): void {
    if (axis === "x") this.x = value;
    else if (axis === "y") this.y = value;
    else this.z = value;
  }

  #getAxis(axis: Axis): number {
    if (axis === "x") return this.x;
    if (axis === "y") return this.y;
    return this.z;
  }

  /** Returns true when x, y, z, and order exactly match the argument. */
  equals(euler: Euler): boolean {
    return (
      this.x === euler.x &&
      this.y === euler.y &&
      this.z === euler.z &&
      this.order === euler.order
    );
  }

  /** Writes [x, y, z] into `array` at `offset` and returns the array. */
  toArray(array: number[] = [], offset: number = 0): number[] {
    array[offset] = this.x;
    array[offset + 1] = this.y;
    array[offset + 2] = this.z;
    return array;
  }

  /** Registers a callback invoked whenever x, y, z, or order changes. */
  setOnChangeCallback(callback: () => void): this {
    this.#onChangeCallback = callback;
    return this;
  }
}
