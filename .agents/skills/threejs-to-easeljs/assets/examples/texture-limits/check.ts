import { check } from "../_lib/oracle.ts";
import * as baseline from "./baseline.js";
import * as candidate from "./candidate.ts";
import * as silent from "./silent.ts";

const C = "texture-limits";
const three = baseline.build();
const easel = candidate.build();
check(C, "three keeps 256x256", three.image.width === 256, `${three.image.width}`);
check(C, "candidate is 128x128", easel.width === 128 && easel.height === 128);

// Count squares along the top row: three has 16, the port keeps 16.
function squares(row: ArrayLike<number>, width: number): number {
  let n = 1;
  for (let x = 1; x < width; x++) {
    if (row[x * 4] !== row[(x - 1) * 4]) n++;
  }
  return n;
}
const threeSquares = squares(three.image.data, 256);
const easelData = easel.data?.data ?? new Uint8ClampedArray();
check(C, "pattern keeps 16 squares per row",
  squares(easelData, 128) === threeSquares, `${threeSquares}`);

const cropped = silent.build(new Uint8ClampedArray(baseline.checker(256)));
const croppedData = cropped.data?.data ?? new Uint8ClampedArray();
check(C, "naive 256 input is cropped, not scaled",
  cropped.width === 128 && squares(croppedData, 128) === 8,
  `width ${cropped.width}, squares ${squares(croppedData, 128)}`);
