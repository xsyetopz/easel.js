// Naive port that type-checks: 256x256 data, silently cropped to 128x128.
import { DataTexture } from "@xsyetopz/easel";

export function build(data: Uint8ClampedArray): DataTexture {
  return new DataTexture(data, 256, 256);
}
