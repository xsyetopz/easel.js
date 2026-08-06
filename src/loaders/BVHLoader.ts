import { AnimationClip } from "../animation/AnimationClip.ts";
import type { AnimationTrack } from "../animation/Track.ts";
import { QuaternionTrack } from "../animation/tracks/QuaternionTrack.ts";
import { VectorTrack } from "../animation/tracks/VectorTrack.ts";
import { Quaternion } from "../math/Quaternion.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Bone } from "../objects/Bone.ts";
import { Skeleton } from "../objects/Skeleton.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";
import type { LoadingManager } from "./LoadingManager.ts";

/** BVH motion channel names understood by the CPU decoder. */
export type BVHChannel =
  | "Xposition"
  | "Yposition"
  | "Zposition"
  | "Xrotation"
  | "Yrotation"
  | "Zrotation";

/** Options controlling which BVH motion channels become animation tracks. */
export interface BVHLoaderOptions {
  /** Whether position channels become `VectorTrack` keyframes. */
  readonly animateBonePositions?: boolean;
  /** Whether rotation channels become `QuaternionTrack` keyframes. */
  readonly animateBoneRotations?: boolean;
}

/** Parsed BVH hierarchy and motion converted to EASEL CPU animation objects. */
export interface BVHLoaderResult {
  /** Skeleton containing the hierarchy's bones and inverse bind matrices. */
  readonly skeleton: Skeleton;
  /** Animation clip containing one position and/or quaternion track per joint. */
  readonly clip: AnimationClip;
  /** Root bone that owns the returned hierarchy. */
  readonly root: Bone;
  /** Pre-order bone list matching `skeleton.bones`. */
  readonly bones: readonly Bone[];
  /** Number of motion frames decoded from the source. */
  readonly frameCount: number;
  /** Duration of one motion frame in seconds. */
  readonly frameTime: number;
}

interface BVHFrame {
  time: number;
  position: Vector3;
  rotation: Quaternion;
}

interface BVHNode {
  name: string;
  type: "ROOT" | "JOINT" | "ENDSITE";
  offset: Vector3;
  channels: BVHChannel[];
  children: BVHNode[];
  frames: BVHFrame[];
}

const CHANNELS = new Set<BVHChannel>([
  "Xposition",
  "Yposition",
  "Zposition",
  "Xrotation",
  "Yrotation",
  "Zrotation",
]);

const X_AXIS = new Vector3(1, 0, 0);
const Y_AXIS = new Vector3(0, 1, 0);
const Z_AXIS = new Vector3(0, 0, 1);

/**
 * Loads Biovision Hierarchy files into EASEL `Bone`, `Skeleton`, and
 * `AnimationClip` objects. The parser and motion sampling are CPU-only and
 * preserve the hierarchy/channel order used by THREE's BVHLoader.
 */
export class BVHLoader extends Loader {
  /** Whether position channels are emitted as animation tracks. */
  animateBonePositions = true;
  /** Whether rotation channels are emitted as animation tracks. */
  animateBoneRotations = true;

  /**
   * Constructs a BVH loader with optional THREE-compatible animation options.
   *
   * @param manager Loading manager used by asynchronous file loads.
   * @param options Controls position and rotation track generation.
   */
  constructor(
    manager: LoadingManager | undefined = void 0,
    options: BVHLoaderOptions = {},
  ) {
    super(manager);
    if (options.animateBonePositions !== undefined) {
      this.animateBonePositions = options.animateBonePositions;
    }
    if (options.animateBoneRotations !== undefined) {
      this.animateBoneRotations = options.animateBoneRotations;
    }
  }

  /** Loads and parses a BVH text resource through the configured manager. */
  override load(
    url: string,
    onLoad?: (result: BVHLoaderResult) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (err: unknown) => void,
  ): void {
    const fileLoader = new FileLoader(this.manager);
    fileLoader.cache = this.cache;
    fileLoader.path = this.path;
    fileLoader.responseType = "text";
    fileLoader.requestHeader = this.requestHeader;
    fileLoader.withCredentials = this.withCredentials;
    fileLoader.load(
      url,
      (text) => {
        try {
          onLoad?.(this.parse(String(text)));
        } catch (error) {
          onError?.(error);
        }
      },
      onProgress,
      onError,
    );
  }

