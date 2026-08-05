import { Geometry } from "../Geometry.ts";

/** Parametric sphere with latitude-longitude positions and UVs. */
export class SphereGeometry extends Geometry {
  /** Serialization discriminator for this runtime type. */
  declare type: string;
  /** Primitive-construction parameters retained for serialization. */
  declare parameters: Record<string, unknown>;

  /** Constructs a segmented UV sphere from angular spans and latitude-longitude subdivisions. */
  constructor(
    radius: number = 1,
    widthSegments: number = 32,
    heightSegments: number = 16,
    phiStart: number = 0,
    phiLength: number = Math.PI * 2,
    thetaStart: number = 0,
    thetaLength: number = Math.PI,
  ) {
    super();

    this.type = "SphereGeometry";
    this.parameters = {
      radius,
      widthSegments,
      heightSegments,
      phiStart,
      phiLength,
      thetaStart,
      thetaLength,
    };

    const ws = Math.max(3, Math.floor(widthSegments));
    const hs = Math.max(2, Math.floor(heightSegments));

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // Grid of (ws+1) x (hs+1) vertices
    const grid: number[][] = [];

    let index = 0;

    for (let iy = 0; iy <= hs; iy++) {
      const row: number[] = [];
      const v = iy / hs;
      for (let ix = 0; ix <= ws; ix++) {
        const u = ix / ws;
        const phi = phiStart + u * phiLength;
        const theta = thetaStart + v * thetaLength;

        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        const nx = -cosPhi * sinTheta;
        const ny = cosTheta;
        const nz = sinPhi * sinTheta;

        positions.push(radius * nx, radius * ny, radius * nz);
        normals.push(nx, ny, nz);
        uvs.push(u, 1 - v);

        row.push(index++);
      }
      grid.push(row);
    }

    for (let iy = 0; iy < hs; iy++) {
      for (let ix = 0; ix < ws; ix++) {
        const a = grid[iy][ix + 1];
        const b = grid[iy][ix];
        const c = grid[iy + 1][ix];
        const d = grid[iy + 1][ix + 1];

        if (iy !== 0 || thetaStart > 0) indices.push(a, b, d);
        if (iy !== hs - 1 || thetaLength + thetaStart < Math.PI) {
          indices.push(b, c, d);
        }
      }
    }

    const IndexArray = index > 65535 ? Uint32Array : Uint16Array;

    this.setPositions(new Float32Array(positions));
    this.setNormals(new Float32Array(normals));
    this.setUVs(new Float32Array(uvs));
    this.index = new IndexArray(indices);
  }
}
