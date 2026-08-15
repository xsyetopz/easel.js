import type { Node } from "../core/Node.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { Bone } from "../objects/Bone.ts";
import { Skeleton } from "../objects/Skeleton.ts";
import { SkinnedMesh } from "../objects/SkinnedMesh.ts";
import {
  isRecord,
  type ObjectRecord,
  optionalString,
} from "./_ObjectLoaderHelpers.ts";

/** Parses skeleton data from JSON, resolving bone references. */
export function parseSkeletonRecords(
  json: ObjectRecord,
  bones: unknown,
): Map<string, Skeleton> {
  const skeletons = new Map<string, Skeleton>();
  const list = json.skeletons;
  if (list === undefined) return skeletons;
  if (!Array.isArray(list)) {
    throw new TypeError("ObjectLoader: skeletons must be an array.");
  }
  if (!Array.isArray(bones)) {
    console.warn(
      "ObjectLoader: bones must be an array, skipping skeleton parsing.",
    );
    return skeletons;
  }
  const boneMap = collectBoneMap(bones);
  if (boneMap.size === 0) {
    console.warn("ObjectLoader: no bones available for skeleton parsing.");
    return skeletons;
  }
  for (const entry of list) {
    if (!isRecord(entry)) {
      throw new TypeError("ObjectLoader: each skeleton must be a record.");
    }
    const skeleton = parseSkeleton(entry, boneMap);
    if (skeleton !== undefined) skeletons.set(skeleton[0], skeleton[1]);
  }
  return skeletons;
}

function collectBoneMap(bones: unknown[]): Map<string, Bone> {
  const boneMap = new Map<string, Bone>();
  for (const bone of bones) {
    if (bone instanceof Bone) boneMap.set(bone.uuid, bone);
  }
  return boneMap;
}

function parseSkeleton(
  entry: ObjectRecord,
  boneMap: Map<string, Bone>,
): [string, Skeleton] | undefined {
  const uuid = optionalString(entry, "uuid", "");
  if (uuid === "") {
    console.warn("ObjectLoader: skeleton entry missing uuid, skipping.");
    return;
  }
  const boneUuids = entry.bones;
  if (!Array.isArray(boneUuids)) {
    console.warn("ObjectLoader: skeleton bones must be an array, skipping.");
    return;
  }
  const skeletonBones = boneUuids
    .filter((boneUuid): boneUuid is string => typeof boneUuid === "string")
    .map((boneUuid) => boneMap.get(boneUuid))
    .filter((bone): bone is Bone => bone !== undefined);
  return [uuid, new Skeleton(skeletonBones, parseBoneInverses(entry))];
}

function parseBoneInverses(entry: ObjectRecord): Matrix4[] {
  const boneInverses = entry.boneInverses;
  if (!Array.isArray(boneInverses)) return [];
  return boneInverses.map(parseBoneInverse);
}

function parseBoneInverse(raw: unknown): Matrix4 {
  let elements: number[] | undefined;
  if (Array.isArray(raw)) {
    elements = raw as number[];
  } else if (isRecord(raw) && Array.isArray(raw.elements)) {
    elements = raw.elements as number[];
  }
  if (
    elements === undefined ||
    elements.length !== 16 ||
    elements.some(
      (value) => typeof value !== "number" || !Number.isFinite(value),
    )
  ) {
    throw new TypeError(
      "ObjectLoader: boneInverse must contain 16 finite numbers.",
    );
  }
  return new Matrix4().fromArray(elements);
}

/** Binds parsed skeletons to SkinnedMesh instances in the tree. */
export function bindSkeletonRecords(
  object: Node,
  skeletons: Map<string, Skeleton>,
): void {
  object.traverse((node) => {
    if (!(node instanceof SkinnedMesh)) return;
    const skeletonUuid = (node.userData as ObjectRecord).skeletonUuid;
    if (typeof skeletonUuid !== "string") return;
    const skeleton = skeletons.get(skeletonUuid);
    if (skeleton !== undefined) node.bind(skeleton);
  });
}
