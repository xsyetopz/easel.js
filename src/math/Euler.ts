import { safeAsin } from "./MathUtils.ts";
import type { Matrix4 } from "./Matrix4.ts";
import { linkQuaternionToEuler, Quaternion } from "./Quaternion.ts";

/** Absolute sine at which Euler extraction switches to gimbal-lock handling. */
const GIMBAL_LOCK_THRESHOLD = 0.9999999;

/** Supported Euler rotation orders. */
export type EulerOrder = "XYZ" | "YXZ" | "ZXY" | "ZYX" | "YZX" | "XZY";

// Float64 rotation elements of a quaternion, in Matrix4 column-major layout,
// so angles extracted from a quaternion match three.js bit for bit; a Float32
// Matrix4 would round them first.
const _te: number[] = new Array<number>(16).fill(0);
const _rotation = { elements: _te };

function rotationElementsFromQuaternion(q: Quaternion): number[] {
  // Same expressions as three.js Matrix4.compose with unit scale.
  const { x, y, z, w } = q;
  const x2 = x + x;
  const y2 = y + y;
  const z2 = z + z;
  const xx = x * x2;
  const xy = x * y2;
  const xz = x * z2;
  const yy = y * y2;
  const yz = y * z2;
  const zz = z * z2;
  const wx = w * x2;
  const wy = w * y2;
  const wz = w * z2;
  _te[0] = 1 - (yy + zz);
  _te[1] = xy + wz;
  _te[2] = xz - wy;
  _te[4] = xy - wz;
  _te[5] = 1 - (xx + zz);
  _te[6] = yz + wx;
  _te[8] = xz + wy;
  _te[9] = yz - wx;
  _te[10] = 1 - (xx + yy);
  return _te;
}

let syncFromQuaternion: (euler: Euler, q: Quaternion) => void;
let setSyncQuaternion: (euler: Euler, q: Quaternion) => void;

/**
 * Internal: links a node's `rotation` and `quaternion` so each change to one
 * updates the other, as three.js does with change callbacks. A rotation change
 * sets the quaternion at once; a quaternion change marks the angles to be
 * extracted, in their current order, the next time any angle or order is read
 * or written. The result equals an immediate `setFromQuaternion` that does not
 * run the change callback, as three.js syncs with `update = false`.
 * `setOnChangeCallback` and `Quaternion.onChange` each cut their side.
 */
export function linkEulerAndQuaternion(euler: Euler, q: Quaternion): void {
  setSyncQuaternion(euler, q);
  linkQuaternionToEuler(q, euler, syncFromQuaternion);
}

/** Euler angles with configurable rotation order. */
export class Euler {
  #x = 0;
  #y = 0;
  #z = 0;
  #order: EulerOrder = "XYZ";
  #onChangeCallback: (() => void) | undefined = undefined;
  // Quaternion whose rotation these angles still have to be extracted from;
  // see linkEulerAndQuaternion.
  #pending: Quaternion | undefined = undefined;
  // Owning node's quaternion, kept in sync instead of a callback, and the
  // guard that stops that sync from echoing back.
  #syncQuaternion: Quaternion | undefined = undefined;
  #syncing = false;

  static {
    // The quaternion side of the link: skipped while `euler` itself is
    // writing `q`.
    syncFromQuaternion = (euler: Euler, q: Quaternion): void => {
      if (!euler.#syncing) euler.#pending = q;
    };
    setSyncQuaternion = (euler: Euler, q: Quaternion): void => {
      euler.#syncQuaternion = q;
    };
  }

  #resolve(): void {
    const q = this.#pending;
    this.#pending = undefined;
    if (q === undefined) return;
    this.#extract(rotationElementsFromQuaternion(q), this.#order);
  }

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
    if (this.#pending !== undefined) this.#resolve();
    return this.#x;
  }

