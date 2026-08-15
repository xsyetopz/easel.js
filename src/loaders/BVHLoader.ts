import type { AnimationClip } from "../animation/AnimationClip.ts";
import type { Bone } from "../objects/Bone.ts";
import { Skeleton } from "../objects/Skeleton.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";
import type { LoadingManager } from "./LoadingManager.ts";
import {
  type BVHNode,
  createAnimationClip,
  createBoneHierarchy,
  expectSection,
  LineCursor,
  readFrameCount,
  readFrameTime,
  readMotion,
  readNode,
} from "./_BVHLoaderHelpers.ts";

const WHITESPACE = /\s+/u;

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
  override parse(text: string): BVHLoaderResult {
    if (typeof text !== "string") {
      throw new TypeError("BVHLoader.parse expects a text string.");
    }
    const cursor = new LineCursor(text);
    expectSection(cursor.nextNonEmpty("HIERARCHY"), "HIERARCHY");
    const sourceNodes: BVHNode[] = [];
    const rootLine = cursor.nextNonEmpty("ROOT");
    if (rootLine.split(WHITESPACE)[0]?.toUpperCase() !== "ROOT") {
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
