import { check } from "../_lib/oracle.ts";
import * as baseline from "./baseline.js";
import * as candidate from "./candidate.ts";
import * as silent from "./silent.ts";

const C = "update-matrix-world";
const three = baseline.run();
const easel = candidate.run();
const naive = silent.run();
check(C, "forced world translation matches", three === easel,
  `three ${three}, easel ${easel}`);
check(C, "naive updateMatrixWorld(true) leaves the world matrix stale",
  naive !== three,
  `three ${three}, naive ${naive}`);
