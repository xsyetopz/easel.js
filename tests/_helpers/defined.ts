export function defined<T>(
  value: T | null | undefined,
  label = "value",
): NonNullable<T> {
  if (value == null) {
    throw new Error(`${label} is missing`);
  }
  return value;
}
