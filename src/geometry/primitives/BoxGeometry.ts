import { Geometry } from "../Geometry.ts";

interface BoxBuffers {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
  vertexCount: number;
}

interface BoxOptions {
  width: number;
  height: number;
  depth: number;
  widthSegments: number;
  heightSegments: number;
  depthSegments: number;
}

interface BuildPlaneOptions {
  u: number;
  v: number;
  w: number;
  uDir: number;
  vDir: number;
  faceWidth: number;
  faceHeight: number;
  faceDepth: number;
  gridX: number;
  gridY: number;
}

/** Build one face of the box. */
function buildPlane(buffers: BoxBuffers, opts: BuildPlaneOptions): void {
  const {
    u,
    v,
    w,
    uDir,
    vDir,
    faceWidth,
    faceHeight,
    faceDepth,
    gridX,
    gridY,
  } = opts;
  const segmentWidth = faceWidth / gridX;
  const segmentHeight = faceHeight / gridY;
  const widthHalf = faceWidth / 2;
  const heightHalf = faceHeight / 2;
  const depthHalf = faceDepth / 2;
  const gridX1 = gridX + 1;
  const gridY1 = gridY + 1;
  const faceStart = buffers.vertexCount;

  for (let iy = 0; iy < gridY1; iy++) {
    const y = iy * segmentHeight - heightHalf;
    for (let ix = 0; ix < gridX1; ix++) {
      const x = ix * segmentWidth - widthHalf;
      const vertex = [0, 0, 0];
      vertex[u] = x * uDir;
      vertex[v] = y * vDir;
      vertex[w] = depthHalf;
      buffers.positions.push(...vertex);

      const normal = [0, 0, 0];
      normal[w] = faceDepth > 0 ? 1 : -1;
      buffers.normals.push(...normal);

      buffers.uvs.push(ix / gridX, 1 - iy / gridY);
      buffers.vertexCount++;
    }
  }

  for (let iy = 0; iy < gridY; iy++) {
    for (let ix = 0; ix < gridX; ix++) {
      const a = faceStart + ix + gridX1 * iy;
      const b = faceStart + ix + gridX1 * (iy + 1);
      const c = faceStart + (ix + 1) + gridX1 * (iy + 1);
      const d = faceStart + (ix + 1) + gridX1 * iy;
      buffers.indices.push(a, b, d);
      buffers.indices.push(b, c, d);
    }
  }
}

function buildBoxData(opts: BoxOptions): BoxBuffers {
  const buffers: BoxBuffers = {
    positions: [],
    normals: [],
    uvs: [],
    indices: [],
    vertexCount: 0,
  };

  const ws = Math.floor(opts.widthSegments);
  const hs = Math.floor(opts.heightSegments);
  const ds = Math.floor(opts.depthSegments);
  const { width, height, depth } = opts;

  buildPlane(buffers, {
    u: 2,
    v: 1,
    w: 0,
    uDir: -1,
    vDir: -1,
    faceWidth: depth,
    faceHeight: height,
    faceDepth: width,
    gridX: ds,
    gridY: hs,
  }); // px
  buildPlane(buffers, {
    u: 2,
    v: 1,
    w: 0,
    uDir: 1,
    vDir: -1,
    faceWidth: depth,
    faceHeight: height,
    faceDepth: -width,
    gridX: ds,
    gridY: hs,
  }); // nx
  buildPlane(buffers, {
    u: 0,
    v: 2,
    w: 1,
    uDir: 1,
    vDir: 1,
    faceWidth: width,
    faceHeight: depth,
    faceDepth: height,
    gridX: ws,
    gridY: ds,
  }); // py
  buildPlane(buffers, {
    u: 0,
    v: 2,
    w: 1,
    uDir: 1,
    vDir: -1,
    faceWidth: width,
    faceHeight: depth,
    faceDepth: -height,
    gridX: ws,
    gridY: ds,
  }); // ny
  buildPlane(buffers, {
    u: 0,
    v: 1,
    w: 2,
    uDir: 1,
    vDir: -1,
    faceWidth: width,
    faceHeight: height,
    faceDepth: depth,
    gridX: ws,
    gridY: hs,
  }); // pz
  buildPlane(buffers, {
    u: 0,
    v: 1,
    w: 2,
    uDir: -1,
    vDir: -1,
    faceWidth: width,
    faceHeight: height,
    faceDepth: -depth,
    gridX: ws,
    gridY: hs,
  }); // nz

  return buffers;
}

/** Rectangular cuboid with independently segmented faces. */
export class BoxGeometry extends Geometry {
  /** Serialization discriminator for this runtime type. */
  declare type: string;
  /** Primitive-construction parameters retained for serialization. */
  declare parameters: Record<string, unknown>;

  /** Constructs a centered cuboid from dimensions and per-face segment counts. */
  constructor(
    width: number = 1,
    height: number = 1,
    depth: number = 1,
    widthSegments: number = 1,
    heightSegments: number = 1,
    depthSegments: number = 1,
  ) {
    super();

    this.type = "BoxGeometry";
    this.parameters = {
      width,
      height,
      depth,
      widthSegments,
      heightSegments,
      depthSegments,
    };

    const data = buildBoxData({
      width,
      height,
      depth,
      widthSegments,
      heightSegments,
      depthSegments,
    });
    const IndexArray = data.vertexCount > 65535 ? Uint32Array : Uint16Array;

    this.setPositions(new Float32Array(data.positions));
    this.setNormals(new Float32Array(data.normals));
    this.setUVs(new Float32Array(data.uvs));
    this.index = new IndexArray(data.indices);
  }
}
