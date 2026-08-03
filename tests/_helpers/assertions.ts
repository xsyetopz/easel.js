import { expect } from "bun:test";

function matrixValues(
  value: { elements?: ArrayLike<number> } | ArrayLike<number>,
): ArrayLike<number> {
  if ("elements" in value && value.elements) return value.elements;
  return value as ArrayLike<number>;
}

expect.extend({
  toMatchVector(
    received: unknown,
    expected: Record<string, number>,
    epsilon = 1e-6,
  ) {
    const actual = received as Record<string, number>;
    const keys = ["x", "y", "z", "w"];
    const mismatches: string[] = [];
    for (const k of keys) {
      if (k in expected) {
        const r = actual[k] ?? 0;
        const e = expected[k] ?? 0;
        if (Math.abs(r - e) >= epsilon) {
          mismatches.push(`${k}: ${r} vs ${e}`);
        }
      }
    }
    return {
      pass: mismatches.length === 0,
      message: () => `Vector mismatch: ${mismatches.join(", ")}`,
    };
  },
  toMatchMatrix(
    received: unknown,
    expected: { elements?: ArrayLike<number> } | ArrayLike<number>,
    epsilon = 1e-6,
  ) {
    const re = matrixValues(
      received as { elements?: ArrayLike<number> } | ArrayLike<number>,
    );
    const te = matrixValues(expected);
    const mismatches: string[] = [];
    for (let i = 0; i < re.length; i++) {
      if (Math.abs(re[i] - te[i]) >= epsilon) {
        mismatches.push(`[${i}]: ${re[i]} vs ${te[i]}`);
      }
    }
    return {
      pass: mismatches.length === 0,
      message: () => `Matrix mismatch: ${mismatches.join(", ")}`,
    };
  },
});
