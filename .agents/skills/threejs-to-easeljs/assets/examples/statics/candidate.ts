// EASEL 0.7.0: statics are standalone exported functions and constants.
import {
  AnimationClip,
  animationClipToJSON,
  DEFAULT_UP,
  findByName,
  NumberTrack,
} from "@xsyetopz/easel";

export function run() {
  const walk = new AnimationClip("Walk", 1, [
    new NumberTrack(".position[x]", [0, 1], [0, 2]),
  ]);
  const idle = new AnimationClip("Idle", 1, []);
  const found = findByName([idle, walk], "Walk");
  const missing = findByName([idle, walk], "Run");
  return {
    found: found?.name,
    missing,
    up: DEFAULT_UP.toArray(),
    tracks: animationClipToJSON(walk).tracks,
  };
}
