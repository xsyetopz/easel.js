import { COMPONENT_KEYS } from "./_bindingPathHelpers.ts";
import type { BindingPath } from "./Binding.ts";
import type { TrackValue } from "./Track.ts";

/** Writable animation storage used for flattened track values. */
export type BindingArray = Float64Array | TrackValue[];

type NamedAccessRecord = Record<string, unknown> & {
  bones?: unknown;
  children?: unknown;
  material?: unknown;
  name?: unknown;
  skeleton?: unknown;
  uuid?: unknown;
};

/** Typed arrays accepted as numeric animatable property storage. */
export type NumericTypedArray =
  | Float32Array
  | Float64Array
  | Int8Array
  | Int16Array
  | Int32Array
  | Uint8Array
  | Uint8ClampedArray
  | Uint16Array
  | Uint32Array;

/** Narrows non-null object values to string-keyed records. */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Narrows unknown values to one of the supported numeric typed arrays. */
export function isNumericArray(value: unknown): value is NumericTypedArray {
  return (
    value instanceof Float32Array ||
    value instanceof Float64Array ||
    value instanceof Int8Array ||
    value instanceof Uint8Array ||
    value instanceof Uint8ClampedArray ||
    value instanceof Int16Array ||
    value instanceof Uint16Array ||
    value instanceof Int32Array ||
    value instanceof Uint32Array
  );
}

/** Checks for numeric typed arrays or arrays containing only track values. */
export function isAnimatableArray(
  value: unknown,
): value is NumericTypedArray | TrackValue[] {
  if (isNumericArray(value)) return true;
  if (!Array.isArray(value)) return false;
  for (let index = 0; index < value.length; index++) {
    if (!(index in value && isTrackValue(value[index]))) return false;
  }
  return true;
}

/** Narrows primitive values to the scalar values supported by animation tracks. */
export function isTrackValue(value: unknown): value is TrackValue {
  return (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "string"
  );
}

/** Reports whether an object exposes at least one supported component key. */
export function hasComponents(value: unknown): boolean {
  return isObject(value) && [...COMPONENT_KEYS].some((key) => key in value);
}

/** Resolves a binding path to its node, material, or indexed bone target. */
export function resolveObjectTarget(
  node: Record<string, unknown>,
  path: BindingPath,
): Record<string, unknown> {
  if (path.objectName === undefined) return node;
  if (path.objectName === "material") {
    const material = (node as NamedAccessRecord).material;
    if (!isObject(material)) {
      throw new ReferenceError("Binding material target was not found.");
    }
    return material;
  }
  const skeleton = (node as NamedAccessRecord).skeleton;
  if (!isObject(skeleton) || path.objectIndex === undefined) {
    throw new ReferenceError("Binding skeleton target was not found.");
  }
  const bone = findBone(skeleton, path.objectIndex);
  if (!bone)
    throw new ReferenceError(`Binding bone ${path.objectIndex} was not found.`);
  return bone;
}

/** Finds a bone by numeric index or by matching name/UUID. */
export function findBone(
  skeleton: Record<string, unknown>,
  nameOrIndex: string | number,
): Record<string, unknown> | undefined {
  const bones = (skeleton as NamedAccessRecord).bones;
  if (!Array.isArray(bones)) return;
  if (typeof nameOrIndex === "number") {
    const bone = bones[nameOrIndex];
    return isObject(bone) ? bone : undefined;
  }
  return bones.find(
    (bone): bone is Record<string, unknown> =>
      isObject(bone) && matchesNode(bone, nameOrIndex),
  );
}

/** Walks slash-separated child names from a hierarchy root. */
export function findHierarchyNode(
  root: object,
  path: string,
): object | undefined {
  const segments = path.split("/");
  if (segments.some((segment) => segment.length === 0)) return;
  let current: object = root;
  if (matchesNode(current, segments[0])) segments.shift();
  for (const segment of segments) {
    const children = (current as NamedAccessRecord).children;
    if (!Array.isArray(children)) return;
    const next = children.find(
      (child): child is object =>
        isObject(child) && matchesNode(child, segment),
    );
    if (!next) return;
    current = next;
  }
  return current;
}

