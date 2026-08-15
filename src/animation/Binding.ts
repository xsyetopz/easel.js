import type { TrackValue } from "./Track.ts";
import {
  bindingPath,
  BONES_PATH_PATTERN,
  COMPONENT_KEYS,
  INDEXED_PATH_PATTERN,
  MATERIAL_PATH_PATTERN,
  nodePrefix,
  parseOptionalIndex,
  parsePropertyIndex,
  PROPERTY_NAME_PATTERN,
  rejectUnsafePath,
  sameBindingPath,
} from "./_bindingPathHelpers.ts";
import {
  findBone,
  findHierarchyNode,
  isAnimatableArray,
  isObject,
  isTrackValue,
  matchesNode,
  readArray,
  readComponents,
  readIndexed,
  resolveObjectTarget,
  validateArrayOffset,
  validatePropertyTarget,
  writeArray,
  writeComponents,
  writeIndexed,
} from "./_bindingAccessHelpers.ts";

/** Parsed animation path, including optional node, object, and component indices. */
export interface BindingPath {
  /** Optional scene-graph node name. */
  readonly nodeName: string | undefined;
  /** Optional object collection name. */
  readonly objectName: "bones" | "material" | undefined;
  /** Optional object collection index or key. */
  readonly objectIndex: string | number | undefined;
  /** Bound property name. */
  readonly propertyName: string;
  /** Optional component index or key. */
  readonly propertyIndex: string | number | undefined;
}

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
    return bindingPath({
      nodeName: bones[1],
      objectName: "bones",
      objectIndex: parsePropertyIndex(bones[2]),
      propertyName: bones[3],
      propertyIndex: parseOptionalIndex(bones[4] ?? bones[5]),
    });
  }
  const material = MATERIAL_PATH_PATTERN.exec(normalized);
  if (material) {
    return bindingPath({
      nodeName: material[1],
      objectName: "material",
      objectIndex: undefined,
      propertyName: material[2],
      propertyIndex: parseOptionalIndex(material[3] ?? material[4]),
    });
  }
  return parseSimplePath(normalized, path);
}

function parseSimplePath(normalized: string, path: string): BindingPath {
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
    return bindingPath({
      nodeName: nodePrefix(parts.slice(0, -1), path),
      objectName: undefined,
      objectIndex: undefined,
      propertyName: parts.at(-1) as string,
      propertyIndex: parsePropertyIndex(indexed[2]),
    });
  }
  const last = parts.at(-1) as string;
  if (parts.length > 1 && COMPONENT_KEYS.has(last)) {
    return bindingPath({
      nodeName: nodePrefix(parts.slice(0, -2), path),
      objectName: undefined,
      objectIndex: undefined,
      propertyName: parts.at(-2) as string,
      propertyIndex: last,
    });
  }
  return bindingPath({
    nodeName: nodePrefix(parts.slice(0, -1), path),
    objectName: undefined,
    objectIndex: undefined,
    propertyName: last,
    propertyIndex: undefined,
  });
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
  const record = root as Record<string, unknown> & {
    skeleton?: unknown;
    children?: unknown;
  };
  const skeleton = record.skeleton;
  if (isObject(skeleton)) {
    const bone = findBone(skeleton, nodeName);
    if (bone) return bone;
  }
  const children = record.children;
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

  /** Creates a binding for a validated animation property path. */
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

  /** Root object used to resolve this binding. */
  get root(): object {
    return this.#root;
  }
  /** Original property path supplied to this binding. */
  get path(): string {
    return this.#path;
  }
  /** Parsed components of the validated property path. */
  get parsedPath(): BindingPath {
    return this.#parsedPath;
  }
  /** Whether this binding has been explicitly bound to a target. */
  get isBound(): boolean {
    return this.#target !== undefined;
  }

  /** Binds the property path to its resolved target object. */
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

  /** Clears the cached property target. */
  unbind(): this {
    this.#target = undefined;
    return this;
  }

  /** Resolves the target node for the parsed path. */
  resolveNode(): object | undefined {
    const { nodeName } = this.#parsedPath;
    return nodeName ? findBindingNode(this.#root, nodeName) : this.#root;
  }

  /** Reads the bound value into a track value array. */
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

  /** Writes a track value array into the bound target. */
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

  /** Reports whether this binding resolves to the supplied node. */
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
