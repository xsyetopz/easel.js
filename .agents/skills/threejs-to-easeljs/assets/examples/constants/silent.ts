// Naive port that type-checks: a numeric wrap mode read from three.js data
// (for example a JSON scene) is cast instead of mapped.
import { Texture, type Wrapping } from "@xsyetopz/easel";

export function fromThreeJson(wrap: number): Texture {
  const texture = new Texture();
  texture.wrapS = wrap as Wrapping;
  return texture;
}