  /** Parses BVH hierarchy and motion text into CPU animation objects. */
  parse(text: string): BVHLoaderResult {
    if (typeof text !== "string") {
      throw new TypeError("BVHLoader.parse expects a text string.");
    }
    const cursor = new LineCursor(text);
    expectSection(cursor.nextNonEmpty("HIERARCHY"), "HIERARCHY");
    const sourceNodes: BVHNode[] = [];
    const rootLine = cursor.nextNonEmpty("ROOT");
    if (rootLine.split(/\s+/u)[0]?.toUpperCase() !== "ROOT") {
      throw new SyntaxError("BVHLoader: ROOT expected after HIERARCHY.");
    }
    const sourceRoot = readNode(cursor, rootLine, sourceNodes, true);
    expectSection(cursor.nextNonEmpty("MOTION"), "MOTION");
    const frameCount = readFrameCount(cursor.nextNonEmpty("Frames"));
    const frameTime = readFrameTime(cursor.nextNonEmpty("Frame Time"));
    readMotion(cursor.remainingTokens(), sourceNodes, frameCount, frameTime);

    const bones: Bone[] = [];
    const root = createBoneHierarchy(sourceRoot, bones);
    root.updateMatrixWorld(false, true);
    const skeleton = new Skeleton(bones);
    const clip = createAnimationClip(
      sourceNodes,
      this.animateBonePositions,
      this.animateBoneRotations,
    );
    return {
      skeleton,
      clip,
      root,
      bones,
      frameCount,
      frameTime,
    };
  }
}

class LineCursor {
  readonly #lines: string[];
  #index = 0;

  constructor(text: string) {
    this.#lines = text.split(/\r?\n/u);
  }

  nextNonEmpty(section: string): string {
    while (this.#index < this.#lines.length) {
      const line = this.#lines[this.#index++]?.trim() ?? "";
      if (line.length > 0) return line;
    }
    throw new SyntaxError(`BVHLoader: ${section} is missing.`);
  }

  remainingTokens(): string[] {
    const tokens: string[] = [];
    while (this.#index < this.#lines.length) {
      const line = this.#lines[this.#index++]?.trim() ?? "";
      if (line.length > 0) tokens.push(...line.split(/\s+/u));
    }
    return tokens;
  }
}

function expectSection(value: string, expected: string): void {
  if (value.toUpperCase() !== expected) {
    throw new SyntaxError(`BVHLoader: ${expected} expected.`);
  }
}

function readNode(
  cursor: LineCursor,
  firstLine: string,
  nodes: BVHNode[],
  isRoot: boolean,
): BVHNode {
  const tokens = firstLine.split(/\s+/u);
  const first = tokens[0]?.toUpperCase();
  const isEndSite = first === "END" && tokens[1]?.toUpperCase() === "SITE";
  if (isEndSite && tokens.length !== 2) {
    throw new SyntaxError("BVHLoader: End Site has an invalid declaration.");
  }
  if (!isEndSite && tokens.length !== 2) {
    throw new SyntaxError("BVHLoader: Joint declaration is malformed.");
  }
  const type = isEndSite ? "ENDSITE" : first;
  if (type !== "ROOT" && type !== "JOINT" && type !== "ENDSITE") {
    throw new SyntaxError(
      `BVHLoader: Unsupported node type ${tokens[0] ?? ""}.`,
    );
  }
  if (isRoot && type !== "ROOT") {
    throw new SyntaxError("BVHLoader: ROOT expected after HIERARCHY.");
  }
  if (!isRoot && type === "ROOT") {
    throw new SyntaxError("BVHLoader: nested ROOT nodes are not supported.");
  }

  const node: BVHNode = {
    name: isEndSite ? "ENDSITE" : tokens[1]!,
    type,
    offset: new Vector3(),
    channels: [],
    children: [],
    frames: [],
  };
  nodes.push(node);
  expectSection(cursor.nextNonEmpty("opening brace"), "{");
  const offsetTokens = cursor.nextNonEmpty("OFFSET").split(/\s+/u);
  if (
    offsetTokens[0]?.toUpperCase() !== "OFFSET" ||
    offsetTokens.length !== 4
  ) {
    throw new SyntaxError("BVHLoader: OFFSET requires exactly three values.");
  }
  node.offset.set(
    finiteNumber(offsetTokens[1], "OFFSET x"),
    finiteNumber(offsetTokens[2], "OFFSET y"),
    finiteNumber(offsetTokens[3], "OFFSET z"),
  );
  if (node.type === "ENDSITE") {
    expectSection(cursor.nextNonEmpty("closing brace"), "}");
    return node;
  }

  const channelTokens = cursor.nextNonEmpty("CHANNELS").split(/\s+/u);
  if (channelTokens[0]?.toUpperCase() !== "CHANNELS") {
    throw new SyntaxError("BVHLoader: CHANNELS expected after OFFSET.");
  }
  const channelCount = integer(channelTokens[1], "CHANNELS count");
  if (channelCount < 0 || channelTokens.length !== channelCount + 2) {
    throw new SyntaxError("BVHLoader: CHANNELS count does not match values.");
  }
  for (let index = 0; index < channelCount; index++) {
    node.channels.push(parseChannel(channelTokens[index + 2]!));
  }

  while (true) {
    const line = cursor.nextNonEmpty("node child or closing brace");
    if (line === "}") return node;
    const childTokens = line.split(/\s+/u);
    const childType = childTokens[0]?.toUpperCase();
    if (childType !== "JOINT" && childType !== "END") {
      throw new SyntaxError(`BVHLoader: Unexpected node declaration ${line}.`);
    }
    node.children.push(readNode(cursor, line, nodes, false));
  }
}

