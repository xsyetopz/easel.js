/** Column-major 2x2 matrix with row-major constructor and setter arguments. */
export class Matrix2 {
  #elements: Float32Array<ArrayBufferLike> = new Float32Array([1, 0, 0, 1]);

  /** Constructs a 2×2 matrix with column-major storage. */
  constructor();
  /** Constructs a 2×2 matrix with column-major storage. */
  constructor(n11: number, n12: number, n21: number, n22: number);
  /** Constructs a 2×2 matrix with column-major storage. */
  constructor(n11?: number, n12?: number, n21?: number, n22?: number) {
    const supplied =
      Number(n11 !== undefined) +
      Number(n12 !== undefined) +
      Number(n21 !== undefined) +
      Number(n22 !== undefined);
    if (supplied === 0) return;
    if (supplied !== 4) {
      throw new TypeError(
        "Matrix2 requires either zero constructor values or all four values.",
      );
    }
    this.set(n11!, n12!, n21!, n22!);
  }

  /** Column-major matrix storage exposed for direct numeric access. */
  get elements(): Float32Array {
    return this.#elements;
  }

  /** Replaces all elements with the 2×2 identity matrix. */
  identity(): this {
    return this.set(1, 0, 0, 1);
  }

  /** Reads four column-major values from `values` starting at `offset`. */
  fromArray(array: ArrayLike<number>, offset: number = 0): this {
    if (offset < 0 || offset + 4 > array.length) {
      throw new RangeError(
        "Matrix2.fromArray() requires four available values.",
      );
    }
    const elements = this.#elements;
    for (let index = 0; index < 4; index++) {
      elements[index] = array[index + offset];
    }
    return this;
  }

  /** Writes row-major arguments into column-major storage. */
  set(n11: number, n12: number, n21: number, n22: number): this {
    const elements = this.#elements;
    elements[0] = n11;
    elements[2] = n12;
    elements[1] = n21;
    elements[3] = n22;
    return this;
  }
}
