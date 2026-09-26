// Uses one internal module (the rasterizer's wrap function) to show what the
// renderer samples; application code should not import it.
import { textureCoordinateToTexel } from "@/pipeline/texture/TextureWrapping.ts";
import { check } from "../_lib/oracle.ts";
import * as baseline from "./baseline.js";
import * as candidate from "./candidate.ts";
import * as silent from "./silent.ts";

const C = "constants";
const three = baseline.run();
const easel = candidate.run();
check(C, "RepeatWrapping value differs", three.wrapS !== easel.wrapS,
  `three ${three.wrapS}, easel ${easel.wrapS}`);
check(C, "DoubleSide value is shared", three.side === easel.side,
  `${three.side}`);
check(C, "LoopRepeat value is shared", three.loop === easel.loop,
  `${three.loop}`);

// u = 1.25 on a 4-texel row: Repeat samples texel 1; an unknown mode clamps.
const mapped = textureCoordinateToTexel(1.25, 4, easel.wrapS);
const cast = silent.fromThreeJson(three.wrapS);
const clamped = textureCoordinateToTexel(1.25, 4, cast.wrapS);
check(C, "mapped Repeat samples texel 1", mapped === 1, `${mapped}`);
check(C, "cast three value 1000 silently clamps", clamped === 3, `${clamped}`);