function readFrameCount(line: string): number {
  const match = /^Frames\s*:\s*(\d+)$/iu.exec(line);
  if (!match) throw new SyntaxError("BVHLoader: Frames count expected.");
  return integer(match[1], "Frames count");
}

function readFrameTime(line: string): number {
  const match = /^Frame\s+Time\s*:\s*(\S+)$/iu.exec(line);
  if (!match) throw new SyntaxError("BVHLoader: Frame Time expected.");
  const value = finiteNumber(match[1], "Frame Time");
  if (value < 0)
    throw new RangeError("BVHLoader: Frame Time must be non-negative.");
  return value;
}

function readMotion(
  tokens: readonly string[],
  nodes: readonly BVHNode[],
  frameCount: number,
  frameTime: number,
): void {
  let channelCount = 0;
  for (const node of nodes) channelCount += node.channels.length;
  const expected = channelCount * frameCount;
  if (tokens.length !== expected) {
    throw new SyntaxError(
      `BVHLoader: expected ${expected} motion values but found ${tokens.length}.`,
    );
  }
  let offset = 0;
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    for (const node of nodes) {
      if (node.type === "ENDSITE") continue;
      const position = new Vector3();
      const rotation = new Quaternion();
      for (const channel of node.channels) {
        const value = finiteNumber(tokens[offset++], channel);
        applyChannel(channel, value, position, rotation);
      }
      node.frames.push({
        time: frameIndex * frameTime,
        position,
        rotation,
      });
    }
  }
}

function applyChannel(
  channel: BVHChannel,
  value: number,
  position: Vector3,
  rotation: Quaternion,
): void {
  if (channel === "Xposition") {
    position.x = value;
    return;
  }
  if (channel === "Yposition") {
    position.y = value;
    return;
  }
  if (channel === "Zposition") {
    position.z = value;
    return;
  }
  const axis =
    channel === "Xrotation"
      ? X_AXIS
      : channel === "Yrotation"
        ? Y_AXIS
        : Z_AXIS;
  rotation.multiply(
    new Quaternion().setFromAxisAngle(axis, (value * Math.PI) / 180),
  );
}

function createBoneHierarchy(source: BVHNode, bones: Bone[]): Bone {
  const bone = new Bone();
  bone.name = source.name;
  bone.position.copy(source.offset);
  bones.push(bone);
  for (const child of source.children)
    bone.add(createBoneHierarchy(child, bones));
  return bone;
}

function createAnimationClip(
  nodes: readonly BVHNode[],
  animatePositions: boolean,
  animateRotations: boolean,
): AnimationClip {
  const tracks: AnimationTrack[] = [];
  for (const node of nodes) {
    if (node.type === "ENDSITE") continue;
    const times = node.frames.map((frame) => frame.time);
    if (animatePositions) {
      const positions: number[] = [];
      for (const frame of node.frames) {
        positions.push(
          node.offset.x + frame.position.x,
          node.offset.y + frame.position.y,
          node.offset.z + frame.position.z,
        );
      }
      tracks.push(new VectorTrack(`${node.name}.position`, times, positions));
    }
    if (animateRotations) {
      const rotations: number[] = [];
      for (const frame of node.frames) {
        rotations.push(
          frame.rotation.x,
          frame.rotation.y,
          frame.rotation.z,
          frame.rotation.w,
        );
      }
      tracks.push(
        new QuaternionTrack(`${node.name}.quaternion`, times, rotations),
      );
    }
  }
  return new AnimationClip("animation", -1, tracks);
}

function parseChannel(value: string): BVHChannel {
  for (const channel of CHANNELS) {
    if (channel.toLowerCase() === value.toLowerCase()) return channel;
  }
  throw new SyntaxError(`BVHLoader: unsupported channel ${value}.`);
}

function finiteNumber(value: string | undefined, label: string): number {
  if (value === undefined || value.trim() === "") {
    throw new SyntaxError(`BVHLoader: ${label} is missing.`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new SyntaxError(`BVHLoader: ${label} must be finite.`);
  }
  return parsed;
}

function integer(value: string | undefined, label: string): number {
  const parsed = finiteNumber(value, label);
  if (!Number.isSafeInteger(parsed)) {
    throw new SyntaxError(`BVHLoader: ${label} must be an integer.`);
  }
  return parsed;
}
