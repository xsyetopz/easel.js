import { Node } from "../core/Node.ts";
import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import { Color, type ColorValue } from "../math/Color.ts";
import { Bone } from "../objects/Bone.ts";
import { LineSegments } from "../objects/LineSegments.ts";

/** Canonical endpoint colors used by a SkeletonHelper. */
export interface SkeletonHelperColors {
  /** Color at the bone endpoint. */
  readonly bone: Color;
  /** Color at the parent-bone endpoint. */
  readonly parent: Color;
}

/** Accepted values for replacing SkeletonHelper endpoint colors. */
export interface SkeletonHelperColorValues {
  /** Color at the bone endpoint. */
  readonly bone: ColorValue;
  /** Color at the parent-bone endpoint. */
  readonly parent: ColorValue;
}

interface BoneSegment {
  readonly bone: Bone;
  readonly parent: Bone;
}

/**
 * Displays prepared bone world positions as CPU-rendered line segments.
 *
 * The helper snapshots the supplied bones and their direct Bone parents at
 * construction. `update()` reads those already-prepared world matrices only;
 * it never updates a bone hierarchy or aliases a root transform.
 */
export class SkeletonHelper extends LineSegments {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "SkeletonHelper";

  /** Returns `true` for this concrete type. */
  get isSkeletonHelper(): true {
    return true;
  }

  readonly #bones: readonly Bone[];
  readonly #segments: readonly BoneSegment[];
  readonly #colors: SkeletonHelperColors;
  #root: Node | undefined;

  /** Constructs line geometry from a construction-time bone snapshot. */
  constructor(bonesOrRoot: readonly Bone[] | Node) {
    const root = bonesOrRoot instanceof Node ? bonesOrRoot : undefined;
    const bones =
      root === undefined
        ? (bonesOrRoot as readonly Bone[])
        : collectBones(root);
    assertBones(bones);

    const snapshot = Object.freeze(bones.slice());
    const segments: BoneSegment[] = [];
    for (const bone of snapshot) {
      const parent = bone.parent;
      if (parent instanceof Bone) {
        segments.push({ bone, parent });
      }
    }

    const position = new Attribute(
      new Float32Array(segments.length * 2 * 3),
      3,
    );
    const color = new Attribute(new Float32Array(segments.length * 2 * 3), 3);
    writeDefaultColors(color.array as Float32Array, segments.length);

    const geometry = new Geometry();
    geometry.setAttribute("position", position);
    geometry.setAttribute("color", color);
    super(geometry, new LineMaterial({ color: 0xffffff }));

    this.#bones = snapshot;
    this.#segments = Object.freeze(segments);
    this.#root = root;
    this.#colors = {
      bone: new Color(0x0000ff),
      parent: new Color(0x00ff00),
    };
  }

  /** Bones captured at construction; update() does not rebuild this list. */
  get bones(): readonly Bone[] {
    return this.#bones;
  }

  /** Optional root object used to discover the construction-time bone list. */
  get root(): Node | undefined {
    return this.#root;
  }

  /** Mutable canonical colors for the bone and parent endpoints. */
  get colors(): SkeletonHelperColors {
    return this.#colors;
  }

  /** Replaces endpoint colors without writing geometry. */
  set colors(value: SkeletonHelperColorValues) {
    this.#colors.bone.set(value.bone);
    this.#colors.parent.set(value.parent);
  }

  /**
   * Publishes the current endpoint colors into the retained vertex storage.
   * Color assignment and direct Color mutation remain inert until this call.
   */
  updateColors(): this {
    const attribute = this.geometry?.getAttribute("color");
    if (!(attribute?.array instanceof Float32Array)) {
      throw new Error("SkeletonHelper color storage is unavailable.");
    }
    assertStorageLength(attribute, this.#segments.length * 6, "color");
    writeColors(
      attribute.array,
      this.#colors.bone,
      this.#colors.parent,
      this.#segments.length,
    );
    attribute.needsUpdate = true;
    return this;
  }

  /**
   * Publishes positions from caller-prepared bone world matrices.
   *
   * No matrix update, hierarchy traversal, temporary vectors, or typed-array
   * replacement occurs here.
   */
  update(): this {
    const attribute = this.geometry?.getAttribute("position");
    if (!(attribute?.array instanceof Float32Array)) {
      throw new Error("SkeletonHelper position storage is unavailable.");
    }
    assertStorageLength(attribute, this.#segments.length * 6, "position");
    const values = attribute.array;
    for (let i = 0; i < this.#segments.length; i++) {
      const { bone, parent } = this.#segments[i];
      const boneMatrix = bone.matrixWorld.elements;
      const parentMatrix = parent.matrixWorld.elements;
      const offset = i * 6;
      values[offset] = boneMatrix[12];
      values[offset + 1] = boneMatrix[13];
      values[offset + 2] = boneMatrix[14];
      values[offset + 3] = parentMatrix[12];
      values[offset + 4] = parentMatrix[13];
      values[offset + 5] = parentMatrix[14];
    }
    attribute.needsUpdate = true;
    return this;
  }

  /** Returns an independent helper retaining the same bone references. */
  override clone(): SkeletonHelper {
    return new SkeletonHelper(this.#root ?? this.bones).copy(this);
  }

  /** Copies transform, bone references, geometry, material, and color state. */
  override copy(source: SkeletonHelper): this {
    super.copy(source, false);
    this.#root = source.root;
    this.geometry = source.geometry?.clone();
    this.material = source.material?.clone();
    this.#colors.bone.copy(source.colors.bone);
    this.#colors.parent.copy(source.colors.parent);
    return this;
  }

  /** Releases owned geometry, materials, and CPU buffers. */
  dispose(): void {
    this.geometry?.dispose();
    this.material?.dispose();
  }
}

function assertBones(bones: readonly Bone[]): void {
  if (!Array.isArray(bones)) {
    throw new TypeError(
      "SkeletonHelper.bones must be an array of Bone objects.",
    );
  }

  const seen = new Set<Bone>();
  for (const bone of bones) {
    if (!(bone instanceof Bone)) {
      throw new TypeError(
        "SkeletonHelper.bones must contain only Bone objects.",
      );
    }
    if (seen.has(bone)) {
      throw new RangeError(
        "SkeletonHelper.bones must not contain duplicate bones.",
      );
    }
    seen.add(bone);
  }
}

function collectBones(root: Node): Bone[] {
  const bones: Bone[] = [];
  root.traverse((node) => {
    if (node instanceof Bone) bones.push(node);
  });
  return bones;
}

function writeDefaultColors(values: Float32Array, segmentCount: number): void {
  for (let i = 0; i < segmentCount; i++) {
    const offset = i * 6;
    values[offset] = 0;
    values[offset + 1] = 0;
    values[offset + 2] = 1;
    values[offset + 3] = 0;
    values[offset + 4] = 1;
    values[offset + 5] = 0;
  }
}

function writeColors(
  values: Float32Array,
  bone: Color,
  parent: Color,
  segmentCount: number,
): void {
  for (let i = 0; i < segmentCount; i++) {
    const offset = i * 6;
    values[offset] = bone.r;
    values[offset + 1] = bone.g;
    values[offset + 2] = bone.b;
    values[offset + 3] = parent.r;
    values[offset + 4] = parent.g;
    values[offset + 5] = parent.b;
  }
}

function assertStorageLength(
  attribute: Attribute,
  expectedLength: number,
  label: string,
): void {
  if (attribute.array.length !== expectedLength || attribute.itemSize !== 3) {
    throw new Error(`SkeletonHelper ${label} storage has an unexpected shape.`);
  }
}
