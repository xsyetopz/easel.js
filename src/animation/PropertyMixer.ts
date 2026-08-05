import type { Binding } from "./Binding.ts";
import type { TrackValue, TrackValueType } from "./Track.ts";

type AccumulatorIndex = 0 | 1;

/** Accumulates validated normal and additive values for one bound property. */
export class PropertyMixer {
  readonly #binding: Binding;
  readonly #itemSize: number;
  readonly #valueType: TrackValueType;
  readonly #normalValues: [TrackValue[], TrackValue[]];
  readonly #normalWeights: [number, number] = [0, 0];
  readonly #selectedWeights: [number, number] = [0, 0];
  readonly #additiveValues: number[];
  #additiveWeight = 0;
  #originalValues: TrackValue[] | undefined;

  /** Creates a mixer for a binding and a fixed number of value components. */
  constructor(
    binding: Binding,
    itemSize: number,
    valueType: TrackValueType = "number",
  ) {
    if (!Number.isSafeInteger(itemSize) || itemSize <= 0) {
      throw new RangeError(
        "PropertyMixer itemSize must be a positive safe integer.",
      );
    }
    if (valueType === "quaternion" && itemSize % 4 !== 0) {
      throw new RangeError(
        "PropertyMixer quaternion itemSize must be divisible by four.",
      );
    }
    this.#binding = binding;
    this.#itemSize = itemSize;
    this.#valueType = valueType;
    this.#normalValues = [
      new Array<TrackValue>(itemSize),
      new Array<TrackValue>(itemSize),
    ];
    this.#additiveValues = new Array<number>(itemSize).fill(0);
    this.#resetAdditiveIdentity();
  }

  /** Binding whose property receives the mixed result. */
  get binding(): Binding {
    return this.#binding;
  }

  /** Number of scalar components mixed for each keyframe value. */
  get itemSize(): number {
    return this.#itemSize;
  }

  /** Value semantics used for numeric, quaternion, or discrete mixing. */
  get valueType(): TrackValueType {
    return this.#valueType;
  }

  /** Sum of normal contribution weights in the current frame. */
  get cumulativeWeight(): number {
    return this.#normalWeights[0] + this.#normalWeights[1];
  }

  /** Sum of additive contribution weights in the current frame. */
  get cumulativeAdditiveWeight(): number {
    return this.#additiveWeight;
  }

  /** Adds a weighted normal contribution to one accumulator. */
  accumulate(
    accuIndex: AccumulatorIndex,
    weight: number,
    values: readonly TrackValue[],
  ): void {
    validateAccumulatorIndex(accuIndex);
    validateWeight(weight);
    this.#validateValues(values);
    if (weight === 0) return;
    if (this.#valueType === "quaternion") {
      this.#accumulateQuaternion(
        accuIndex,
        weight,
        values as readonly number[],
      );
    } else if (this.#valueType === "number") {
      this.#accumulateNumeric(accuIndex, weight, values as readonly number[]);
    } else {
      this.#accumulateDiscrete(accuIndex, weight, values);
    }
    this.#normalWeights[accuIndex] += weight;
  }

  /** Adds a weighted additive contribution to the current frame. */
  accumulateAdditive(weight: number, values: readonly number[]): void {
    validateWeight(weight);
    if (this.#valueType === "boolean" || this.#valueType === "string") {
      throw new TypeError(
        `Additive mixing is not supported for ${this.#valueType} values.`,
      );
    }
    this.#validateValues(values);
    if (weight === 0) return;
    if (this.#valueType === "quaternion") {
      for (let offset = 0; offset < this.#itemSize; offset += 4) {
        const current = this.#additiveValues.slice(offset, offset + 4);
        const target = multiplyQuaternions(
          current,
          values.slice(offset, offset + 4),
        );
        const blended = slerpQuaternion(current, target, weight);
        for (let component = 0; component < 4; component++) {
          this.#additiveValues[offset + component] = blended[component];
        }
      }
    } else {
      for (let index = 0; index < this.#itemSize; index++) {
        this.#additiveValues[index] += values[index] * weight;
      }
    }
    this.#additiveWeight += weight;
  }

  /** Applies the selected accumulator and additive values to the bound property. */
  apply(accuIndex: AccumulatorIndex): void {
    validateAccumulatorIndex(accuIndex);
    if (this.#normalWeights[accuIndex] === 0 && this.#additiveWeight === 0)
      return;
    const original = this.#requireOriginal();
    const result = this.#normalResult(accuIndex, original);
    if (this.#additiveWeight > 0) this.#applyAdditive(result);
    this.#binding.setValue(result, 0);
    this.#resetFrame(accuIndex);
  }

  /** Captures the unanimated property value for later restoration. */
  saveOriginalState(): void {
    const values = new Array<TrackValue>(this.#itemSize);
    this.#binding.getValue(values, 0);
    if (values.some((value) => value === undefined)) {
      throw new TypeError(
        "PropertyMixer binding did not provide every original value.",
      );
    }
    this.#originalValues = values;
    this.#resetFrame(0);
    this.#resetFrame(1);
  }

  /** Restores the captured property value and clears frame accumulators. */
  restoreOriginalState(): void {
    const original = this.#requireOriginal();
    this.#binding.setValue(original, 0);
    this.#resetFrame(0);
    this.#resetFrame(1);
  }

  #accumulateNumeric(
    accuIndex: AccumulatorIndex,
    weight: number,
    values: readonly number[],
  ): void {
    const buffer = this.#normalValues[accuIndex];
    for (let index = 0; index < this.#itemSize; index++) {
      buffer[index] =
        ((buffer[index] as number | undefined) ?? 0) + values[index] * weight;
    }
  }

  #accumulateQuaternion(
    accuIndex: AccumulatorIndex,
    weight: number,
    values: readonly number[],
  ): void {
    const buffer = this.#normalValues[accuIndex];
    const previousWeight = this.#normalWeights[accuIndex];
    const factor =
      previousWeight === 0 ? 1 : weight / (previousWeight + weight);
    for (let offset = 0; offset < this.#itemSize; offset += 4) {
      const incoming = values.slice(offset, offset + 4);
      const blended =
        previousWeight === 0
          ? normalizeQuaternion(incoming)
          : slerpQuaternion(
              buffer.slice(offset, offset + 4) as number[],
              incoming,
              factor,
            );
      for (let component = 0; component < 4; component++) {
        buffer[offset + component] = blended[component];
      }
    }
  }

  #accumulateDiscrete(
    accuIndex: AccumulatorIndex,
    weight: number,
    values: readonly TrackValue[],
  ): void {
    const selectedWeight = this.#selectedWeights[accuIndex];
    const buffer = this.#normalValues[accuIndex];
    if (
      weight > selectedWeight ||
      (weight === selectedWeight && compareDiscrete(values, buffer) < 0)
    ) {
      for (let index = 0; index < this.#itemSize; index++)
        buffer[index] = values[index];
      this.#selectedWeights[accuIndex] = weight;
    }
  }

  #normalResult(
    accuIndex: AccumulatorIndex,
    original: readonly TrackValue[],
  ): TrackValue[] {
    const weight = this.#normalWeights[accuIndex];
    if (weight === 0) return [...original];
    const buffer = this.#normalValues[accuIndex];
    if (this.#valueType === "quaternion") {
      const result = new Array<TrackValue>(this.#itemSize);
      for (let offset = 0; offset < this.#itemSize; offset += 4) {
        const current = buffer.slice(offset, offset + 4) as number[];
        const mixed =
          weight < 1
            ? slerpQuaternion(
                current,
                original.slice(offset, offset + 4) as number[],
                1 - weight,
              )
            : current;
        for (let component = 0; component < 4; component++) {
          result[offset + component] = mixed[component];
        }
      }
      return result;
    }
    if (this.#valueType === "number") {
      return buffer.map((value, index) => {
        const average = (value as number) / weight;
        return weight < 1
          ? average * weight + (original[index] as number) * (1 - weight)
          : average;
      });
    }
    return this.#selectedWeights[accuIndex] >= Math.max(0, 1 - weight)
      ? [...buffer]
      : [...original];
  }

  #applyAdditive(result: TrackValue[]): void {
    if (this.#valueType === "quaternion") {
      for (let offset = 0; offset < this.#itemSize; offset += 4) {
        multiplyQuaternionInto(
          result as number[],
          offset,
          this.#additiveValues.slice(offset, offset + 4),
        );
      }
      return;
    }
    for (let index = 0; index < this.#itemSize; index++) {
      result[index] = (result[index] as number) + this.#additiveValues[index];
    }
  }

  #validateValues(values: readonly TrackValue[]): void {
    if (values.length !== this.#itemSize) {
      throw new RangeError("PropertyMixer values length must equal itemSize.");
    }
    for (const value of values) {
      const valid =
        this.#valueType === "boolean"
          ? typeof value === "boolean"
          : this.#valueType === "string"
            ? typeof value === "string"
            : typeof value === "number" && Number.isFinite(value);
      if (!valid) {
        throw new TypeError(
          `PropertyMixer values must match ${this.#valueType} valueType.`,
        );
      }
    }
  }

  #requireOriginal(): TrackValue[] {
    if (!this.#originalValues) {
      throw new Error(
        "PropertyMixer original state must be explicitly saved before apply.",
      );
    }
    return this.#originalValues;
  }

  #resetFrame(accuIndex: AccumulatorIndex): void {
    this.#normalValues[accuIndex].fill(0);
    this.#normalWeights[accuIndex] = 0;
    this.#selectedWeights[accuIndex] = 0;
    this.#additiveWeight = 0;
    this.#resetAdditiveIdentity();
  }

  #resetAdditiveIdentity(): void {
    this.#additiveValues.fill(0);
    if (this.#valueType === "quaternion") {
      for (let offset = 0; offset < this.#itemSize; offset += 4) {
        this.#additiveValues[offset + 3] = 1;
      }
    }
  }
}

