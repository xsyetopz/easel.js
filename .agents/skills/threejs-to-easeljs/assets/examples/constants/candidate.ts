// EASEL 0.8.0: grouped `as const` objects; some values differ from three.js.
import { BasicMaterial, Loop, Side, Texture, Wrapping } from "@xsyetopz/easel";

export function run() {
  const texture = new Texture();
  texture.wrapS = Wrapping.Repeat;
  const material = new BasicMaterial({ side: Side.Double });
  return {
    wrapS: texture.wrapS,
    side: material.side,
    loop: Loop.Repeat,
  };
}
