import { check } from "../_lib/oracle.ts";
import * as baseline from "./baseline.js";
import * as candidate from "./candidate.ts";

const C = "frustum-dispose";
const xs = [0, 4, 4.9, 6, 30, -30];
const three: boolean[] = baseline.visible(xs);
const easel = candidate.visible(xs);
check(C, "visibility matches three r186 intersectsFrustum",
  three.join() === easel.join(), `three ${three}, easel ${easel}`);
const threeEvents = baseline.disposeEvents();
const easelEvents = candidate.disposeEvents();
check(C, "one dispose event, as three r186 fires",
  threeEvents === 1 && easelEvents === 1, `${threeEvents}/${easelEvents}`);