function validateAccumulatorIndex(
  index: number,
): asserts index is AccumulatorIndex {
  if (index !== 0 && index !== 1) {
    throw new RangeError("PropertyMixer accuIndex must be 0 or 1.");
  }
}

function validateWeight(weight: number): void {
  if (!Number.isFinite(weight) || weight < 0) {
    throw new RangeError(
      "PropertyMixer weight must be finite and non-negative.",
    );
  }
}

function normalizeQuaternion(values: readonly number[]): number[] {
  const length = Math.hypot(values[0], values[1], values[2], values[3]);
  if (length === 0)
    throw new RangeError("PropertyMixer quaternion values must be non-zero.");
  return values.map((value) => value / length);
}

function slerpQuaternion(
  startValues: readonly number[],
  endValues: readonly number[],
  factor: number,
): number[] {
  const start = normalizeQuaternion(startValues);
  let end = normalizeQuaternion(endValues);
  let dot = start.reduce((sum, value, index) => sum + value * end[index], 0);
  if (dot < 0) {
    dot = -dot;
    end = end.map((value) => -value);
  }
  if (dot > 0.9995) {
    return normalizeQuaternion(
      start.map((value, index) => value + factor * (end[index] - value)),
    );
  }
  const angle = Math.acos(Math.min(1, dot));
  const denominator = Math.sin(angle);
  const startScale = Math.sin((1 - factor) * angle) / denominator;
  const endScale = Math.sin(factor * angle) / denominator;
  return start.map(
    (value, index) => value * startScale + end[index] * endScale,
  );
}

function multiplyQuaternionInto(
  target: number[],
  offset: number,
  right: readonly number[],
): void {
  const result = multiplyQuaternions(target.slice(offset, offset + 4), right);
  for (let component = 0; component < 4; component++) {
    target[offset + component] = result[component];
  }
}

function multiplyQuaternions(
  left: readonly number[],
  right: readonly number[],
): number[] {
  const [x, y, z, w] = left;
  const [rx, ry, rz, rw] = right;
  return normalizeQuaternion([
    x * rw + w * rx + y * rz - z * ry,
    y * rw + w * ry + z * rx - x * rz,
    z * rw + w * rz + x * ry - y * rx,
    w * rw - x * rx - y * ry - z * rz,
  ]);
}

function compareDiscrete(
  left: readonly TrackValue[],
  right: readonly TrackValue[],
): number {
  return left
    .map(String)
    .join("\u0000")
    .localeCompare(right.map(String).join("\u0000"));
}
