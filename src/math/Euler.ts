import { MathUtils } from "./MathUtils.ts";
import { Matrix4 } from "./Matrix4.ts";
import { Quaternion } from "./Quaternion.ts";

export type EulerOrder = "XYZ" | "YXZ" | "ZXY" | "ZYX" | "YZX" | "XZY";

type Axis = "x" | "y" | "z";

interface AxisFn {
  axis: Axis;
  n: (m: Record<string, number>) => number;
  d: (m: Record<string, number>) => number;
}

interface RotationOrderConfig {
  primary: Axis;
  asinVal: (m: Record<string, number>) => number;
  lockVal: (m: Record<string, number>) => number;
  locked: { a: AxisFn; b: AxisFn };
  unlocked: { a: AxisFn; b: AxisFn };
}

const _m = new Matrix4();

/** Euler angles with configurable rotation order. */
export class Euler {
  static #GIMBAL_LOCK_THRESHOLD = 0.9999999;

  #x = 0;
  #y = 0;
  #z = 0;
  #order: EulerOrder = "XYZ";
  #onChangeCallback: (() => void) | undefined = undefined;

  constructor(x = 0, y = 0, z = 0, order: EulerOrder = "XYZ") {
    this.#x = x;
    this.#y = y;
    this.#z = z;
    this.#order = order;
  }

  get x(): number {
    return this.#x;
  }

  set x(value: number) {
    this.#x = value;
    this.#onChange();
  }

  get y(): number {
    return this.#y;
  }

  set y(value: number) {
    this.#y = value;
    this.#onChange();
  }

  get z(): number {
    return this.#z;
  }

  set z(value: number) {
    this.#z = value;
    this.#onChange();
  }

  get order(): EulerOrder {
    return this.#order;
  }

  set order(value: EulerOrder) {
    this.#order = value;
    this.#onChange();
  }

  #onChange(): void {
    if (this.#onChangeCallback) this.#onChangeCallback();
  }

  clone(): Euler {
    return new Euler(this.x, this.y, this.z, this.order);
  }

  copy(euler: Euler): this {
    this.x = euler.x;
    this.y = euler.y;
    this.z = euler.z;
    this.order = euler.order;
    this.#onChange();
    return this;
  }

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

  set(x: number, y: number, z: number, order?: EulerOrder): this {
    this.x = x;
    this.y = y;
    this.z = z;
    if (order !== undefined) this.order = order;
    this.#onChange();
    return this;
  }

  setFromQuaternion(q: Quaternion, order?: EulerOrder): this {
    _m.makeRotationFromQuaternion(q);
    return this.setFromRotationMatrix(_m, order);
  }

