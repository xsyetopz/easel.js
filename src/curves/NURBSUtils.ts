import { Vector3 } from "../math/Vector3.ts";
import { Vector4 } from "../math/Vector4.ts";

/** Finds the knot-vector span containing a parameter value. */
export function findSpan(degree: number, u: number, knots: number[]): number {
  const n = knots.length - degree - 1;
  if (n <= degree) return degree;
  if (u >= knots[n]) return n - 1;
  if (u <= knots[degree]) return degree;

  let low = degree;
  let high = n;
  let mid = Math.floor((low + high) / 2);
  while (u < knots[mid] || u >= knots[mid + 1]) {
    if (u < knots[mid]) high = mid;
    else low = mid;
    mid = Math.floor((low + high) / 2);
  }
  return mid;
}

/** Evaluates the non-rational B-spline basis functions for a span. */
export function calcBasisFunctions(
  span: number,
  u: number,
  degree: number,
  knots: number[],
): number[] {
  const basis = [1];
  const left: number[] = [];
  const right: number[] = [];
  for (let j = 1; j <= degree; j++) {
    left[j] = u - knots[span + 1 - j];
    right[j] = knots[span + j] - u;
    let saved = 0;
    for (let r = 0; r < j; r++) {
      const denominator = right[r + 1] + left[j - r];
      const value = denominator === 0 ? 0 : basis[r] / denominator;
      basis[r] = saved + right[r + 1] * value;
      saved = left[j - r] * value;
    }
    basis[j] = saved;
  }
  return basis;
}

/** Evaluates a rational B-spline curve in homogeneous coordinates. */
export function calcBSplinePoint(
  degree: number,
  knots: number[],
  controlPoints: Vector4[],
  u: number,
): Vector4 {
  const span = findSpan(degree, u, knots);
  const basis = calcBasisFunctions(span, u, degree, knots);
  const point = new Vector4(0, 0, 0, 0);
  for (let j = 0; j <= degree; j++) {
    const controlPoint = controlPoints[span - degree + j];
    if (!controlPoint) continue;
    const weightedBasis = controlPoint.w * basis[j];
    point.x += controlPoint.x * weightedBasis;
    point.y += controlPoint.y * weightedBasis;
    point.z += controlPoint.z * weightedBasis;
    point.w += weightedBasis;
  }
  return point;
}

/** Evaluates derivatives of non-rational B-spline basis functions. */
export function calcBasisFunctionDerivatives(
  span: number,
  u: number,
  degree: number,
  derivativeCount: number,
  knots: number[],
): number[][] {
  const zero = (): number[] => new Array<number>(degree + 1).fill(0);
  const derivatives = Array.from({ length: derivativeCount + 1 }, zero);
  const ndu = Array.from({ length: degree + 1 }, zero);
  ndu[0][0] = 1;
  const left = zero();
  const right = zero();

  for (let j = 1; j <= degree; j++) {
    left[j] = u - knots[span + 1 - j];
    right[j] = knots[span + j] - u;
    let saved = 0;
    for (let r = 0; r < j; r++) {
      ndu[j][r] = right[r + 1] + left[j - r];
      const denominator = ndu[j][r];
      const value = denominator === 0 ? 0 : ndu[r][j - 1] / denominator;
      ndu[r][j] = saved + right[r + 1] * value;
      saved = left[j - r] * value;
    }
    ndu[j][j] = saved;
  }

  for (let j = 0; j <= degree; j++) derivatives[0][j] = ndu[j][degree];
  for (let r = 0; r <= degree; r++) {
    let s1 = 0;
    let s2 = 1;
    const a = Array.from({ length: 2 }, zero);
    a[0][0] = 1;
    for (let k = 1; k <= derivativeCount; k++) {
      let value = 0;
      const rk = r - k;
      const pk = degree - k;
      if (r >= k) {
        const denominator = ndu[pk + 1][rk];
        a[s2][0] = denominator === 0 ? 0 : a[s1][0] / denominator;
        value = a[s2][0] * ndu[rk][pk];
      }
      const j1 = rk >= -1 ? 1 : -rk;
      const j2 = r - 1 <= pk ? k - 1 : degree - r;
      for (let j = j1; j <= j2; j++) {
        const denominator = ndu[pk + 1][rk + j];
        a[s2][j] =
          denominator === 0 ? 0 : (a[s1][j] - a[s1][j - 1]) / denominator;
        value += a[s2][j] * ndu[rk + j][pk];
      }
      if (r <= pk) {
        const denominator = ndu[pk + 1][r];
        a[s2][k] = denominator === 0 ? 0 : -a[s1][k - 1] / denominator;
        value += a[s2][k] * ndu[r][pk];
      }
      derivatives[k][r] = value;
      const swap = s1;
      s1 = s2;
      s2 = swap;
    }
  }

  let factor = degree;
  for (let k = 1; k <= derivativeCount; k++) {
    for (let j = 0; j <= degree; j++) derivatives[k][j] *= factor;
    factor *= degree - k;
  }
  return derivatives;
}

