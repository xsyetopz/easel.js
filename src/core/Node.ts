import { Euler } from "../math/Euler.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { Quaternion } from "../math/Quaternion.ts";
import { Vector3 } from "../math/Vector3.ts";
import { EventDispatcher } from "./EventDispatcher.ts";
import { Layers } from "./Layers.ts";

const _position = new Vector3();
const _m1 = new Matrix4();
const _q1 = new Quaternion();
const _v1 = new Vector3();

const _xAxis = new Vector3(1, 0, 0);
const _yAxis = new Vector3(0, 1, 0);
const _zAxis = new Vector3(0, 0, 1);

let _nodeId = 0;

function rejectNonFiniteJSONNumber(_key: string, value: unknown): unknown {
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new RangeError("Node.toJSON requires finite serialized numbers.");
  }
  return value;
}

function assertFiniteJSONValue(
  value: unknown,
  path: string,
  seen: Set<object> = new Set(),
): void {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new RangeError(`Node.toJSON requires finite ${path}.`);
    }
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      assertFiniteJSONValue(value[index], `${path}[${index}]`, seen);
    }
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    assertFiniteJSONValue(child, `${path}.${key}`, seen);
  }
}

/** Construction options for a scene-graph node. */
export interface NodeOptions {
  /** Stable identifier supplied by the caller or generated for the node. */
  uuid?: string;
}

/** Serialized node transform, visibility, metadata, and child hierarchy. */
export interface NodeJSON {
  /** Stable identifier supplied by the caller or generated for the node. */
  uuid: string;
  /** Runtime type label used by loaders, traversal, and serialization. */
  type: string;
  /** User-facing name used by lookup and animation binding paths. */
  name?: string;
  /** Whether traversal and rendering include this node. */
  visible?: false;
  /** Mutable application metadata copied into serialized output when JSON-safe. */
  userData?: Record<string, unknown>;
  /** Local position in node units. */
  position: [number, number, number];
  /** Quaternion rotation synchronized with the node Euler angles. */
  quaternion: [number, number, number, number];
  /** Local scale along each axis. */
  scale: [number, number, number];
  /** Local up direction used by `lookAt`. */
  up: [number, number, number];
  /** Optional local pivot applied when composing the matrix. */
  pivot?: [number, number, number];
  /** Ordered child nodes attached beneath this node. */
  children?: NodeJSON[];
}

/** Base scene graph node with transform, hierarchy, and traversal. */
export class Node extends EventDispatcher {
  /** Monotonic numeric identifier assigned when the node is constructed. */
  id: number = _nodeId++;
  /** Stable identifier supplied by the caller or generated for the node. */
  readonly uuid: string;

  /** User-facing name used by lookup and animation binding paths. */
  name: string = "";

  /** Runtime type label used by loaders, traversal, and serialization. */
  type: string = "Node";

  /** Parent node, or `undefined` for a detached root. */
  parent: Node | undefined = undefined;

  /** Ordered child nodes attached beneath this node. */
  children: Node[] = [];

  /** Local position in node units. */
  position: Vector3 = new Vector3();
  /** Local up direction used by `lookAt`. */
  up: Vector3 = new Vector3(0, 1, 0);
  /** Optional local pivot applied when composing the matrix. */
  pivot: Vector3 | undefined = undefined;
  #rotation: Euler = new Euler();
  #quaternion: Quaternion = new Quaternion();
  /** Local scale along each axis. */
  scale: Vector3 = new Vector3(1, 1, 1);

  /** Local transform matrix prepared by `updateMatrix`. */
  matrix: Matrix4 = new Matrix4();
  /** World transform matrix prepared by `updateMatrixWorld`. */
  matrixWorld: Matrix4 = new Matrix4();
  #matrixAutoUpdate = true;
  /** Whether descendant world matrices are updated during traversal. */
  matrixWorldAutoUpdate: boolean = true;

  /** Dirty flag indicating that the world matrix must be recomputed. */
  matrixWorldNeedsUpdate: boolean = true;

  /** Whether traversal and rendering include this node. */
  visible: boolean = true;
  /** Whether render traversal may cull this node against the camera frustum. */
  frustumCulled: boolean = true;
  /** Bit mask used to filter rendering and picking. */
  layers: Layers = new Layers();

  /** Mutable application metadata copied into serialized output when JSON-safe. */
  userData: Record<string, unknown> = {};

