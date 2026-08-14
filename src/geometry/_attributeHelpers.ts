import type { Attribute } from "./Attribute.ts";
import type { AttributeArray } from "./Attribute.ts";

type AttributeUpdateInvalidator = () => void;

const _updateInvalidators = new WeakMap<
  Attribute,
  Set<WeakRef<AttributeUpdateInvalidator>>
>();

/** Registers a callback that runs when the attribute publishes mutated storage. */
export function registerAttributeUpdateInvalidator(
  attribute: Attribute,
  invalidator: AttributeUpdateInvalidator,
): void {
  let invalidators = _updateInvalidators.get(attribute);
  if (!invalidators) {
    invalidators = new Set();
    _updateInvalidators.set(attribute, invalidators);
  }
  for (const reference of invalidators) {
    if (reference.deref() === invalidator) return;
  }
  invalidators.add(new WeakRef(invalidator));
}

/** Removes a previously registered attribute cache invalidation callback. */
export function unregisterAttributeUpdateInvalidator(
  attribute: Attribute,
  invalidator: AttributeUpdateInvalidator,
): void {
  const invalidators = _updateInvalidators.get(attribute);
  if (!invalidators) return;
  for (const reference of invalidators) {
    const current = reference.deref();
    if (!current || current === invalidator) invalidators.delete(reference);
  }
  if (invalidators.size === 0) _updateInvalidators.delete(attribute);
}

/** Notifies live listeners that an attribute's underlying storage changed. */
export function publishAttributeUpdate(attribute: Attribute): void {
  const invalidators = _updateInvalidators.get(attribute);
  if (!invalidators) return;
  for (const reference of invalidators) {
    const invalidator = reference.deref();
    if (invalidator) invalidator();
    else invalidators.delete(reference);
  }
  if (invalidators.size === 0) _updateInvalidators.delete(attribute);
}

/** Converts a stored typed-array channel to its normalized numeric value. */
export function denormalize(value: number, array: AttributeArray): number {
  if (array instanceof Float32Array) return value;
  if (array instanceof Uint32Array) return value / 4_294_967_295;
  if (array instanceof Uint16Array) return value / 65_535;
  if (array instanceof Uint8Array || array instanceof Uint8ClampedArray) {
    return value / 255;
  }
  if (array instanceof Int32Array) return Math.max(value / 2_147_483_647, -1);
  if (array instanceof Int16Array) return Math.max(value / 32_767, -1);
  return Math.max(value / 127, -1);
}

/** Converts a normalized channel value into the storage type's integer range. */
export function normalize(value: number, array: AttributeArray): number {
  if (array instanceof Float32Array) return value;
  if (array instanceof Uint32Array) return Math.round(value * 4_294_967_295);
  if (array instanceof Uint16Array) return Math.round(value * 65_535);
  if (array instanceof Uint8Array || array instanceof Uint8ClampedArray) {
    return Math.round(value * 255);
  }
  if (array instanceof Int32Array) return Math.round(value * 2_147_483_647);
  if (array instanceof Int16Array) return Math.round(value * 32_767);
  return Math.round(value * 127);
}

const TYPED_ARRAY_MAP: Record<string, new (length: number) => AttributeArray> =
  {
    Int8: Int8Array,
    Uint8: Uint8Array,
    Uint8Clamped: Uint8ClampedArray,
    Int16: Int16Array,
    Uint16: Uint16Array,
    Int32: Int32Array,
    Uint32: Uint32Array,
    Float32: Float32Array,
  };

const ARRAY_SUFFIX_RE = /Array$/u;

/** Returns the typed-array constructor name without the `Array` suffix. */
export function toNormalizedTypeName(typeName: string): string {
  return typeName.replace(ARRAY_SUFFIX_RE, "");
}

/** Returns the typed-array constructor for a normalized type name. */
export function toType(
  typeName: string,
): (new (length: number) => AttributeArray) | undefined {
  return TYPED_ARRAY_MAP[typeName];
}
