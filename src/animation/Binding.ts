import type { TrackValue } from "./Track.ts";

/** Parsed animation path, including optional node, object, and component indices. */
export interface BindingPath {
  /** Optional node or hierarchy name selected before property lookup. */
  readonly nodeName: string | undefined;
  /** Optional collection name, currently `bones` or `material`. */
  readonly objectName: "bones" | "material" | undefined;
  /** Optional index selecting an entry in the named collection. */
  readonly objectIndex: string | number | undefined;
  /** Property read or written by the binding. */
  readonly propertyName: string;
  /** Optional component or array index within the property. */
  readonly propertyIndex: string | number | undefined;
}

type BindingArray = Float64Array | TrackValue[];

const BONES_PATH_PATTERN =
  /^([^.]+)\.bones\[(.*?)\]\.([A-Za-z_$][\w$-]*)(?:\.([A-Za-z_$][\w$-]*)|\[(.*?)\])?$/u;
const MATERIAL_PATH_PATTERN =
  /^([^.]+)\.material\.([A-Za-z_$][\w$-]*)(?:\.([A-Za-z_$][\w$-]*)|\[(.*?)\])?$/u;
const INDEXED_PATH_PATTERN = /^(.*)\[(.*?)\]$/u;
const UNSAFE_PATH_SPLIT_PATTERN = /[.[\]/:\\]+/u;
const NON_NEGATIVE_INTEGER_PATTERN = /^(0|[1-9]\d*)$/u;
const PROPERTY_NAME_PATTERN = /^[A-Za-z_$][\w$-]*$/u;

/** Normalizes a node name for use in an animation binding path. */
export function sanitizeBindingNodeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/gu, "_")
    .replace(/[[\].:/\\]/gu, "");
}

/** Parses and validates a supported animation property path. */
export function parseBindingPath(path: string): BindingPath {
  const normalized = path.trim();
  if (normalized.length === 0) {
    throw new SyntaxError("Binding path must not be empty.");
  }
  rejectUnsafePath(normalized);
  const bones = BONES_PATH_PATTERN.exec(normalized);
  if (bones) {
    return bindingPath(
      bones[1],
      "bones",
      parsePropertyIndex(bones[2]),
      bones[3],
      parseOptionalIndex(bones[4] ?? bones[5]),
    );
  }
  const material = MATERIAL_PATH_PATTERN.exec(normalized);
  if (material) {
    return bindingPath(
      material[1],
      "material",
      undefined,
      material[2],
      parseOptionalIndex(material[3] ?? material[4]),
    );
  }
  const indexed = INDEXED_PATH_PATTERN.exec(normalized);
  const parts = (indexed?.[1] ?? normalized).split(".");
  if (
    parts.some((part) => part.length === 0) ||
    parts.length > 3 ||
    !PROPERTY_NAME_PATTERN.test(parts.at(-1) as string)
  ) {
    throw new SyntaxError(`Binding path ${path} is ambiguous or malformed.`);
  }
  if (indexed) {
    return bindingPath(
      nodePrefix(parts.slice(0, -1), path),
      undefined,
      undefined,
      parts.at(-1) as string,
      parsePropertyIndex(indexed[2]),
    );
  }
  const last = parts.at(-1) as string;
  if (parts.length > 1 && COMPONENT_KEYS.has(last)) {
    return bindingPath(
      nodePrefix(parts.slice(0, -2), path),
      undefined,
      undefined,
      parts.at(-2) as string,
      last,
    );
  }
  return bindingPath(
    nodePrefix(parts.slice(0, -1), path),
    undefined,
    undefined,
    last,
    undefined,
  );
}

/** Searches a root hierarchy or skeleton for a node matching `nodeName`. */
export function findBindingNode(
  root: object,
  nodeName: string | number | undefined,
): object | undefined {
  if (
    nodeName === undefined ||
    nodeName === "" ||
    nodeName === -1 ||
    matchesNode(root, String(nodeName))
  )
    return root;
  if (typeof nodeName !== "string") return;
  if (nodeName.includes("/")) return findHierarchyNode(root, nodeName);
  const record = root as Record<string, unknown>;
  const skeleton = record["skeleton"];
  if (isObject(skeleton)) {
    const bone = findBone(skeleton, nodeName);
    if (bone) return bone;
  }
  const children = record["children"];
  if (!Array.isArray(children)) return;
  for (const child of children) {
    if (!isObject(child)) continue;
    const found = findBindingNode(child, nodeName);
    if (found) return found;
  }
  return void 0 as object | undefined;
}

