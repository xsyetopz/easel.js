export function defined<T>(
  value: NonNullable<T> | null | undefined,
  label = "value",
): NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(`${label} is missing`);
  }
  return value;
}
