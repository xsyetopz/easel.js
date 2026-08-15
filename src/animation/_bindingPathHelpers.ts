import type { BindingPath } from "./Binding.ts";

/** Matches animation paths targeting a named node's bone property. */
export const BONES_PATH_PATTERN =
  /^(?<nodeName>[^.]+)\.bones\[(?<objectIndex>.*?)\]\.(?<propertyName>[A-Za-z_$][\w$-]*)(?:\.(?<propertyIndexDot>[A-Za-z_$][\w$-]*)|\[(?<propertyIndexBracket>.*?)\])?$/u;
/** Matches animation paths targeting a node material property. */
export const MATERIAL_PATH_PATTERN =
  /^(?<nodeName>[^.]+)\.material\.(?<propertyName>[A-Za-z_$][\w$-]*)(?:\.(?<propertyIndexDot>[A-Za-z_$][\w$-]*)|\[(?<propertyIndexBracket>.*?)\])?$/u;
/** Captures the base path and bracket index from an indexed binding path. */
export const INDEXED_PATH_PATTERN = /^(?<prefix>.*)\[(?<index>.*?)\]$/u;
/** Splits paths at separators that can create unsafe or empty segments. */
export const UNSAFE_PATH_SPLIT_PATTERN = /[.[\]/:\\]+/u;
/** Recognizes decimal indexes that can be converted to numbers. */
export const NON_NEGATIVE_INTEGER_PATTERN = /^(?<value>0|[1-9]\d*)$/u;
/** Recognizes property identifiers accepted in binding paths. */
export const PROPERTY_NAME_PATTERN = /^[A-Za-z_$][\w$-]*$/u;

/** Component keys supported when binding vector-like values. */
export const COMPONENT_KEYS = new Set(["x", "y", "z", "w", "r", "g", "b"]);
/** Property names rejected to prevent prototype or constructor traversal. */
export const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

/** Components for building a validated `BindingPath`. */
export interface BindingPathOptions {
  /** Optional scene-graph node name or path. */
  readonly nodeName: string | undefined;
  /** Target collection, such as `material` or `bones`. */
  readonly objectName: BindingPath["objectName"];
  /** Optional material or bone collection index. */
  readonly objectIndex: string | number | undefined;
  /** Animatable property name on the target object. */
  readonly propertyName: string;
  /** Optional component or array index within the property. */
  readonly propertyIndex: string | number | undefined;
}

/** Builds a validated `BindingPath` from parsed path components. */
export function bindingPath(options: BindingPathOptions): BindingPath {
  const { nodeName, objectName, propertyName, propertyIndex } = options;
  for (const part of [nodeName, objectName, propertyName, propertyIndex]) {
    if (typeof part === "string" && RESERVED_KEYS.has(part)) {
      throw new SyntaxError(`Binding path segment ${part} is reserved.`);
    }
  }
  return {
    nodeName,
    objectName,
    objectIndex: options.objectIndex,
    propertyName,
    propertyIndex,
  };
}

/** Compares every component of two parsed binding paths. */
export function sameBindingPath(
  left: BindingPath,
  right: BindingPath,
): boolean {
  return (
    left.nodeName === right.nodeName &&
    left.objectName === right.objectName &&
    left.objectIndex === right.objectIndex &&
    left.propertyName === right.propertyName &&
    left.propertyIndex === right.propertyIndex
  );
}

/** Returns the sole node-name prefix or rejects ambiguous dotted names. */
export function nodePrefix(
  parts: readonly string[],
  path: string,
): string | undefined {
  if (parts.length === 0) return;
  if (parts.length > 1) {
    throw new SyntaxError(
      `Binding path ${path} contains an ambiguous dotted node name.`,
    );
  }
  return parts[0];
}

/** Parses an optional bracket index while preserving absent values. */
export function parseOptionalIndex(
  value: string | undefined,
): string | number | undefined {
  return value === undefined ? undefined : parsePropertyIndex(value);
}

/** Rejects empty, reserved, or unsupported animation binding paths. */
export function rejectUnsafePath(path: string): void {
  if (
    path.includes("..") ||
    path.startsWith(".") ||
    path.endsWith(".") ||
    path.startsWith("/") ||
    path.endsWith("/") ||
    path.includes("//")
  ) {
    throw new SyntaxError(`Binding path ${path} contains an empty segment.`);
  }
  for (const segment of path.split(UNSAFE_PATH_SPLIT_PATTERN)) {
    if (RESERVED_KEYS.has(segment)) {
      throw new SyntaxError(`Binding path segment ${segment} is reserved.`);
    }
  }
  if (path.includes("morphTargetInfluences") || path.includes("materials[")) {
    throw new SyntaxError(
      `Binding path ${path} targets an unsupported capability.`,
    );
  }
}

/** Trims a bracket index and converts non-negative integers to numbers. */
export function parsePropertyIndex(value: string): string | number {
  const trimmed = value.trim();
  if (trimmed.length === 0)
    throw new SyntaxError("Binding bracket index must not be empty.");
  if (NON_NEGATIVE_INTEGER_PATTERN.test(trimmed)) return Number(trimmed);
  return trimmed;
}
