import type { EulerOrder } from "./Euler.ts";

type Axis = "x" | "y" | "z";

type MatrixLike = {
  m11: number;
  m12: number;
  m13: number;
  m21: number;
  m22: number;
  m23: number;
  m31: number;
  m32: number;
  m33: number;
};

interface AxisFn {
  axis: Axis;
  n: (m: MatrixLike) => number;
  d: (m: MatrixLike) => number;
}

interface RotationOrderConfig {
  primary: Axis;
  asinVal: (m: MatrixLike) => number;
  lockVal: (m: MatrixLike) => number;
  locked: { a: AxisFn; b: AxisFn };
  unlocked: { a: AxisFn; b: AxisFn };
}

export type { Axis, MatrixLike, RotationOrderConfig };

/** Absolute sine threshold at which Euler extraction uses gimbal-lock handling. */
export const GIMBAL_LOCK_THRESHOLD = 0.9999999;

/** Matrix-element extraction rules for each supported Euler rotation order. */
export const ROTATION_ORDER_CONFIG: Record<EulerOrder, RotationOrderConfig> = {
  XYZ: {
    primary: "y",
    asinVal: (m: MatrixLike): number => m.m13,
    lockVal: (m: MatrixLike): number => m.m13,
    locked: {
      a: {
        axis: "x",
        n: (m: MatrixLike): number => m.m32,
        d: (m: MatrixLike): number => m.m22,
      },
      b: {
        axis: "z",
        n: (m: MatrixLike): number => -m.m12,
        d: (m: MatrixLike): number => m.m11,
      },
    },
    unlocked: {
      a: {
        axis: "x",
        n: (m: MatrixLike): number => -m.m23,
        d: (m: MatrixLike): number => m.m33,
      },
      b: {
        axis: "z",
        n: (m: MatrixLike): number => -m.m12,
        d: (m: MatrixLike): number => m.m11,
      },
    },
  },
  YXZ: {
    primary: "x",
    asinVal: (m: MatrixLike): number => -m.m23,
    lockVal: (m: MatrixLike): number => m.m23,
    locked: {
      a: {
        axis: "y",
        n: (m: MatrixLike): number => -m.m31,
        d: (m: MatrixLike): number => m.m11,
      },
      b: {
        axis: "z",
        n: (m: MatrixLike): number => m.m21,
        d: (m: MatrixLike): number => m.m22,
      },
    },
    unlocked: {
      a: {
        axis: "y",
        n: (m: MatrixLike): number => m.m13,
        d: (m: MatrixLike): number => m.m33,
      },
      b: {
        axis: "z",
        n: (m: MatrixLike): number => m.m21,
        d: (m: MatrixLike): number => m.m22,
      },
    },
  },
  ZXY: {
    primary: "x",
    asinVal: (m: MatrixLike): number => m.m32,
    lockVal: (m: MatrixLike): number => m.m32,
    locked: {
      a: {
        axis: "z",
        n: (m: MatrixLike): number => m.m21,
        d: (m: MatrixLike): number => m.m11,
      },
      b: {
        axis: "y",
        n: (m: MatrixLike): number => -m.m31,
        d: (m: MatrixLike): number => m.m33,
      },
    },
    unlocked: {
      a: {
        axis: "y",
        n: (m: MatrixLike): number => -m.m31,
        d: (m: MatrixLike): number => m.m33,
      },
      b: {
        axis: "z",
        n: (m: MatrixLike): number => -m.m12,
        d: (m: MatrixLike): number => m.m22,
      },
    },
  },
  ZYX: {
    primary: "y",
    asinVal: (m: MatrixLike): number => -m.m31,
    lockVal: (m: MatrixLike): number => m.m31,
    locked: {
      a: {
        axis: "z",
        n: (m: MatrixLike): number => -m.m12,
        d: (m: MatrixLike): number => m.m22,
      },
      b: {
        axis: "x",
        n: (m: MatrixLike): number => m.m32,
        d: (m: MatrixLike): number => m.m33,
      },
    },
    unlocked: {
      a: {
        axis: "x",
        n: (m: MatrixLike): number => m.m32,
        d: (m: MatrixLike): number => m.m33,
      },
      b: {
        axis: "z",
        n: (m: MatrixLike): number => m.m21,
        d: (m: MatrixLike): number => m.m11,
      },
    },
  },
  YZX: {
    primary: "z",
    asinVal: (m: MatrixLike): number => m.m21,
    lockVal: (m: MatrixLike): number => m.m21,
    locked: {
      a: {
        axis: "y",
        n: (m: MatrixLike): number => m.m13,
        d: (m: MatrixLike): number => m.m33,
      },
      b: {
        axis: "x",
        n: (m: MatrixLike): number => -m.m23,
        d: (m: MatrixLike): number => m.m22,
      },
    },
    unlocked: {
      a: {
        axis: "x",
        n: (m: MatrixLike): number => -m.m23,
        d: (m: MatrixLike): number => m.m22,
      },
      b: {
        axis: "y",
        n: (m: MatrixLike): number => -m.m31,
        d: (m: MatrixLike): number => m.m11,
      },
    },
  },
  XZY: {
    primary: "z",
    asinVal: (m: MatrixLike): number => -m.m12,
    lockVal: (m: MatrixLike): number => m.m12,
    locked: {
      a: {
        axis: "x",
        n: (m: MatrixLike): number => m.m32,
        d: (m: MatrixLike): number => m.m22,
      },
      b: {
        axis: "y",
        n: (m: MatrixLike): number => m.m13,
        d: (m: MatrixLike): number => m.m11,
      },
    },
    unlocked: {
      a: {
        axis: "x",
        n: (m: MatrixLike): number => m.m32,
        d: (m: MatrixLike): number => m.m22,
      },
      b: {
        axis: "y",
        n: (m: MatrixLike): number => m.m13,
        d: (m: MatrixLike): number => m.m11,
      },
    },
  },
};
