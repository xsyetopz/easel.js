import type { GLTFAnimation, GLTFAnimationChannel } from "../GLTFLoader.ts";
import { array, integer, record } from "./validation.ts";

export function parseAnimations(
  document: Readonly<Record<string, unknown>>,
  readAccessor: (index: number) => number[],
): GLTFAnimation[] {
  return array(document["animations"] ?? [], "animations").map(
    (value, index) => {
      const source = record(value, `animations[${index}]`);
      const samplers = array(
        source["samplers"] ?? [],
        `animations[${index}].samplers`,
      ).map((item) => record(item, "animation sampler"));
      const channels = array(
        source["channels"] ?? [],
        `animations[${index}].channels`,
      ).map((item, channelIndex) => {
        const channel = record(
          item,
          `animations[${index}].channels[${channelIndex}]`,
        );
        const target = record(channel["target"], "animation target");
        const samplerIndex = integer(
          channel["sampler"],
          "animation sampler index",
        );
        const sampler = samplers[samplerIndex];
        if (!sampler)
          throw new RangeError("GLTFLoader: animation sampler is missing.");
        const interpolation =
          sampler["interpolation"] === "STEP" ||
          sampler["interpolation"] === "CUBICSPLINE"
            ? sampler["interpolation"]
            : "LINEAR";
        const path = String(target["path"] ?? "");
        const targetExtensions = target["extensions"];
        const extensionRoot =
          targetExtensions === undefined
            ? undefined
            : record(targetExtensions, "animation target.extensions");
        const pointerExtension = extensionRoot?.["KHR_animation_pointer"];
        if (path === "pointer") {
          if (pointerExtension === undefined)
            throw new TypeError(
              "GLTFLoader: animation target pointer extension is missing.",
            );
          const pointer = record(
            pointerExtension,
            "animation target.extensions.KHR_animation_pointer",
          )["pointer"];
          if (
            typeof pointer !== "string" ||
            pointer.length === 0 ||
            !pointer.startsWith("/")
          ) {
            throw new TypeError(
              "GLTFLoader: animation pointer must be a non-empty JSON pointer.",
            );
          }
          return {
            target: { path, pointer },
            interpolation,
            times: readAccessor(
              integer(sampler["input"], "animation sampler.input"),
            ),
            values: readAccessor(
              integer(sampler["output"], "animation sampler.output"),
            ),
          } satisfies GLTFAnimationChannel;
        }
        return {
          target: {
            node: integer(target["node"], "animation target.node"),
            path,
          },
          interpolation,
          times: readAccessor(
            integer(sampler["input"], "animation sampler.input"),
          ),
          values: readAccessor(
            integer(sampler["output"], "animation sampler.output"),
          ),
        } satisfies GLTFAnimationChannel;
      });
      return {
        name:
          typeof source["name"] === "string"
            ? (source["name"] as string)
            : `Animation${index}`,
        channels,
      } satisfies GLTFAnimation;
    },
  );
}
