import type {
  GLTFAnimation,
  GLTFAnimationChannel,
  GLTFAnimationTarget,
} from "../GLTFLoader.ts";
import { array, integer, record } from "./validation.ts";

type AnimationSource = Readonly<{
  channels?: unknown;
  name?: unknown;
  samplers?: unknown;
}>;

type AnimationSampler = Readonly<{
  input?: unknown;
  interpolation?: unknown;
  output?: unknown;
}>;

type AnimationChannel = Readonly<{
  sampler?: unknown;
  target?: unknown;
}>;

type AnimationTarget = Readonly<{
  extensions?: unknown;
  node?: unknown;
  path?: unknown;
}>;

type AnimationExtensions = Readonly<{
  KHR_animation_pointer?: unknown;
}>;

type PointerExtension = Readonly<{
  pointer?: unknown;
}>;

function parseAnimationTarget(target: AnimationTarget): GLTFAnimationTarget {
  const path = String(target.path ?? "");
  const targetExtensions = target.extensions;
  const extensionRoot =
    targetExtensions === undefined
      ? undefined
      : (record(
          targetExtensions,
          "animation target.extensions",
        ) as AnimationExtensions);
  const pointerExtension = extensionRoot?.KHR_animation_pointer;
  if (path !== "pointer")
    return {
      node: integer(target.node, "animation target.node"),
      path,
    };
  if (pointerExtension === undefined)
    throw new TypeError(
      "GLTFLoader: animation target pointer extension is missing.",
    );
  const pointer = (
    record(
      pointerExtension,
      "animation target.extensions.KHR_animation_pointer",
    ) as PointerExtension
  ).pointer;
  if (
    typeof pointer !== "string" ||
    pointer.length === 0 ||
    !pointer.startsWith("/")
  ) {
    throw new TypeError(
      "GLTFLoader: animation pointer must be a non-empty JSON pointer.",
    );
  }
  return { path, pointer };
}

function parseAnimationChannel(options: {
  item: unknown;
  animationIndex: number;
  channelIndex: number;
  samplers: readonly AnimationSampler[];
  readAccessor: (index: number) => number[];
}): GLTFAnimationChannel {
  const { item, animationIndex, channelIndex, samplers, readAccessor } =
    options;
  const channel = record(
    item,
    `animations[${animationIndex}].channels[${channelIndex}]`,
  ) as AnimationChannel;
  const target = record(channel.target, "animation target") as AnimationTarget;
  const samplerIndex = integer(channel.sampler, "animation sampler index");
  const sampler = samplers[samplerIndex];
  if (!sampler)
    throw new RangeError("GLTFLoader: animation sampler is missing.");
  const interpolation =
    sampler.interpolation === "STEP" || sampler.interpolation === "CUBICSPLINE"
      ? sampler.interpolation
      : "LINEAR";
  return {
    target: parseAnimationTarget(target),
    interpolation,
    times: readAccessor(integer(sampler.input, "animation sampler.input")),
    values: readAccessor(integer(sampler.output, "animation sampler.output")),
  };
}

function parseAnimation(
  value: unknown,
  index: number,
  readAccessor: (index: number) => number[],
): GLTFAnimation {
  const source = record(value, `animations[${index}]`) as AnimationSource;
  const samplers = array(
    source.samplers ?? [],
    `animations[${index}].samplers`,
  ).map((item) => record(item, "animation sampler") as AnimationSampler);
  const channels = array(
    source.channels ?? [],
    `animations[${index}].channels`,
  ).map((item, channelIndex) =>
    parseAnimationChannel({
      item,
      animationIndex: index,
      channelIndex,
      samplers,
      readAccessor,
    }),
  );
  return {
    name:
      typeof source.name === "string"
        ? (source.name as string)
        : `Animation${index}`,
    channels,
  };
}

/** Parses animation samplers and channels, including JSON-pointer targets. */
export function parseAnimations(
  document: Readonly<Record<string, unknown>>,
  readAccessor: (index: number) => number[],
): GLTFAnimation[] {
  const animationDocument = document as Readonly<{ animations?: unknown }>;
  return array(animationDocument.animations ?? [], "animations").map(
    (value, index) => parseAnimation(value, index, readAccessor),
  );
}
