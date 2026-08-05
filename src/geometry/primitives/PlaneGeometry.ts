import { Geometry } from "../Geometry.ts";

/** Flat rectangular grid on the XY plane with +Z normals. */
export class PlaneGeometry extends Geometry {
  /** Constructs a centered XY-plane grid from dimensions and segment counts. */
  constructor(
    width: number = 1,
    height: number = 1,
    widthSegments: number = 1,
    heightSegments: number = 1,
  ) {
    super();

    this.type = "PlaneGeometry";
    this.parameters = { width, height, widthSegments, heightSegments };

    const gridX = Math.floor(widthSegments);
    const gridY = Math.floor(heightSegments);
    const gridX1 = gridX + 1;
    const gridY1 = gridY + 1;
    const segW = width / gridX;
    const segH = height / gridY;
    const halfW = width / 2;
    const halfH = height / 2;

    const positions = new Float32Array(gridX1 * gridY1 * 3);
    const normals = new Float32Array(gridX1 * gridY1 * 3);
    const uvs = new Float32Array(gridX1 * gridY1 * 2);

    let vi = 0;
    let ni = 0;
    let ui = 0;

    for (let iy = 0; iy < gridY1; iy++) {
      const y = iy * segH - halfH;
      for (let ix = 0; ix < gridX1; ix++) {
        const x = ix * segW - halfW;
        positions[vi++] = x;
        positions[vi++] = y;
        positions[vi++] = 0;
        normals[ni++] = 0;
        normals[ni++] = 0;
        normals[ni++] = 1;
        uvs[ui++] = ix / gridX;
        uvs[ui++] = 1 - iy / gridY;
      }
    }

    const indexCount = gridX * gridY * 6;
    const IndexArray = gridX1 * gridY1 > 65535 ? Uint32Array : Uint16Array;
    const indices = new IndexArray(indexCount);
    let ii = 0;

    for (let iy = 0; iy < gridY; iy++) {
      for (let ix = 0; ix < gridX; ix++) {
        const a = ix + gridX1 * iy;
        const b = ix + gridX1 * (iy + 1);
        const c = ix + 1 + gridX1 * (iy + 1);
        const d = ix + 1 + gridX1 * iy;
        indices[ii++] = a;
        indices[ii++] = d;
        indices[ii++] = b;
        indices[ii++] = b;
        indices[ii++] = d;
        indices[ii++] = c;
      }
    }

    this.setPositions(positions);
    this.setNormals(normals);
    this.setUVs(uvs);
    this.index = indices;
  }
}
