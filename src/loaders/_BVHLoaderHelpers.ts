import type { AnimationTrack } from "../animation/Track.ts";
import { QuaternionTrack } from "../animation/tracks/QuaternionTrack.ts";
import { VectorTrack } from "../animation/tracks/VectorTrack.ts";
import { AnimationClip } from "../animation/AnimationClip.ts";
import { Quaternion } from "../math/Quaternion.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Bone } from "../objects/Bone.ts";

import type { BVHChannel } from "./BVHLoader.ts";

/** One sampled BVH animation frame. */
export interface BVHFrame {
  /** Sample time in seconds. */
  time: number;
  /** Root or joint translation at this sample. */
  position: Vector3;
  /** Joint rotation at this sample. */
  rotation: Quaternion;
}

/** Hierarchical BVH joint and its sampled animation data. */
export interface BVHNode {
  /** Joint name from the BVH source. */
  name: string;
  /** BVH node kind. */
  type: "ROOT" | "JOINT" | "ENDSITE";
  /** Local rest-pose offset. */
  offset: Vector3;
  /** Ordered motion channels. */
  channels: BVHChannel[];
  /** Child joints in source order. */
  children: BVHNode[];
  /** Samples associated with this joint. */
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

const WHITESPACE = /\s+/u;
const LINE_BREAK = /\r?\n/u;
const FRAMES_PATTERN = /^Frames\s*:\s*(?<count>\d+)$/iu;
const FRAME_TIME_PATTERN = /^Frame\s+time\s*:\s*(?<value>\S+)$/iu;

/** Cursor for consuming non-empty lines and motion tokens from BVH text. */
export class LineCursor {
  readonly #lines: string[];
  #index = 0;

  /** Splits BVH source text into lines for sequential parsing. */
  constructor(text: string) {
    this.#lines = text.split(LINE_BREAK);
  }

  /** Returns the next non-empty line or reports the missing section. */
  nextNonEmpty(section: string): string {
    while (this.#index < this.#lines.length) {
      const line = this.#lines[this.#index++]?.trim() ?? "";
      if (line.length > 0) return line;
    }
    throw new SyntaxError(`BVHLoader: ${section} is missing.`);
  }

  /** Returns all remaining non-empty lines split into whitespace tokens. */
  remainingTokens(): string[] {
    const tokens: string[] = [];
    while (this.#index < this.#lines.length) {
      const line = this.#lines[this.#index++]?.trim() ?? "";
      if (line.length > 0) tokens.push(...line.split(WHITESPACE));
    }
    return tokens;
  }
}

/** Verifies that a BVH section marker matches the expected keyword. */
export function expectSection(value: string, expected: string): void {
  if (value.toUpperCase() !== expected) {
    throw new SyntaxError(`BVHLoader: ${expected} expected.`);
  }
}

interface NodeHeader {
  name: string;
  type: "ROOT" | "JOINT" | "ENDSITE";
  isEndSite: boolean;
}

function parseNodeHeader(firstLine: string, isRoot: boolean): NodeHeader {
  const tokens = firstLine.split(WHITESPACE);
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
  const name = isEndSite ? "ENDSITE" : (tokens[1] ?? "");
  return { name, type: type as "ROOT" | "JOINT" | "ENDSITE", isEndSite };
}

function parseNodeOffset(cursor: LineCursor, node: BVHNode): void {
  const offsetTokens = cursor.nextNonEmpty("OFFSET").split(WHITESPACE);
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
}

function parseNodeChannels(cursor: LineCursor, node: BVHNode): void {
  const channelTokens = cursor.nextNonEmpty("CHANNELS").split(WHITESPACE);
  if (channelTokens[0]?.toUpperCase() !== "CHANNELS") {
    throw new SyntaxError("BVHLoader: CHANNELS expected after OFFSET.");
  }
  const channelCount = integer(channelTokens[1], "CHANNELS count");
  if (channelCount < 0 || channelTokens.length !== channelCount + 2) {
    throw new SyntaxError("BVHLoader: CHANNELS count does not match values.");
  }
  for (let index = 0; index < channelCount; index++) {
    const token = channelTokens[index + 2] ?? "";
    node.channels.push(parseChannel(token));
  }
}

function readChildNodes(
  cursor: LineCursor,
  node: BVHNode,
  nodes: BVHNode[],
): void {
  for (;;) {
    const line = cursor.nextNonEmpty("node child or closing brace");
    if (line === "}") return;
    const childTokens = line.split(WHITESPACE);
    const childType = childTokens[0]?.toUpperCase();
    if (childType !== "JOINT" && childType !== "END") {
      throw new SyntaxError(`BVHLoader: Unexpected node declaration ${line}.`);
    }
    node.children.push(readNode(cursor, line, nodes, false));
  }
}

/** Parses one BVH hierarchy node and appends it to the flat node list. */
export function readNode(
  cursor: LineCursor,
  firstLine: string,
  nodes: BVHNode[],
  isRoot: boolean,
): BVHNode {
  const header = parseNodeHeader(firstLine, isRoot);
  const node: BVHNode = {
    name: header.name,
    type: header.type,
    offset: new Vector3(),
    channels: [],
    children: [],
    frames: [],
  };
  nodes.push(node);
  expectSection(cursor.nextNonEmpty("opening brace"), "{");
  parseNodeOffset(cursor, node);
  if (node.type === "ENDSITE") {
    expectSection(cursor.nextNonEmpty("closing brace"), "}");
    return node;
  }
  parseNodeChannels(cursor, node);
  readChildNodes(cursor, node, nodes);
  return node;
}

/** Reads the declared number of motion frames from a BVH header line. */
export function readFrameCount(line: string): number {
  const match = FRAMES_PATTERN.exec(line);
  if (!match) throw new SyntaxError("BVHLoader: Frames count expected.");
  const groups = match.groups as { count?: string } | undefined;
  if (!groups) throw new SyntaxError("BVHLoader: Frames count expected.");
  return integer(groups.count, "Frames count");
}

/** Reads and validates the non-negative duration of one BVH frame. */
export function readFrameTime(line: string): number {
  const match = FRAME_TIME_PATTERN.exec(line);
  if (!match) throw new SyntaxError("BVHLoader: Frame Time expected.");
  const groups = match.groups as { value?: string } | undefined;
  if (!groups) throw new SyntaxError("BVHLoader: Frame Time expected.");
  const value = finiteNumber(groups.value, "Frame Time");
  if (value < 0)
    throw new RangeError("BVHLoader: Frame Time must be non-negative.");
  return value;
}

/** Decodes frame channel values into sampled transforms for each BVH node. */
export function readMotion(
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

function rotationAxis(channel: BVHChannel): Vector3 {
  if (channel === "Xrotation") return X_AXIS;
  if (channel === "Yrotation") return Y_AXIS;
  return Z_AXIS;
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
  const axis = rotationAxis(channel);
  rotation.multiply(
    new Quaternion().setFromAxisAngle(axis, (value * Math.PI) / 180),
  );
}

/** Builds the Bone hierarchy and records bones in traversal order. */
export function createBoneHierarchy(source: BVHNode, bones: Bone[]): Bone {
  const bone = new Bone();
  bone.name = source.name;
  bone.position.copy(source.offset);
  bones.push(bone);
  for (const child of source.children)
    bone.add(createBoneHierarchy(child, bones));
  return bone;
}

/** Creates position and rotation tracks from sampled BVH node frames. */
export function createAnimationClip(
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
