import type { VOXChunk, VOXVoxelVolume } from "./VOXLoader.ts";

type Triple = [number, number, number];

function validateDimensions(
  size: { x: number; y: number; z: number },
  operation: string,
): Triple {
  const { x, y, z } = size;
  if (
    !(
      Number.isSafeInteger(x) &&
      Number.isSafeInteger(y) &&
      Number.isSafeInteger(z)
    ) ||
    x < 1 ||
    y < 1 ||
    z < 1
  ) {
    throw new RangeError(
      `VOXLoader: ${operation} requires positive safe dimensions.`,
    );
  }
  return [x, y, z];
}

function readVoxelByte(data: Uint8Array, offset: number): number {
  const value = data[offset];
  if (value === undefined)
    throw new RangeError("VOXLoader: voxel data record is truncated.");
  return value;
}

/** Builds an indexed occupancy and color volume from one decoded VOX model. */
export function buildVoxelVolume(chunk: VOXChunk): VOXVoxelVolume {
  const dims = validateDimensions(chunk.size, "buildVoxelVolume");
  if (chunk.data.length % 4 !== 0)
    throw new RangeError("VOXLoader: voxel data must use four-byte records.");
  const length = dims[0] * dims[1] * dims[2];
  if (!Number.isSafeInteger(length))
    throw new RangeError("VOXLoader: voxel volume is too large.");
  const occupancy = new Uint8Array(length);
  const colors = new Uint8Array(length);
  for (let offset = 0; offset < chunk.data.length; offset += 4) {
    const x = readVoxelByte(chunk.data, offset);
    const y = readVoxelByte(chunk.data, offset + 1);
    const z = readVoxelByte(chunk.data, offset + 2);
    const color = readVoxelByte(chunk.data, offset + 3);
    if (x >= dims[0] || y >= dims[1] || z >= dims[2] || color === 0)
      throw new RangeError("VOXLoader: voxel record is outside the model.");
    const index = x + y * dims[0] + z * dims[0] * dims[1];
    occupancy[index] = 255;
    colors[index] = color;
  }
  return { size: chunk.size, occupancy, colors, palette: chunk.palette };
}
