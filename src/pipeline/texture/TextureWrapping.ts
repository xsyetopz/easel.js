import {
  Wrapping,
  type Wrapping as WrappingMode,
} from "../../core/Constants.ts";

/** Maps one UV coordinate to a nearest-neighbor texel for the selected wrapping mode. */
export function textureCoordinateToTexel(
  coordinate: number,
  size: number,
  wrapping: WrappingMode,
): number {
  if (wrapping === Wrapping.Repeat) {
    const repeated = coordinate - Math.floor(coordinate);
    return Math.floor(repeated * size);
  }

  if (wrapping === Wrapping.MirroredRepeat) {
    const tile = Math.floor(coordinate);
    const fraction = coordinate - tile;
    const mirrored = tile % 2 === 0 ? fraction : 1 - fraction;
    return Math.min(size - 1, Math.floor(mirrored * size));
  }

  if (coordinate <= 0) return 0;
  if (coordinate >= 1) return size - 1;
  return Math.floor(coordinate * size);
}
