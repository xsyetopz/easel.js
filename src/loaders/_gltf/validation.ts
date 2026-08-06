export function record(
  value: unknown,
  path: string,
): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`GLTFLoader: ${path} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

export function array(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value))
    throw new TypeError(`GLTFLoader: ${path} must be an array.`);
  return value;
}

export function finite(
  value: unknown,
  path: string,
  fallback?: number,
): number {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`GLTFLoader: ${path} must be a finite number.`);
  }
  return value;
}

export function integer(
  value: unknown,
  path: string,
  fallback?: number,
): number {
  const number = finite(value, path, fallback);
  if (!Number.isSafeInteger(number))
    throw new RangeError(`GLTFLoader: ${path} must be an integer.`);
  return number;
}

export function numberArray(
  value: unknown,
  path: string,
  length?: number,
): number[] {
  const values = array(value, path).map((item, index) =>
    finite(item, `${path}[${index}]`),
  );
  if (length !== undefined && values.length !== length) {
    throw new RangeError(`GLTFLoader: ${path} must contain ${length} values.`);
  }
  return values;
}
