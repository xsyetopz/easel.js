import * as EASEL from "@xsyetopz/easel";

export interface BlockWorld {
  getBlock(x: number, y: number, z: number): number;
  isTransparent(block: number): boolean;
  uvFor(
    block: number,
    face: number,
  ): [u0: number, v0: number, u1: number, v1: number];
}

interface MeshBuffers {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
}

const FACE_NORMALS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 0, 1],
  [0, 0, -1],
  [0, 1, 0],
  [0, -1, 0],
] as const;

export function buildSimpleVoxelChunk(
  world: BlockWorld,
  sizeX: number,
  sizeY: number,
  sizeZ: number,
): EASEL.Geometry {
  const buffers = createMeshBuffers();
  for (let z = 0; z < sizeZ; z++) {
    for (let y = 0; y < sizeY; y++) {
      for (let x = 0; x < sizeX; x++) {
        emitBlockFaces(world, buffers, x, y, z);
      }
    }
  }
  return createGeometry(buffers);
}

function createMeshBuffers(): MeshBuffers {
  return { positions: [], normals: [], uvs: [], indices: [] };
}

function emitBlockFaces(
  world: BlockWorld,
  buffers: MeshBuffers,
  x: number,
  y: number,
  z: number,
): void {
  const block = world.getBlock(x, y, z);
  if (block === 0) return;
  for (let face = 0; face < FACE_NORMALS.length; face++) {
    if (!isVisibleFace(world, block, x, y, z, face)) continue;
    emitFace(buffers, x, y, z, face, world.uvFor(block, face));
  }
}

function isVisibleFace(
  world: BlockWorld,
  block: number,
  x: number,
  y: number,
  z: number,
  face: number,
): boolean {
  const [nx, ny, nz] = FACE_NORMALS[face];
  const neighbor = world.getBlock(x + nx, y + ny, z + nz);
  return neighbor === 0 || (world.isTransparent(block) && neighbor !== block);
}

function createGeometry(buffers: MeshBuffers): EASEL.Geometry {
  const geometry = new EASEL.Geometry();
  geometry.setPositions(buffers.positions);
  geometry.setNormals(buffers.normals);
  geometry.setUVs(buffers.uvs);
  geometry.setIndex(createIndexBuffer(buffers.indices));
  geometry.computeBoundingSphere();
  return geometry;
}

function createIndexBuffer(indices: number[]): Uint16Array | Uint32Array {
  return indices.length > 65535
    ? new Uint32Array(indices)
    : new Uint16Array(indices);
}

function emitFace(
  buffers: MeshBuffers,
  x: number,
  y: number,
  z: number,
  face: number,
  tile: [number, number, number, number],
): void {
  const base = buffers.positions.length / 3;
  const [u0, v0, u1, v1] = tile;
  const verts = faceVerts(x, y, z, face);
  const normal = FACE_NORMALS[face];
  for (const vertex of verts) {
    buffers.positions.push(vertex[0], vertex[1], vertex[2]);
    buffers.normals.push(normal[0], normal[1], normal[2]);
  }
  buffers.uvs.push(u0, v1, u1, v1, u1, v0, u0, v0);
  buffers.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function faceVerts(
  x: number,
  y: number,
  z: number,
  face: number,
): [number, number, number][] {
  const x1 = x + 1;
  const y1 = y + 1;
  const z1 = z + 1;
  switch (face) {
    case 0:
      return [
        [x1, y, z],
        [x1, y1, z],
        [x1, y1, z1],
        [x1, y, z1],
      ];
    case 1:
      return [
        [x, y, z1],
        [x, y1, z1],
        [x, y1, z],
        [x, y, z],
      ];
    case 2:
      return [
        [x1, y, z1],
        [x1, y1, z1],
        [x, y1, z1],
        [x, y, z1],
      ];
    case 3:
      return [
        [x, y, z],
        [x, y1, z],
        [x1, y1, z],
        [x1, y, z],
      ];
    case 4:
      return [
        [x, y1, z],
        [x, y1, z1],
        [x1, y1, z1],
        [x1, y1, z],
      ];
    default:
      return [
        [x, y, z1],
        [x, y, z],
        [x1, y, z],
        [x1, y, z1],
      ];
  }
}
