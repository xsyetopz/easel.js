import { PerspectiveCamera, Scene } from "@xsyetopz/easel";
import { captureRenderer } from "../_lib/capture.ts";
import { check } from "../_lib/oracle.ts";
import * as baseline from "./baseline.js";
import * as candidate from "./candidate.ts";
import * as silent from "./silent.ts";

const C = "lod-update";

function run(distance: number, ported: boolean) {
  const { renderer, pixel } = captureRenderer(8, 8);
  const scene = new Scene();
  scene.background = 0;
  const lod = candidate.makeLod();
  scene.add(lod);
  const camera = new PerspectiveCamera({
    fov: 50, aspect: 1, near: 0.1, far: 100,
  });
  camera.position.set(0, 0, distance);
  if (ported) candidate.frame(renderer, scene, camera, [lod]);
  else silent.frame(renderer, scene, camera);
  return {
    visible: lod.levels.map((level) => level.object.visible),
    centre: pixel(4, 4).join(),
  };
}

for (const distance of [3, 50]) {
  const three = baseline.visibleLevels(distance).join();
  const easel = run(distance, true);
  check(C, `visible levels match at distance ${distance}`,
    three === easel.visible.join(),
    `three ${three}, easel ${easel.visible}`);
}
const far = run(50, true).centre;
check(C, "far camera draws the low level (blue)", far === "0,0,255", far);
const naive = run(50, false);
check(C, "naive port leaves every level visible, so all are rasterized",
  naive.visible.every(Boolean), `visible ${naive.visible}`);
