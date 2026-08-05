import { Vector3 } from "./Vector3.ts";

/** Nine RGB coefficients used by third-order spherical harmonics. */
export type SphericalHarmonicsCoefficients = readonly [
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
  Vector3,
];

/** Writable numeric storage accepted by spherical-harmonics basis evaluation. */
export type SphericalHarmonicsBasis = number[] | Float32Array | Float64Array;

/** Writes the nine third-order spherical-harmonics basis values for a unit normal. */
export function sphericalHarmonicsBasis(
  normal: Readonly<Vector3>,
  target: SphericalHarmonicsBasis,
): SphericalHarmonicsBasis {
  const { x, y, z } = normal;
  target[0] = 0.282095;
  target[1] = 0.488603 * y;
  target[2] = 0.488603 * z;
  target[3] = 0.488603 * x;
  target[4] = 1.092548 * x * y;
  target[5] = 1.092548 * y * z;
  target[6] = 0.315392 * (3 * z * z - 1);
  target[7] = 1.092548 * x * z;
  target[8] = 0.546274 * (x * x - y * y);
  return target;
}

/** Fixed-size third-order RGB spherical harmonics. */
export class SphericalHarmonics3 {
  readonly #coefficients: [
    Vector3,
    Vector3,
    Vector3,
    Vector3,
    Vector3,
    Vector3,
    Vector3,
    Vector3,
    Vector3,
  ] = [
    new Vector3(),
    new Vector3(),
    new Vector3(),
    new Vector3(),
    new Vector3(),
    new Vector3(),
    new Vector3(),
    new Vector3(),
    new Vector3(),
  ];

  /** Constructs nine zero-valued RGB coefficient vectors. */
  constructor() {}

  /** Type marker identifying SphericalHarmonics3 instances. */
  get isSphericalHarmonics3(): true {
    return true;
  }

  /** Nine RGB coefficient vectors in band order; the array and vectors are live. */
  get coefficients(): SphericalHarmonicsCoefficients {
    return this.#coefficients;
  }

  /** Copies all nine coefficient vectors from `source` without replacing storage. */
  set coefficients(value: SphericalHarmonicsCoefficients) {
    for (let index = 0; index < 9; index++) {
      this.#coefficients[index].copy(value[index]);
    }
  }

  /** Sets every coefficient vector to zero without replacing storage. */
  zero(): this {
    for (let index = 0; index < 9; index++) {
      this.#coefficients[index].set(0, 0, 0);
    }
    return this;
  }

  /** Evaluates the RGB radiance represented by this basis at unit `normal`. */
  radianceAt(normal: Readonly<Vector3>, target: Vector3): Vector3 {
    sphericalHarmonicsBasis(normal, _basis);
    return this.#evaluate(_basis, target);
  }

  /** Evaluates cosine-convolved RGB irradiance at unit `normal`. */
  irradianceAt(normal: Readonly<Vector3>, target: Vector3): Vector3 {
    const { x, y, z } = normal;
    _basis[0] = 0.886227;
    _basis[1] = 1.023328 * y;
    _basis[2] = 1.023328 * z;
    _basis[3] = 1.023328 * x;
    _basis[4] = 0.858086 * x * y;
    _basis[5] = 0.858086 * y * z;
    _basis[6] = 0.743125 * z * z - 0.247708;
    _basis[7] = 0.858086 * x * z;
    _basis[8] = 0.429043 * (x * x - y * y);
    return this.#evaluate(_basis, target);
  }

  /** Adds `source` coefficient vectors in place. */
  add(value: SphericalHarmonics3): this {
    for (let index = 0; index < 9; index++) {
      this.#coefficients[index].add(value.#coefficients[index]);
    }
    return this;
  }

  /** Adds `source` scaled by `scale` in place. */
  addScaled(value: SphericalHarmonics3, scalar: number): this {
    for (let index = 0; index < 9; index++) {
      this.#coefficients[index].addScaledVector(
        value.#coefficients[index],
        scalar,
      );
    }
    return this;
  }

  /** Multiplies every coefficient vector by `scale` in place. */
  scale(scalar: number): this {
    for (let index = 0; index < 9; index++) {
      this.#coefficients[index].multiplyScalar(scalar);
    }
    return this;
  }

  /** Interpolates each coefficient toward `source` by `alpha`. */
  lerp(value: SphericalHarmonics3, alpha: number): this {
    for (let index = 0; index < 9; index++) {
      this.#coefficients[index].lerp(value.#coefficients[index], alpha);
    }
    return this;
  }

  /** Returns true when all coefficient vectors exactly match `source`. */
  equals(value: SphericalHarmonics3): boolean {
    for (let index = 0; index < 9; index++) {
      if (!this.#coefficients[index].equals(value.#coefficients[index])) {
        return false;
      }
    }
    return true;
  }

  /** Copies coefficients from `source` without replacing internal vectors. */
  copy(value: SphericalHarmonics3): this {
    this.coefficients = value.#coefficients;
    return this;
  }

  /** Returns an independent coefficient set with cloned vectors. */
  clone(): SphericalHarmonics3 {
    return new SphericalHarmonics3().copy(this);
  }

  /** Reads 27 RGB components from `array` starting at `offset`. */
  fromArray(array: ArrayLike<number>, offset: number = 0): this {
    for (let index = 0; index < 9; index++) {
      this.#coefficients[index].fromArray(array, offset + index * 3);
    }
    return this;
  }

  /** Writes 27 RGB components to `array` starting at `offset`. */
  toArray(array: number[] = [], offset: number = 0): number[] {
    for (let index = 0; index < 9; index++) {
      this.#coefficients[index].toArray(array, offset + index * 3);
    }
    return array;
  }

  #evaluate(basis: ArrayLike<number>, target: Vector3): Vector3 {
    let x = 0;
    let y = 0;
    let z = 0;
    for (let index = 0; index < 9; index++) {
      const coefficient = this.#coefficients[index];
      const weight = basis[index];
      x += coefficient.x * weight;
      y += coefficient.y * weight;
      z += coefficient.z * weight;
    }
    return target.set(x, y, z);
  }
}

const _basis = new Float64Array(9);
