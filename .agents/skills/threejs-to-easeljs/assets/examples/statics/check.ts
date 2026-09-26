import { check } from "../_lib/oracle.ts";
import * as baseline from "./baseline.js";
import * as candidate from "./candidate.ts";

const C = "statics";
const three = baseline.run();
const easel = candidate.run();
check(C, "findByName finds the clip", three.found === easel.found,
  `three ${three.found}, easel ${easel.found}`);
check(C, "missing clip: three null, EASEL undefined",
  three.missing === null && easel.missing === undefined,
  `three ${three.missing}, easel ${easel.missing}`);
check(C, "DEFAULT_UP matches", three.up.join() === easel.up.join());
// EASEL writes extra fields (itemSize, interpolation, endings); compare the
// fields both formats share.
function shared(track: { name: string; times: unknown; values: unknown;
  type: string }): string {
  const { name, times, values, type } = track;
  return JSON.stringify({ name, times, values, type });
}
const threeTrack = shared(three.tracks[0]);
const first = easel.tracks?.[0];
const easelTrack = first === undefined ? "" : shared(first);
check(C, "clip JSON shared track fields match", threeTrack === easelTrack,
  `three ${threeTrack}, easel ${easelTrack}`);
