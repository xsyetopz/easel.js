import { Geometry } from "../Geometry.ts";

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

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    let vertexCount = 0;

    /** Build one face of the box. */
    function buildPlane(
      u: number,
      v: number,
      w: number,
      uDir: number,
      vDir: number,
      width: number,
      height: number,
      depth: number,
      gridX: number,
      gridY: number,
    ): void {
      const segmentWidth = width / gridX;
      const segmentHeight = height / gridY;
      const widthHalf = width / 2;
      const heightHalf = height / 2;
      const depthHalf = depth / 2;
      const gridX1 = gridX + 1;
      const gridY1 = gridY + 1;
      const faceStart = vertexCount;

      for (let iy = 0; iy < gridY1; iy++) {
        const y = iy * segmentHeight - heightHalf;
        for (let ix = 0; ix < gridX1; ix++) {
          const x = ix * segmentWidth - widthHalf;
          const vertex = [0, 0, 0];
          vertex[u] = x * uDir;
          vertex[v] = y * vDir;
          vertex[w] = depthHalf;
          positions.push(...vertex);

          const normal = [0, 0, 0];
          normal[w] = depth > 0 ? 1 : -1;
          normals.push(...normal);

          uvs.push(ix / gridX, 1 - iy / gridY);
          vertexCount++;
        }
      }

      for (let iy = 0; iy < gridY; iy++) {
        for (let ix = 0; ix < gridX; ix++) {
          const a = faceStart + ix + gridX1 * iy;
          const b = faceStart + ix + gridX1 * (iy + 1);
          const c = faceStart + (ix + 1) + gridX1 * (iy + 1);
          const d = faceStart + (ix + 1) + gridX1 * iy;
          indices.push(a, b, d);
          indices.push(b, c, d);
        }
      }
    }

    const ws = Math.floor(widthSegments);
    const hs = Math.floor(heightSegments);
    const ds = Math.floor(depthSegments);

    buildPlane(2, 1, 0, -1, -1, depth, height, width, ds, hs); // px
    buildPlane(2, 1, 0, 1, -1, depth, height, -width, ds, hs); // nx
    buildPlane(0, 2, 1, 1, 1, width, depth, height, ws, ds); // py
    buildPlane(0, 2, 1, 1, -1, width, depth, -height, ws, ds); // ny
    buildPlane(0, 1, 2, 1, -1, width, height, depth, ws, hs); // pz
    buildPlane(0, 1, 2, -1, -1, width, height, -depth, ws, hs); // nz

    const IndexArray = vertexCount > 65535 ? Uint32Array : Uint16Array;

    this.setPositions(new Float32Array(positions));
    this.setNormals(new Float32Array(normals));
    this.setUVs(new Float32Array(uvs));
    this.index = new IndexArray(indices);
  }
}