  /** Replaces the Cartesian x component. */
  set x(value: number) {
    if (this.#pending !== undefined) this.#resolve();
    this.#x = value;
    this.#onChange();
  }

  /** Vertical Cartesian component. */
  get y(): number {
    if (this.#pending !== undefined) this.#resolve();
    return this.#y;
  }

  /** Replaces the Cartesian y component. */
  set y(value: number) {
    if (this.#pending !== undefined) this.#resolve();
    this.#y = value;
    this.#onChange();
  }

  /** Cartesian z component. */
  get z(): number {
    if (this.#pending !== undefined) this.#resolve();
    return this.#z;
  }

  /** Replaces the Cartesian z component. */
  set z(value: number) {
    if (this.#pending !== undefined) this.#resolve();
    this.#z = value;
    this.#onChange();
  }

  /** Euler rotation order applied to the x, y, and z angles. */
  get order(): EulerOrder {
    return this.#order;
  }

  /** Replaces the Euler rotation order and invokes the change callback. */
  set order(value: EulerOrder) {
    if (this.#pending !== undefined) this.#resolve();
    this.#order = value;
    this.#onChange();
  }

  #onChange(): void {
    const q = this.#syncQuaternion;
    if (q !== undefined) {
      if (this.#syncing) return;
      this.#syncing = true;
      q.setFromEuler(this);
      this.#syncing = false;
    } else if (this.#onChangeCallback) this.#onChangeCallback();
  }

  /** Returns a new instance with the same component values. */
  clone(): Euler {
    return new Euler(this.x, this.y, this.z, this.order);
  }

  /**
   * Copies component values from the supplied instance into this one. As in
   * three.js r186, the change callback runs once.
   */
  copy(euler: Euler): this {
    // Reading through the getters resolves a pending sync on `euler`, which
    // may be this instance.
    const x = euler.x;
    const y = euler.y;
    const z = euler.z;
    this.#pending = undefined;
    this.#x = x;
    this.#y = y;
    this.#z = z;
    this.#order = euler.order;
    this.#onChange();
    return this;
  }

  /**
   * Reads x, y, z, and an optional order from `array`. As in three.js r186,
   * the change callback runs once.
   */
  fromArray(array: [number, number, number, EulerOrder?]): this {
    this.#pending = undefined;
    this.#x = array[0];
    this.#y = array[1];
    this.#z = array[2];
    this.#order = array[3] ?? this.#order;
    this.#onChange();
    return this;
  }

  /** Re-expresses this euler in a different rotation order, preserving orientation. */
  reorder(newOrder: EulerOrder): this {
    const q = new Quaternion().setFromEuler(this);
    return this.setFromQuaternion(q, newOrder);
  }

  /**
   * Replaces all angles and optionally the rotation order. As in three.js
   * r186, the change callback runs once.
   */
  set(x: number, y: number, z: number, order?: EulerOrder): this {
    this.#pending = undefined;
    this.#x = x;
    this.#y = y;
    this.#z = z;
    if (order !== undefined) this.#order = order;
    this.#onChange();
    return this;
  }

  /** Replaces these Euler angles from a quaternion. */
  setFromQuaternion(q: Quaternion, order?: EulerOrder): this {
    rotationElementsFromQuaternion(q);
    return this.setFromRotationMatrix(_rotation, order);
  }

  /**
   * Replaces these Euler angles from a rotation matrix. As in three.js r186,
   * the angles and order are written together and the change callback runs
   * once.
   */
  setFromRotationMatrix(
    m: Matrix4 | { elements: number[] },
    order?: EulerOrder,
  ): this {
    const currentOrder = order ?? this.#order;
    this.#pending = undefined;
    this.#extract(m.elements, currentOrder);
    this.#order = currentOrder;
    this.#onChange();
    return this;
  }

  #extract(te: ArrayLike<number>, order: EulerOrder): void {
    const m11 = te[0] ?? 0;
    const m12 = te[4] ?? 0;
    const m13 = te[8] ?? 0;
    const m21 = te[1] ?? 0;
    const m22 = te[5] ?? 0;
    const m23 = te[9] ?? 0;
    const m31 = te[2] ?? 0;
    const m32 = te[6] ?? 0;
    const m33 = te[10] ?? 0;
    switch (order) {
      case "XYZ":
        this.#y = safeAsin(m13);
        if (Math.abs(m13) < GIMBAL_LOCK_THRESHOLD) {
          this.#x = Math.atan2(-m23, m33);
          this.#z = Math.atan2(-m12, m11);
        } else {
          this.#x = Math.atan2(m32, m22);
          this.#z = 0;
        }
        break;
      case "YXZ":
        this.#x = safeAsin(-m23);
        if (Math.abs(m23) < GIMBAL_LOCK_THRESHOLD) {
          this.#y = Math.atan2(m13, m33);
          this.#z = Math.atan2(m21, m22);
        } else {
          this.#y = Math.atan2(-m31, m11);
          this.#z = 0;
        }
        break;
      case "ZXY":
        this.#x = safeAsin(m32);
        if (Math.abs(m32) < GIMBAL_LOCK_THRESHOLD) {
          this.#y = Math.atan2(-m31, m33);
          this.#z = Math.atan2(-m12, m22);
        } else {
          this.#y = 0;
          this.#z = Math.atan2(m21, m11);
        }
        break;
      case "ZYX":
        this.#y = safeAsin(-m31);
        if (Math.abs(m31) < GIMBAL_LOCK_THRESHOLD) {
          this.#x = Math.atan2(m32, m33);
          this.#z = Math.atan2(m21, m11);
        } else {
          this.#x = 0;
          this.#z = Math.atan2(-m12, m22);
        }
        break;
      case "YZX":
        this.#z = safeAsin(m21);
        if (Math.abs(m21) < GIMBAL_LOCK_THRESHOLD) {
          this.#x = Math.atan2(-m23, m22);
          this.#y = Math.atan2(-m31, m11);
        } else {
          this.#x = 0;
          this.#y = Math.atan2(m13, m33);
        }
        break;
      case "XZY":
        this.#z = safeAsin(-m12);
        if (Math.abs(m12) < GIMBAL_LOCK_THRESHOLD) {
          this.#x = Math.atan2(m32, m22);
          this.#y = Math.atan2(m13, m11);
        } else {
          this.#x = Math.atan2(-m23, m33);
          this.#y = 0;
        }
        break;
    }
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
    this.#syncQuaternion = undefined;
    this.#onChangeCallback = callback;
    return this;
  }
}