  #lastPosX = 0;
  #lastPosY = 0;
  #lastPosZ = 0;
  #lastQuatX = 0;
  #lastQuatY = 0;
  #lastQuatZ = 0;
  #lastQuatW = 1;
  #lastScaleX = 1;
  #lastScaleY = 1;
  #lastScaleZ = 1;
  #lastPivotX = 0;
  #lastPivotY = 0;
  #lastPivotZ = 0;
  #hadPivot = false;
  #localIsIdentity = false;

  /** Creates a node with an optional stable UUID and identity transform. */
  constructor({ uuid = crypto.randomUUID() }: NodeOptions = {}) {
    super();
    this.uuid = uuid;
    this.#rotation.setOnChangeCallback(() => {
      this.#quaternion.setFromEuler(this.#rotation);
    });
    this.updateMatrix();
  }

  /** Euler rotation synchronized with the node quaternion. */
  get rotation(): Euler {
    return this.#rotation;
  }

  /** Copies an Euler rotation and updates the synchronized quaternion. */
  set rotation(value: Euler) {
    this.#rotation.copy(value);
  }

  /** Quaternion rotation synchronized with the node Euler angles. */
  get quaternion(): Quaternion {
    return this.#quaternion;
  }

  /** Copies a quaternion and updates the synchronized Euler angles. */
  set quaternion(value: Quaternion) {
    this.#quaternion.copy(value);
    this.#rotation.setFromQuaternion(this.#quaternion);
  }

  /** Whether local transform changes are folded into `matrix` on world updates. */
  get matrixAutoUpdate(): boolean {
    return this.#matrixAutoUpdate;
  }

  /** Enables or disables local transform change detection. */
  set matrixAutoUpdate(value: boolean) {
    this.#matrixAutoUpdate = value;
  }

  /** Reparents each object under this node and preserves insertion order. */
  add(...objects: Node[]): this {
    for (const object of objects) {
      if (object === this) continue;

      object.parent?.remove(object);
      object.parent = this;
      this.children.push(object);
      // Parent transform now applies - world matrix must be recomputed.
      object.matrixWorldNeedsUpdate = true;
    }

    return this;
  }

  /** Detaches the supplied children and marks their world matrices dirty. */
  remove(...objects: Node[]): this {
    for (const object of objects) {
      const index = this.children.indexOf(object);
      if (index !== -1) {
        object.parent = undefined;
        object.matrixWorldNeedsUpdate = true;
        this.children.splice(index, 1);
      }
    }
    return this;
  }

  /** Detaches every child and marks each world matrix dirty. */
  clear(): this {
    for (const child of this.children) {
      child.parent = undefined;
      child.matrixWorldNeedsUpdate = true;
    }
    this.children.length = 0;
    return this;
  }

  /** Detaches this node from its current parent, if any. */
  removeFromParent(): this {
    this.parent?.remove(this);
    return this;
  }

  /** Reparents an object while preserving its prepared world transform. */
  attach(object: Node): this {
    _m1.copy(this.matrixWorld).invert().multiply(object.matrixWorld);
    _m1.decompose(object.position, object.quaternion, object.scale);
    object.rotation.setFromQuaternion(object.quaternion);
    this.add(object);
    object.updateMatrix();
    return this;
  }

  /** Visits this node and every descendant in parent-before-child order. */
  traverse(callback: (node: Node) => void): void {
    callback(this);
    for (const child of this.children) {
      child.traverse(callback);
    }
  }

  /** Visits this node’s visible subtree in parent-before-child order. */
  traverseVisible(callback: (node: Node) => void): void {
    if (!this.visible) return;
    callback(this);
    for (const child of this.children) {
      child.traverseVisible(callback);
    }
  }

  /** Visits ancestors from the immediate parent toward the root. */
  traverseAncestors(callback: (node: Node) => void): void {
    let ancestor = this.parent;
    while (ancestor) {
      callback(ancestor);
      ancestor = ancestor.parent;
    }
  }

  /** Returns the first descendant whose numeric `id` equals `id`. */
  getObjectById(id: number): Node | undefined {
    return this.getObjectByProperty("id", id);
  }

  /** Returns the first descendant whose `name` equals `name`. */
  getObjectByName(name: string): Node | undefined {
    return this.getObjectByProperty("name", name);
  }

  /** Returns the first descendant whose selected property equals `value`. */
  getObjectByProperty<K extends keyof Node>(
    property: K,
    value: Node[K],
  ): Node | undefined {
    if (this[property] === value) return this;
    let match: Node | undefined;
    for (const child of this.children) {
      match = child.getObjectByProperty(property, value);
      if (match) break;
    }
    return match;
  }

  /** Appends every descendant whose selected property equals `value` to `result`. */
  getObjectsByProperty<K extends keyof Node>(
    property: K,
    value: Node[K],
    result: Node[] = [],
  ): Node[] {
    if (this[property] === value) result.push(this);
    for (const child of this.children) {
      child.getObjectsByProperty(property, value, result);
    }
    return result;
  }

  /** Premultiplies the local transform by `matrix` and decomposes the result. */
  applyMatrix4(matrix: Matrix4): this {
    if (this.matrixAutoUpdate) this.updateMatrix();
    this.matrix.multiplyMatrices(matrix, this.matrix);
    this.matrix.decompose(this.position, this.quaternion, this.scale);
    this.rotation.setFromQuaternion(this.quaternion);
    this.matrixWorldNeedsUpdate = true;
    this.#syncLocalCache();
    return this;
  }

  /** Premultiplies the node rotation by `quaternion`. */
  applyQuaternion(quaternion: Quaternion): this {
    this.quaternion.premultiply(quaternion);
    this.rotation.setFromQuaternion(this.quaternion);
    this.matrixWorldNeedsUpdate = true;
    return this;
  }

  /** Sets rotation from an axis and angle in radians. */
  setRotationFromAxisAngle(axis: Vector3, angle: number): this {
    this.quaternion.setFromAxisAngle(axis, angle);
    this.rotation.setFromQuaternion(this.quaternion);
    this.matrixWorldNeedsUpdate = true;
    return this;
  }

  /** Copies Euler rotation values into the synchronized quaternion. */
  setRotationFromEuler(euler: Euler): this {
    this.quaternion.setFromEuler(euler);
    this.rotation.copy(euler);
    this.matrixWorldNeedsUpdate = true;
    return this;
  }

  /** Extracts rotation from `matrix` and synchronizes both rotation forms. */
  setRotationFromMatrix(matrix: Matrix4): this {
    this.quaternion.setFromRotationMatrix(matrix);
    this.rotation.setFromQuaternion(this.quaternion);
    this.matrixWorldNeedsUpdate = true;
    return this;
  }

  /** Copies quaternion rotation values and synchronizes Euler angles. */
  setRotationFromQuaternion(quaternion: Quaternion): this {
    this.quaternion = quaternion;
    this.matrixWorldNeedsUpdate = true;
    return this;
  }

  /** Rotates around a local axis by an angle in radians. */
  rotateOnAxis(axis: Vector3, angle: number): this {
    _q1.setFromAxisAngle(axis, angle).premultiply(this.quaternion);
    this.quaternion = _q1;
    this.matrixWorldNeedsUpdate = true;
    return this;
  }

  /** Rotates around a world-space axis by an angle in radians. */
  rotateOnWorldAxis(axis: Vector3, angle: number): this {
    _q1.setFromAxisAngle(axis, angle);
    return this.applyQuaternion(_q1);
  }

  /** Rotates around the local x axis by an angle in radians. */
  rotateX(angle: number): this {
    return this.rotateOnAxis(_xAxis, angle);
  }

  /** Rotates around the local y axis by an angle in radians. */
  rotateY(angle: number): this {
    return this.rotateOnAxis(_yAxis, angle);
  }

  /** Rotates around the local z axis by an angle in radians. */
  rotateZ(angle: number): this {
    return this.rotateOnAxis(_zAxis, angle);
  }

  /** Moves along an axis expressed in the node’s rotated local frame. */
  translateOnAxis(axis: Vector3, distance: number): this {
    _v1.copy(axis).applyQuaternion(this.quaternion);
    this.position.x += _v1.x * distance;
    this.position.y += _v1.y * distance;
    this.position.z += _v1.z * distance;
    this.matrixWorldNeedsUpdate = true;
    return this;
  }

  /** Moves along the local x axis by a distance in node units. */
  translateX(distance: number): this {
    return this.translateOnAxis(_xAxis, distance);
  }

  /** Moves along the local y axis by a distance in node units. */
  translateY(distance: number): this {
    return this.translateOnAxis(_yAxis, distance);
  }

  /** Moves along the local z axis by a distance in node units. */
  translateZ(distance: number): this {
    return this.translateOnAxis(_zAxis, distance);
  }

  /** Transforms `vector` from local space to world space in place. */
  localToWorld(vector: Vector3): Vector3 {
    return vector.applyMatrix4(this.matrixWorld);
  }

  /** Transforms `vector` from world space to local space in place. */
  worldToLocal(vector: Vector3): Vector3 {
    return vector.applyMatrix4(_m1.copy(this.matrixWorld).invert());
  }

  /** Writes the prepared world position into `target`. */
  getWorldPosition(target: Vector3): Vector3 {
    this.matrixWorld.extractPosition(target);
    return target;
  }

  /** Writes the prepared world rotation into `target`. */
  getWorldQuaternion(target: Quaternion): Quaternion {
    this.matrixWorld.decompose(_position, target, _v1);
    return target;
  }

  /** Writes the prepared world scale into `target`. */
  getWorldScale(target: Vector3): Vector3 {
    this.matrixWorld.extractScale(target);
    return target;
  }

  /** Writes the node’s local positive-Z world direction into `target`. */
  getWorldDirection(target: Vector3): Vector3 {
    const elements = this.matrixWorld.elements;
    return target.set(elements[8], elements[9], elements[10]).normalize();
  }

  /** Serializes transform, visibility, metadata, and child hierarchy. */
  toJSON(): NodeJSON {
    const json: NodeJSON = {
      uuid: this.uuid,
      type: this.type,
      position: [this.position.x, this.position.y, this.position.z],
      quaternion: [
        this.quaternion.x,
        this.quaternion.y,
        this.quaternion.z,
        this.quaternion.w,
      ],
      scale: [this.scale.x, this.scale.y, this.scale.z],
      up: [this.up.x, this.up.y, this.up.z],
    };
    if (this.name !== "") json.name = this.name;
    if (!this.visible) json.visible = false;
    if (Object.keys(this.userData).length > 0) {
      const serializedUserData = JSON.stringify(
        this.userData,
        rejectNonFiniteJSONNumber,
      );
      json.userData = JSON.parse(serializedUserData) as Record<string, unknown>;
    }
    if (this.pivot) {
      json.pivot = [this.pivot.x, this.pivot.y, this.pivot.z];
    }
    if (this.children.length > 0) {
      json.children = this.children.map((child) => child.toJSON());
    }
    assertFiniteJSONValue(json, `${this.type}.toJSON()`);
    return json;
  }

  /** Rotates the node to face a world-space target, accepting vector or coordinates. */
  lookAt(target: Vector3 | number, y?: number, z?: number): this {
    const targetVector =
      target instanceof Vector3 ? target : new Vector3(target, y, z);

    _position.setFromMatrixPosition(this.matrixWorld);

    if (typeof this.type === "string" && this.type.endsWith("Camera")) {
      _m1.lookAt(_position, targetVector, this.up);
    } else {
      _m1.lookAt(targetVector, _position, this.up);
    }

    this.quaternion.setFromRotationMatrix(_m1);

    if (this.parent) {
      _m1.extractRotation(this.parent.matrixWorld);
      _q1.setFromRotationMatrix(_m1);
      this.quaternion.premultiply(_q1.invert());
    }

    this.rotation.setFromQuaternion(this.quaternion);

    return this;
  }

  /** Composes the local matrix from position, rotation, scale, and pivot. */
  updateMatrix(): void {
    this.matrix.compose(this.position, this.quaternion, this.scale);
    const pivot = this.pivot;
    if (pivot) {
      const elements = this.matrix.elements;
      const { x, y, z } = pivot;
      elements[12] += x - elements[0] * x - elements[4] * y - elements[8] * z;
      elements[13] += y - elements[1] * x - elements[5] * y - elements[9] * z;
      elements[14] += z - elements[2] * x - elements[6] * y - elements[10] * z;
    }
    // Local matrix changed -  world matrix is now stale.
    this.matrixWorldNeedsUpdate = true;
    this.#syncLocalCache();
  }

  #syncLocalCache(): void {
    const pos = this.position;
    const q = this.quaternion;
    const s = this.scale;
    this.#lastPosX = pos.x;
    this.#lastPosY = pos.y;
    this.#lastPosZ = pos.z;
    this.#lastQuatX = q.x;
    this.#lastQuatY = q.y;
    this.#lastQuatZ = q.z;
    this.#lastQuatW = q.w;
    this.#lastScaleX = s.x;
    this.#lastScaleY = s.y;
    this.#lastScaleZ = s.z;
    const pivot = this.pivot;
    this.#hadPivot = pivot !== undefined;
    this.#lastPivotX = pivot?.x ?? 0;
    this.#lastPivotY = pivot?.y ?? 0;
    this.#lastPivotZ = pivot?.z ?? 0;
    this.#localIsIdentity =
      this.#lastPosX === 0 &&
      this.#lastPosY === 0 &&
      this.#lastPosZ === 0 &&
      this.#lastQuatX === 0 &&
      this.#lastQuatY === 0 &&
      this.#lastQuatZ === 0 &&
      this.#lastQuatW === 1 &&
      this.#lastScaleX === 1 &&
      this.#lastScaleY === 1 &&
      this.#lastScaleZ === 1;
  }

  #updateLocalMatrixIfNeeded(): void {
    if (!this.matrixAutoUpdate) return;
    const pos = this.position;
    const q = this.quaternion;
    const s = this.scale;
    if (
      pos.x !== this.#lastPosX ||
      pos.y !== this.#lastPosY ||
      pos.z !== this.#lastPosZ ||
      q.x !== this.#lastQuatX ||
      q.y !== this.#lastQuatY ||
      q.z !== this.#lastQuatZ ||
      q.w !== this.#lastQuatW ||
      s.x !== this.#lastScaleX ||
      s.y !== this.#lastScaleY ||
      s.z !== this.#lastScaleZ ||
      (this.pivot !== undefined) !== this.#hadPivot ||
      (this.pivot?.x ?? 0) !== this.#lastPivotX ||
      (this.pivot?.y ?? 0) !== this.#lastPivotY ||
      (this.pivot?.z ?? 0) !== this.#lastPivotZ
    ) {
      this.updateMatrix();
    }
  }

  /** Recomputes this world matrix and optionally propagates to descendants. */
  updateMatrixWorld(
    updateParents: boolean = false,
    updateChildren: boolean = true,
    force: boolean = false,
  ): void {
    if (updateParents && this.parent) {
      this.parent.updateMatrixWorld(true, false);
    }
    this.#updateLocalMatrixIfNeeded();

    const updated = this.matrixWorldNeedsUpdate || force;
    if (updated) {
      if (this.parent) {
        if (this.matrixAutoUpdate && this.#localIsIdentity) {
          // Common fast path: local transform is identity so world == parent world.
          this.matrixWorld.copy(this.parent.matrixWorld);
        } else {
          this.matrixWorld.multiplyMatricesAffine(
            this.parent.matrixWorld,
            this.matrix,
          );
        }
      } else {
        this.matrixWorld.copy(this.matrix);
      }

      if (!updateChildren) {
        // When not updating children immediately, mark them dirty so a later
        // updateMatrixWorld() call recomputes their world matrices.
        for (const child of this.children) {
          child.matrixWorldNeedsUpdate = true;
        }
      }

      this.matrixWorldNeedsUpdate = false;
    }

    if (updateChildren) {
      for (const child of this.children) {
        if (child.matrixWorldAutoUpdate) {
          child.updateMatrixWorld(false, true, updated);
        }
      }
    }
  }

  /** Returns a new node with copied transform, state, and optional descendants. */
  clone(): Node {
    return new Node().copy(this);
  }

  /** Copies transform, visibility, metadata, and optionally cloned descendants. */
  copy(source: Node, recursive: boolean = true): this {
    this.name = source.name;

    this.position.copy(source.position);
    this.up.copy(source.up);
    this.pivot = source.pivot?.clone();
    this.quaternion = source.quaternion;
    this.scale.copy(source.scale);

    this.matrix.copy(source.matrix);
    this.matrixWorld.copy(source.matrixWorld);
    this.matrixAutoUpdate = source.matrixAutoUpdate;
    this.matrixWorldAutoUpdate = source.matrixWorldAutoUpdate;

    this.visible = source.visible;
    this.frustumCulled = source.frustumCulled;
    this.userData = JSON.parse(JSON.stringify(source.userData));

    if (recursive) {
      for (const child of source.children) {
        this.add(child.clone());
      }
    }
    return this;
  }
}