  setFromRotationMatrix(
    m: Matrix4 | { elements: number[] },
    order?: EulerOrder,
  ): this {
    const te = m.elements;
    const m11 = te[0];
    const m12 = te[4];
    const m13 = te[8];
    const m21 = te[1];
    const m22 = te[5];
    const m23 = te[9];
    const m31 = te[2];
    const m32 = te[6];
    const m33 = te[10];
    const currentOrder = order || this.order;
    this.#applyRotationOrder(
      currentOrder,
      m11,
      m12,
      m13,
      m21,
      m22,
      m23,
      m31,
      m32,
      m33,
    );
    this.order = currentOrder;
    this.#onChange();
    return this;
  }

  #applyRotationOrder(
    ord: EulerOrder,
    m11: number,
    m12: number,
    m13: number,
    m21: number,
    m22: number,
    m23: number,
    m31: number,
    m32: number,
    m33: number,
  ): void {
    const m = { m11, m12, m13, m21, m22, m23, m31, m32, m33 };
    const cfg = Euler.#ROTATION_ORDER_CONFIG[ord];
    if (cfg === undefined) return;
    this.#applyOrderConfig(cfg, m);
  }

  #applyOrderConfig(cfg: RotationOrderConfig, m: Record<string, number>): void {
    const { primary, asinVal, lockVal, locked, unlocked } = cfg;
    const asin = asinVal(m);
    this.#setAxis(primary, MathUtils.safeAsin(asin));
    if (Math.abs(lockVal(m)) >= Euler.#GIMBAL_LOCK_THRESHOLD) {
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

  static #ROTATION_ORDER_CONFIG: Record<EulerOrder, RotationOrderConfig> = {
    XYZ: {
      primary: "y",
      asinVal: (m) => m["m13"],
      lockVal: (m) => m["m13"],
      locked: {
        a: { axis: "x", n: (m) => m["m32"], d: (m) => m["m22"] },
        b: { axis: "z", n: (m) => -m["m12"], d: (m) => m["m11"] },
      },
      unlocked: {
        a: { axis: "x", n: (m) => -m["m23"], d: (m) => m["m33"] },
        b: { axis: "z", n: (m) => -m["m12"], d: (m) => m["m11"] },
      },
    },
    YXZ: {
      primary: "x",
      asinVal: (m) => -m["m23"],
      lockVal: (m) => m["m23"],
      locked: {
        a: { axis: "y", n: (m) => -m["m31"], d: (m) => m["m11"] },
        b: { axis: "z", n: (m) => m["m21"], d: (m) => m["m22"] },
      },
      unlocked: {
        a: { axis: "y", n: (m) => m["m13"], d: (m) => m["m33"] },
        b: { axis: "z", n: (m) => m["m21"], d: (m) => m["m22"] },
      },
    },
    ZXY: {
      primary: "x",
      asinVal: (m) => m["m32"],
      lockVal: (m) => m["m32"],
      locked: {
        a: { axis: "z", n: (m) => m["m21"], d: (m) => m["m11"] },
        b: { axis: "y", n: (m) => -m["m31"], d: (m) => m["m33"] },
      },
      unlocked: {
        a: { axis: "y", n: (m) => -m["m31"], d: (m) => m["m33"] },
        b: { axis: "z", n: (m) => -m["m12"], d: (m) => m["m22"] },
      },
    },
    ZYX: {
      primary: "y",
      asinVal: (m) => -m["m31"],
      lockVal: (m) => m["m31"],
      locked: {
        a: { axis: "z", n: (m) => -m["m12"], d: (m) => m["m22"] },
        b: { axis: "x", n: (m) => m["m32"], d: (m) => m["m33"] },
      },
      unlocked: {
        a: { axis: "x", n: (m) => m["m32"], d: (m) => m["m33"] },
        b: { axis: "z", n: (m) => m["m21"], d: (m) => m["m11"] },
      },
    },
    YZX: {
      primary: "z",
      asinVal: (m) => m["m21"],
      lockVal: (m) => m["m21"],
      locked: {
        a: { axis: "y", n: (m) => m["m13"], d: (m) => m["m33"] },
        b: { axis: "x", n: (m) => -m["m23"], d: (m) => m["m22"] },
      },
      unlocked: {
        a: { axis: "x", n: (m) => -m["m23"], d: (m) => m["m22"] },
        b: { axis: "y", n: (m) => -m["m31"], d: (m) => m["m11"] },
      },
    },
    XZY: {
      primary: "z",
      asinVal: (m) => -m["m12"],
      lockVal: (m) => m["m12"],
      locked: {
        a: { axis: "x", n: (m) => m["m32"], d: (m) => m["m22"] },
        b: { axis: "y", n: (m) => m["m13"], d: (m) => m["m11"] },
      },
      unlocked: {
        a: { axis: "x", n: (m) => m["m32"], d: (m) => m["m22"] },
        b: { axis: "y", n: (m) => m["m13"], d: (m) => m["m11"] },
      },
    },
  };

  /** Registers a callback invoked whenever x, y, z, or order changes. */
  setOnChangeCallback(callback: () => void): this {
    this.#onChangeCallback = callback;
    return this;
  }
}
