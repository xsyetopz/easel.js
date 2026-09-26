import { check } from "../_lib/oracle.ts";
import * as baseline from "./baseline.js";
import * as candidate from "./candidate.ts";

const C = "controls-camera";
const element = Object.assign(new EventTarget(), {
  style: {},
  setPointerCapture() {},
  releasePointerCapture() {},
}) as unknown as HTMLElement;
check(C, "three controls.object and EASEL controls.camera are the camera",
  baseline.run() && candidate.run(element));