/** Tests a node's name and UUID against a binding path segment. */
export function matchesNode(node: object, nameOrUuid: string): boolean {
  const record = node as NamedAccessRecord;
  return record.name === nameOrUuid || record.uuid === nameOrUuid;
}

/** Validates that a binding path resolves to an animatable property. */
export function validatePropertyTarget(
  target: Record<string, unknown>,
  path: BindingPath,
): void {
  const property = target[path.propertyName];
  if (path.propertyIndex !== undefined) {
    readIndexed(property, path.propertyIndex);
  } else if (
    !(
      isTrackValue(property) ||
      hasComponents(property) ||
      isAnimatableArray(property)
    )
  ) {
    throw new TypeError(
      `Binding property ${path.propertyName} is not animatable.`,
    );
  }
}

/** Reads and validates one scalar from an indexed animatable property. */
export function readIndexed(
  property: unknown,
  index: string | number,
): TrackValue {
  if (
    !(isObject(property) || Array.isArray(property) || isNumericArray(property))
  ) {
    throw new TypeError(
      "Binding indexed property must be an object or numeric array.",
    );
  }
  if (!(index in property))
    throw new RangeError(`Binding property index ${index} was not found.`);
  const value = property[index as keyof typeof property];
  if (!isTrackValue(value))
    throw new TypeError(`Binding property index ${index} is not animatable.`);
  return value;
}

/** Validates and writes one scalar into an indexed animatable property. */
export function writeIndexed(
  property: unknown,
  index: string | number,
  value: TrackValue,
): void {
  readIndexed(property, index);
  (property as Record<string | number, unknown>)[index] = value;
}

/** Flattens numeric component fields into animation storage. */
export function readComponents(
  property: unknown,
  target: BindingArray,
  offset: number,
): void {
  if (!isObject(property))
    throw new TypeError("Binding component property must be an object.");
  let output = offset;
  const count = [...COMPONENT_KEYS].filter((key) => key in property).length;
  validateWriteCapacity(target, offset, count);
  for (const key of COMPONENT_KEYS) {
    if (!(key in property)) continue;
    const value = property[key];
    if (typeof value !== "number")
      throw new TypeError(`Binding component ${key} must be numeric.`);
    target[output++] = value;
  }
}

/** Writes flattened numeric values into the matching component fields. */
export function writeComponents(
  property: unknown,
  source: readonly TrackValue[] | Float64Array,
  offset: number,
): void {
  if (!isObject(property))
    throw new TypeError("Binding component property must be an object.");
  let input = offset;
  const count = [...COMPONENT_KEYS].filter((key) => key in property).length;
  validateWriteCapacity(source, offset, count);
  for (const key of COMPONENT_KEYS) {
    if (!(key in property)) continue;
    const value = source[input++];
    if (typeof value !== "number")
      throw new TypeError(`Binding component ${key} requires a number.`);
    property[key] = value;
  }
}

/** Copies an animatable array into flattened binding storage. */
export function readArray(
  property: NumericTypedArray | TrackValue[],
  target: BindingArray,
  offset: number,
): void {
  validateWriteCapacity(target, offset, property.length);
  for (let index = 0; index < property.length; index++) {
    target[offset + index] = property[index];
  }
}

/** Writes flattened animation values into a numeric or scalar array. */
export function writeArray(
  property: NumericTypedArray | TrackValue[],
  source: readonly TrackValue[] | Float64Array,
  offset: number,
): void {
  validateWriteCapacity(source, offset, property.length);
  for (let index = 0; index < property.length; index++) {
    const value = source[offset + index];
    if (isNumericArray(property)) {
      if (typeof value !== "number") {
        throw new TypeError("Binding numeric array values must be numbers.");
      }
      property[index] = value;
    } else {
      property[index] = value;
    }
  }
}

/** Validates that an offset addresses an existing array element. */
export function validateArrayOffset(
  array: ArrayLike<unknown>,
  offset: number,
): void {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset >= array.length) {
    throw new RangeError(
      "Binding array offset must reference existing storage.",
    );
  }
}

/** Ensures a destination has capacity for a contiguous value range. */
export function validateWriteCapacity(
  array: ArrayLike<unknown>,
  offset: number,
  count: number,
): void {
  if (offset + count > array.length) {
    throw new RangeError(
      "Binding array does not have enough storage for the property value.",
    );
  }
}