/** Evaluates derivatives of a B-spline in homogeneous coordinates. */
export function calcBSplineDerivatives(
  degree: number,
  knots: number[],
  controlPoints: Vector4[],
  u: number,
  derivativeCount: number,
): Vector4[] {
  const count = Math.min(derivativeCount, degree);
  const span = findSpan(degree, u, knots);
  const basisDerivatives = calcBasisFunctionDerivatives(
    span,
    u,
    degree,
    count,
    knots,
  );
  const weightedPoints = controlPoints.map(
    (point) =>
      new Vector4(
        point.x * point.w,
        point.y * point.w,
        point.z * point.w,
        point.w,
      ),
  );
  const derivatives: Vector4[] = [];
  for (let k = 0; k <= count; k++) {
    const point = new Vector4(0, 0, 0, 0);
    for (let j = 0; j <= degree; j++) {
      const weightedPoint = weightedPoints[span - degree + j];
      if (weightedPoint)
        point.addScaledVector(weightedPoint, basisDerivatives[k][j]);
    }
    derivatives[k] = point;
  }
  for (let k = count + 1; k <= derivativeCount + 1; k++) {
    derivatives[k] = new Vector4(0, 0, 0, 0);
  }
  return derivatives;
}

/** Computes k choose i without relying on factorial overflow. */
export function calcKoverI(k: number, i: number): number {
  if (i < 0 || i > k) return 0;
  let value = 1;
  for (let j = 1; j <= i; j++) value *= (k - i + j) / j;
  return value;
}

/** Converts homogeneous B-spline derivatives to rational curve derivatives. */
export function calcRationalCurveDerivatives(Pders: Vector4[]): Vector3[] {
  const derivatives: Vector3[] = [];
  const weights = Pders.map((point) => point.w);
  for (let k = 0; k < Pders.length; k++) {
    const value = new Vector3(Pders[k].x, Pders[k].y, Pders[k].z);
    for (let i = 1; i <= k; i++) {
      const previous = derivatives[k - i];
      if (previous) {
        value.sub(
          new Vector3(previous.x, previous.y, previous.z).multiplyScalar(
            calcKoverI(k, i) * weights[i],
          ),
        );
      }
    }
    const denominator = weights[0];
    derivatives[k] =
      denominator === 0 ? value.set(0, 0, 0) : value.divideScalar(denominator);
  }
  return derivatives;
}

/** Computes derivatives of a rational B-spline curve. */
export function calcNURBSDerivatives(
  degree: number,
  knots: number[],
  controlPoints: Vector4[],
  u: number,
  derivativeCount: number,
): Vector3[] {
  return calcRationalCurveDerivatives(
    calcBSplineDerivatives(degree, knots, controlPoints, u, derivativeCount),
  );
}

/** Evaluates a rational B-spline surface at a parameter pair. */
export function calcSurfacePoint(
  degree1: number,
  degree2: number,
  knots1: number[],
  knots2: number[],
  controlPoints: Vector4[][],
  u: number,
  v: number,
  target: Vector3,
): Vector3 {
  const span1 = findSpan(degree1, u, knots1);
  const span2 = findSpan(degree2, v, knots2);
  const basis1 = calcBasisFunctions(span1, u, degree1, knots1);
  const basis2 = calcBasisFunctions(span2, v, degree2, knots2);
  const temp: Vector4[] = [];
  for (let l = 0; l <= degree2; l++) {
    const value = new Vector4(0, 0, 0, 0);
    for (let k = 0; k <= degree1; k++) {
      const point = controlPoints[span1 - degree1 + k]?.[span2 - degree2 + l];
      if (!point) continue;
      value.add(
        new Vector4(
          point.x * point.w,
          point.y * point.w,
          point.z * point.w,
          point.w,
        ).multiplyScalar(basis1[k]),
      );
    }
    temp[l] = value;
  }
  const value = new Vector4(0, 0, 0, 0);
  for (let l = 0; l <= degree2; l++)
    value.add(temp[l].multiplyScalar(basis2[l]));
  if (value.w !== 0) value.divideScalar(value.w);
  target.set(value.x, value.y, value.z);
  return target;
}

/** Evaluates a rational B-spline volume at a parameter triple. */
export function calcVolumePoint(
  degree1: number,
  degree2: number,
  degree3: number,
  knots1: number[],
  knots2: number[],
  knots3: number[],
  controlPoints: Vector4[][][],
  u: number,
  v: number,
  w: number,
  target: Vector3,
): Vector3 {
  const span1 = findSpan(degree1, u, knots1);
  const span2 = findSpan(degree2, v, knots2);
  const span3 = findSpan(degree3, w, knots3);
  const basis1 = calcBasisFunctions(span1, u, degree1, knots1);
  const basis2 = calcBasisFunctions(span2, v, degree2, knots2);
  const basis3 = calcBasisFunctions(span3, w, degree3, knots3);
  const value = new Vector4(0, 0, 0, 0);
  for (let m = 0; m <= degree3; m++) {
    for (let l = 0; l <= degree2; l++) {
      for (let k = 0; k <= degree1; k++) {
        const point =
          controlPoints[span1 - degree1 + k]?.[span2 - degree2 + l]?.[
            span3 - degree3 + m
          ];
        if (!point) continue;
        value.add(
          new Vector4(
            point.x * point.w,
            point.y * point.w,
            point.z * point.w,
            point.w,
          ).multiplyScalar(basis1[k] * basis2[l] * basis3[m]),
        );
      }
    }
  }
  if (value.w !== 0) value.divideScalar(value.w);
  target.set(value.x, value.y, value.z);
  return target;
}
