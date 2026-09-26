// Runs every example's oracle. Exits non-zero (uncaught error) on failure.
import { REVISION } from "@xsyetopz/easel";
import { check as cameraLookAt } from "./camera-lookat.ts";
import { check as clearColor } from "./clear-color.ts";
import { check as dataTexture } from "./datatexture.ts";
import { check as disposal } from "./disposal.ts";
import { check as fogLut } from "./fog-lut.ts";
import { check as framePrepare } from "./frame-prepare.ts";
import { check as geometryIndex } from "./geometry-index.ts";
import { check as loopAnimator } from "./loop-animator.ts";
import { check as opacity } from "./opacity.ts";
import { check as picking } from "./picking.ts";
import { check as resize } from "./resize.ts";
import { check as teardown } from "./teardown.ts";
import { check as trackItemSize } from "./track-item-size.ts";

const checks: [string, () => string][] = [
  ["frame-prepare", framePrepare],
  ["camera-lookat", cameraLookAt],
  ["resize", resize],
  ["clear-color", clearColor],
  ["opacity", opacity],
  ["fog-lut", fogLut],
  ["geometry-index", geometryIndex],
  ["track-item-size", trackItemSize],
  ["loop-animator", loopAnimator],
  ["teardown", teardown],
  ["disposal", disposal],
  ["picking", picking],
  ["datatexture", dataTexture],
];

console.log(`EASEL REVISION ${REVISION}`);
console.log(`resolved @xsyetopz/easel -> ${import.meta.resolve("@xsyetopz/easel")}`);
let failed = 0;
for (const [name, run] of checks) {
  try {
    console.log(`PASS ${name}: ${run()}`);
  } catch (error) {
    failed++;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`FAIL ${name}: ${message}`);
  }
}
if (failed > 0) throw new Error(`${failed} of ${checks.length} checks failed`);
console.log(`PASS all ${checks.length} example checks`);
