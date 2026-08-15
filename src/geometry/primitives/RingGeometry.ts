import { Geometry } from "../Geometry.ts";

function buildRingIndices(grid: number[][], ps: number, ts: number): number[] {
  const indices: number[] = [];
  for (let j = 0; j < ps; j++) {
    for (let i = 0; i < ts; i++) {
      const a = grid[j][i];
      const b = grid[j + 1][i];
      const c = grid[j + 1][i + 1];
      const d = grid[j][i + 1];
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }
  return indices;
}

/** Flat annulus on the XY plane with optional angular and radial segments. */
export class RingGeometry extends Geometry {
  /** Constructs a flat annulus from inner and outer radii and angular spans. */
  constructor(
    innerRadius: number = 0.5,
    outerRadius: number = 1,
    thetaSegments: number = 32,
    phiSegments: number = 1,
    thetaStart: number = 0,
    thetaLength: number = Math.PI * 2,
  ) {
    super();

    this.type = "RingGeometry";
    this.parameters = {
      innerRadius,
      outerRadius,
      thetaSegments,
      phiSegments,
      thetaStart,
      thetaLength,
    };

    const ts = Math.max(3, Math.floor(thetaSegments));
    const ps = Math.max(1, Math.floor(phiSegments));

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    let index = 0;
    const grid: number[][] = [];

    for (let j = 0; j <= ps; j++) {
      const row: number[] = [];
      const r = innerRadius + (j / ps) * (outerRadius - innerRadius);
      for (let i = 0; i <= ts; i++) {
        const theta = thetaStart + (i / ts) * thetaLength;
        positions.push(r * Math.cos(theta), r * Math.sin(theta), 0);
        normals.push(0, 0, 1);
        uvs.push(
          (r * Math.cos(theta) + outerRadius) / (2 * outerRadius),
          (r * Math.sin(theta) + outerRadius) / (2 * outerRadius),
        );
        row.push(index++);
      }
      grid.push(row);
    }

    const indices = buildRingIndices(grid, ps, ts);

    const IndexArray = index > 65535 ? Uint32Array : Uint16Array;

    this.setPositions(new Float32Array(positions));
    this.setNormals(new Float32Array(normals));
    this.setUVs(new Float32Array(uvs));
    this.index = new IndexArray(indices);
  }
}
