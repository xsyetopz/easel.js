import { AnimationClip } from "./AnimationClip.ts";
import type { Track } from "./Track.ts";

/** Extracts a portion of a clip between startFrame and endFrame. */
function subclip(
  clip: AnimationClip,
  name: string,
  startFrame: number,
  endFrame: number,
  fps = 30,
): AnimationClip {
  const startTime = startFrame / fps;
  const endTime = endFrame / fps;
  const duration = endTime - startTime;

  const newTracks: Track[] = [];
  for (const track of clip.tracks) {
    const times = track.times;
    const values = track.values;
    const size = track.itemSize;

    const newTimes: number[] = [];
    const newValues: number[] = [];

    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      if (t < startTime || t > endTime) continue;
      newTimes.push(t - startTime);
      for (let j = 0; j < size; j++) newValues.push(values[i * size + j]);
    }

    if (newTimes.length === 0) continue;

    const TrackCtor = track.constructor as new (
      name: string,
      times: Float32Array,
      values: Float32Array,
    ) => Track;
    newTracks.push(
      new TrackCtor(
        track.name,
        new Float32Array(newTimes),
        new Float32Array(newValues),
      ),
    );
  }

  return new AnimationClip(name, duration, newTracks);
}

/** Converts a clip to additive form by subtracting the reference pose. */
function makeClipAdditive(
  clip: AnimationClip,
  referenceFrame = 0,
  referenceClip: AnimationClip = clip,
): AnimationClip {
  const fps = 30;
  const referenceTime = referenceFrame / fps;

  for (const track of clip.tracks) {
    const refTrack = referenceClip.tracks.find((t) => t.name === track.name);
    if (!refTrack) continue;

    const refValues = refTrack.getValueAtTime(referenceTime);
    const values = track.values;
    const size = track.itemSize;

    for (let i = 0; i < track.times.length; i++) {
      for (let j = 0; j < size; j++) {
        values[i * size + j] -= refValues[j];
      }
    }
  }

  return clip;
}

/** Utility functions for clipping and modifying AnimationClips. */
export interface AnimationUtilsType {
  subclip(
    clip: AnimationClip,
    name: string,
    startFrame: number,
    endFrame: number,
    fps?: number,
  ): AnimationClip;
  makeClipAdditive(
    clip: AnimationClip,
    referenceFrame?: number,
    referenceClip?: AnimationClip,
  ): AnimationClip;
}

export const AnimationUtils: AnimationUtilsType = { subclip, makeClipAdditive };
