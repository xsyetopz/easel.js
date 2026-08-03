import type { DocEntry } from "../types.ts";

export const animationDocs = [
  {
    id: "Animator",
    name: "Animator",
    category: "Animation",
    signature: "new Animator(root: Node)",
    description:
      "Manages AnimationActions on a root Node. Call update(delta) each frame to advance all enabled actions and apply blended property values.",
    properties: [
      {
        name: "root",
        type: "object",
        description: "The root Node passed at construction.",
      },
      {
        name: "time",
        type: "number",
        description: "Total accumulated time in seconds.",
      },
    ],
    methods: [
      {
        name: "clipAction",
        signature: "clipAction(clip: AnimationClip): AnimationAction",
        description:
          "Finds or creates an AnimationAction for the given clip and returns it.",
      },
      {
        name: "existingAction",
        signature:
          "existingAction(clip: AnimationClip): AnimationAction|undefined",
        description:
          "Returns an existing action without creating one, or undefined.",
      },
      {
        name: "update",
        signature: "update(delta: number): void",
        description:
          "Advances all enabled actions by delta seconds and applies the blended result to the scene graph.",
      },
      {
        name: "stopAllAction",
        signature: "stopAllAction(): void",
        description: "Stops and disables all actions.",
      },
      {
        name: "uncacheClip",
        signature: "uncacheClip(clip: AnimationClip): void",
        description: "Removes all actions and bindings for the given clip.",
      },
    ],
  },
  {
    id: "AnimationClip",
    name: "AnimationClip",
    category: "Animation",
    signature: "new AnimationClip(name?, duration?, tracks?)",
    description:
      "Named collection of keyframe tracks representing one animation sequence. Duration is auto-computed from tracks when passed as -1.",
    properties: [
      {
        name: "name",
        type: "string",
        description: "Clip name used for lookup.",
      },
      { name: "duration", type: "number", description: "Length in seconds." },
      {
        name: "tracks",
        type: "Track[]",
        description: "Keyframe tracks this clip contains.",
      },
    ],
    methods: [
      {
        name: "findByName",
        signature:
          "AnimationClip.findByName(clips: AnimationClip[], name: string): AnimationClip|undefined",
        description:
          "Static helper. Returns the first clip with the given name.",
      },
      {
        name: "resetDuration",
        signature: "resetDuration(): void",
        description:
          "Recomputes duration from the maximum keyframe time across all tracks.",
      },
      {
        name: "trim",
        signature: "trim(): void",
        description: "Removes keyframes outside [0, duration] from all tracks.",
      },
      {
        name: "optimize",
        signature: "optimize(): void",
        description:
          "Removes redundant keyframes where the value does not change from the previous key.",
      },
    ],
  },
  {
    id: "AnimationAction",
    name: "AnimationAction",
    category: "Animation",
    signature: "new AnimationAction(clip: AnimationClip, localRoot?)",
    description:
      "Playback state for a single AnimationClip. Controls play/stop, looping, weight, and cross-fading. Typically created via Animator.clipAction().",
    properties: [
      {
        name: "enabled",
        type: "boolean",
        description: "Whether this action is actively advancing. Default true.",
      },
      {
        name: "weight",
        type: "number",
        description: "Blend weight [0–1]. Default 1.",
      },
      {
        name: "timeScale",
        type: "number",
        description: "Playback rate multiplier. Default 1.",
      },
      {
        name: "time",
        type: "number",
        description: "Current playback position in seconds.",
      },
      {
        name: "loop",
        type: "number",
        description:
          "LoopOnce | LoopRepeat | LoopPingPong. Default LoopRepeat.",
      },
      {
        name: "repetitions",
        type: "number",
        description: "Maximum repetitions before stopping. Default Infinity.",
      },
      {
        name: "clampWhenFinished",
        type: "boolean",
        description:
          "When true and LoopOnce, the action freezes at the last frame instead of stopping. Default false.",
      },
      {
        name: "paused",
        type: "boolean",
        description:
          "Suspends time advancement without disabling the action. Default false.",
      },
      {
        name: "clip",
        type: "AnimationClip",
        description: "The clip this action plays.",
      },
    ],
    methods: [
      {
        name: "play",
        signature: "play(): this",
        description: "Enables the action.",
      },
      {
        name: "stop",
        signature: "stop(): this",
        description: "Disables the action and resets time to 0.",
      },
      {
        name: "reset",
        signature: "reset(): this",
        description: "Resets time to 0 and re-enables the action.",
      },
      {
        name: "setLoop",
        signature: "setLoop(mode: number, repetitions: number): this",
        description: "Sets the loop mode and repetition count.",
      },
      {
        name: "fadeIn",
        signature: "fadeIn(duration: number): this",
        description: "Animates weight from 0 to 1 over duration seconds.",
      },
      {
        name: "fadeOut",
        signature: "fadeOut(duration: number): this",
        description: "Animates weight from 1 to 0 over duration seconds.",
      },
      {
        name: "crossFadeFrom",
        signature:
          "crossFadeFrom(fadeOutAction: AnimationAction, duration: number): this",
        description: "Fades out another action while this one fades in.",
      },
    ],
  },
  {
    id: "Track",
    name: "Track",
    category: "Animation",
    signature:
      "new Track(name: string, times: Float32Array | number[], values: Float32Array | number[], itemSize?)",
    description:
      "Base keyframe track. Stores a flat sequence of timed values and linearly interpolates between keyframes. itemSize defines how many floats make up one keyframe value.",
    properties: [
      {
        name: "name",
        type: "string",
        description: 'Property path this track drives, e.g. "position.x".',
      },
      {
        name: "times",
        type: "Float32Array",
        description: "Keyframe timestamps in seconds.",
      },
      {
        name: "values",
        type: "Float32Array",
        description: "Flat keyframe values - itemSize floats per keyframe.",
      },
      {
        name: "itemSize",
        type: "number",
        description: "Number of floats per keyframe. Default 1.",
      },
    ],
    methods: [
      {
        name: "getValueAtTime",
        signature: "getValueAtTime(time: number): number[]",
        description:
          "Returns linearly interpolated values at the given time via binary search.",
      },
      {
        name: "interpolate",
        signature:
          "interpolate(index: number, t0: number, t: number, t1: number): number[]",
        description:
          "Linearly interpolates between keyframe at index and index+1.",
      },
    ],
  },
] satisfies DocEntry[];
