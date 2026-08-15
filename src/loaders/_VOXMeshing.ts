import { Geometry } from "../geometry/Geometry.ts";
import { LambertMaterial } from "../materials/LambertMaterial.ts";
import { Mesh } from "../objects/Mesh.ts";
import type { VOXChunk } from "./VOXLoader.ts";
import { buildVoxelVolume } from "./_VOXVoxelVolume.ts";
import { buildGreedyMeshData } from "./_VOXMeshingFaces.ts";

type Triple = [number, number, number];

function validateDimensions(size: { x: number; y: number; z: number }): Triple {
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
      "VOXLoader: buildMesh requires positive safe dimensions.",
    );
  }
  return [x, y, z];
}

/**
 * Builds a greedy-meshed CPU EASEL mesh from a decoded VOX chunk.
 *
 * Faces are centered and converted from MagicaVoxel's Z-up coordinates to
 * EASEL's Y-up coordinates. Palette colors become geometry RGB attributes;
 * no GPU buffers, shaders, or 3D texture resources are created.
 */
export function buildMesh(chunk: VOXChunk): Mesh {
  const dims = validateDimensions(chunk.size);
  const volume = buildVoxelVolume(chunk);
  const mesh = buildGreedyMeshData(volume.colors, dims, chunk.palette);
  const geometry = new Geometry().setPositions(mesh.vertices);
  geometry.index = mesh.indices;
  geometry.setColors(mesh.colors);
  geometry.computeVertexNormals().computeBoundingBox().computeBoundingSphere();
  return new Mesh(geometry, new LambertMaterial({ vertexColors: true }));
}