/** Explicitly binds a validated property path to cached animation access. */
export class Binding {
  readonly #root: object;
  readonly #path: string;
  readonly #parsedPath: BindingPath;
  #target: Record<string, unknown> | undefined;

  /** Creates an explicitly managed binding for a validated property path. */
  constructor(root: object, path: string, parsedPath?: BindingPath) {
    this.#root = root;
    this.#path = path;
    const canonicalPath = parseBindingPath(path);
    if (
      parsedPath !== undefined &&
      !sameBindingPath(parsedPath, canonicalPath)
    ) {
      throw new SyntaxError(
        "Binding parsedPath must match the configured path grammar.",
      );
    }
    this.#parsedPath = canonicalPath;
  }

  /** Root object searched when resolving the binding path. */
  get root(): object {
    return this.#root;
  }

  /** Original path string supplied to the binding. */
  get path(): string {
    return this.#path;
  }

  /** Canonical path components used by binding operations. */
  get parsedPath(): BindingPath {
    return this.#parsedPath;
  }

  /** Whether a target object is currently cached for access. */
  get isBound(): boolean {
    return this.#target !== undefined;
  }

  /** Explicitly traverses and validates the path, then caches its target. */
  bind(): this {
    const node = this.resolveNode();
    if (!node) {
      throw new ReferenceError(
        `Binding node for path ${this.#path} was not found.`,
      );
    }
    const target = resolveObjectTarget(
      node as Record<string, unknown>,
      this.#parsedPath,
    );
    if (!(this.#parsedPath.propertyName in target)) {
      throw new ReferenceError(
        `Binding property ${this.#parsedPath.propertyName} was not found.`,
      );
    }
    validatePropertyTarget(target, this.#parsedPath);
    this.#target = target;
    return this;
  }

  /** Clears the cached target without traversing or mutating the scene graph. */
  unbind(): this {
    this.#target = undefined;
    return this;
  }

  /** Explicitly resolves the configured node without changing binding state. */
  resolveNode(): object | undefined {
    const { nodeName } = this.#parsedPath;
    return nodeName ? findBindingNode(this.#root, nodeName) : this.#root;
  }

  /** Reads the cached property into `targetArray` at `offset` without traversal. */
  getValue(targetArray: TrackValue[] | Float64Array, offset: number): void {
    validateArrayOffset(targetArray, offset);
    const target = this.#requireTarget();
    const { propertyName, propertyIndex } = this.#parsedPath;
    const property = target[propertyName];
    if (propertyIndex !== undefined) {
      targetArray[offset] = readIndexed(property, propertyIndex);
      return;
    }
    if (isTrackValue(property)) {
      targetArray[offset] = property;
      return;
    }
    if (isAnimatableArray(property)) {
      readArray(property, targetArray, offset);
      return;
    }
    readComponents(property, targetArray, offset);
  }

  /** Writes `sourceArray` from `offset` into the cached property without traversal. */
  setValue(
    sourceArray: readonly TrackValue[] | Float64Array,
    offset: number,
  ): void {
    validateArrayOffset(sourceArray, offset);
    const target = this.#requireTarget();
    const { propertyName, propertyIndex } = this.#parsedPath;
    const property = target[propertyName];
    if (propertyIndex !== undefined) {
      writeIndexed(property, propertyIndex, sourceArray[offset]);
      return;
    }
    if (isTrackValue(property)) {
      target[propertyName] = sourceArray[offset];
      return;
    }
    if (isAnimatableArray(property)) {
      writeArray(property, sourceArray, offset);
      return;
    }
    writeComponents(property, sourceArray, offset);
  }

  /** Returns `true` when the binding's resolved node is `node`. */
  isBindingBoundBy(node: object): boolean {
    return this.resolveNode() === node;
  }

  #requireTarget(): Record<string, unknown> {
    if (!this.#target) {
      throw new Error(
        `Binding ${this.#path} must be explicitly bound before access.`,
      );
    }
    return this.#target;
  }
}

/** Parses a track-name binding path into its components. */
export function parseTrackName(path: string): BindingPath {
  return parseBindingPath(path);
}

/** Searches a root hierarchy for a node matching `nodeName`. */
export function findNode(
  root: object,
  nodeName: string | number | undefined,
): object | undefined {
  return findBindingNode(root, nodeName);
}

const COMPONENT_KEYS = new Set(["x", "y", "z", "w", "r", "g", "b"]);
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function bindingPath(
  nodeName: string | undefined,
  objectName: BindingPath["objectName"],
  objectIndex: string | number | undefined,
  propertyName: string,
  propertyIndex: string | number | undefined,
): BindingPath {
  for (const part of [nodeName, objectName, propertyName, propertyIndex]) {
    if (typeof part === "string" && RESERVED_KEYS.has(part)) {
      throw new SyntaxError(`Binding path segment ${part} is reserved.`);
    }
  }
  return { nodeName, objectName, objectIndex, propertyName, propertyIndex };
}

function sameBindingPath(left: BindingPath, right: BindingPath): boolean {
  return (
    left.nodeName === right.nodeName &&
    left.objectName === right.objectName &&
    left.objectIndex === right.objectIndex &&
    left.propertyName === right.propertyName &&
    left.propertyIndex === right.propertyIndex
  );
}

function nodePrefix(
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

function parseOptionalIndex(
  value: string | undefined,
): string | number | undefined {
  return value === undefined ? undefined : parsePropertyIndex(value);
}

function rejectUnsafePath(path: string): void {
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

function resolveObjectTarget(
  node: Record<string, unknown>,
  path: BindingPath,
): Record<string, unknown> {
  if (path.objectName === undefined) return node;
  if (path.objectName === "material") {
    const material = node["material"];
    if (!isObject(material)) {
      throw new ReferenceError("Binding material target was not found.");
    }
    return material;
  }
  const skeleton = node["skeleton"];
  if (!isObject(skeleton) || path.objectIndex === undefined) {
    throw new ReferenceError("Binding skeleton target was not found.");
  }
  const bone = findBone(skeleton, path.objectIndex);
  if (!bone)
    throw new ReferenceError(`Binding bone ${path.objectIndex} was not found.`);
  return bone;
}

function findBone(
  skeleton: Record<string, unknown>,
  nameOrIndex: string | number,
): Record<string, unknown> | undefined {
  const bones = skeleton["bones"];
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

function findHierarchyNode(root: object, path: string): object | undefined {
  const segments = path.split("/");
  if (segments.some((segment) => segment.length === 0)) return;
  let current: object = root;
  if (matchesNode(current, segments[0])) segments.shift();
  for (const segment of segments) {
    const children = (current as Record<string, unknown>)["children"];
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

function matchesNode(node: object, nameOrUuid: string): boolean {
  const record = node as Record<string, unknown>;
  return record["name"] === nameOrUuid || record["uuid"] === nameOrUuid;
}

function parsePropertyIndex(value: string): string | number {
  const trimmed = value.trim();
  if (trimmed.length === 0)
    throw new SyntaxError("Binding bracket index must not be empty.");
  if (NON_NEGATIVE_INTEGER_PATTERN.test(trimmed)) return Number(trimmed);
  return trimmed;
}

function validatePropertyTarget(
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

function readIndexed(property: unknown, index: string | number): TrackValue {
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

function writeIndexed(
  property: unknown,
  index: string | number,
  value: TrackValue,
): void {
  readIndexed(property, index);
  (property as Record<string | number, unknown>)[index] = value;
}

function readComponents(
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

function writeComponents(
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

function readArray(
  property: NumericTypedArray | TrackValue[],
  target: BindingArray,
  offset: number,
): void {
  validateWriteCapacity(target, offset, property.length);
  for (let index = 0; index < property.length; index++) {
    target[offset + index] = property[index];
  }
}

function writeArray(
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

function hasComponents(value: unknown): boolean {
  return isObject(value) && [...COMPONENT_KEYS].some((key) => key in value);
}

function validateArrayOffset(array: ArrayLike<unknown>, offset: number): void {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset >= array.length) {
    throw new RangeError(
      "Binding array offset must reference existing storage.",
    );
  }
}

function validateWriteCapacity(
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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNumericArray(value: unknown): value is NumericTypedArray {
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

function isAnimatableArray(
  value: unknown,
): value is NumericTypedArray | TrackValue[] {
  if (isNumericArray(value)) return true;
  if (!Array.isArray(value)) return false;
  for (let index = 0; index < value.length; index++) {
    if (!(index in value && isTrackValue(value[index]))) return false;
  }
  return true;
}

type NumericTypedArray =
  | Float32Array
  | Float64Array
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array;

function isTrackValue(value: unknown): value is TrackValue {
  return (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "string"
  );
}
