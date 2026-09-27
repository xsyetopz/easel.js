// EASEL 0.8: get/set accessors replace parameterless getX()/setX(value).
import { Box3, BoxGeometry, Color } from "@xsyetopz/easel";

export function run() {
  const color = new Color();
  color.hex = 0x3366cc;
  const geometry = new BoxGeometry(1, 1, 1);
  geometry.index = [0, 1, 2, 2, 1, 3];
  return {
    hex: color.hex,
    hexString: color.hexString,
    style: color.style,
    index: Array.from(geometry.index ?? []),
    empty: new Box3().isEmpty, // a getter, not isEmpty()
  };
}
