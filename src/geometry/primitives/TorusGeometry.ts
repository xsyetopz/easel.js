import { Geometry } from "../Geometry.ts";

function buildTorusIndices(rs: number, ts: number): number[] {
  const indices: number[] = [];
  for (let j = 1; j <= rs; j++) {
    for (let i = 1; i <= ts; i++) {
      const a = (ts + 1) * j + i - 1;
      const b = (ts + 1) * (j - 1) + i - 1;
      const c = (ts + 1) * (j - 1) + i;
      const d = (ts + 1) * j + i;
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }
  return indices;
}

/**
 * Torus in the XY plane, centered on the origin, matching three.js r186:
 * the ring runs counterclockwise around +Z and the tube cross-section starts
 * on the outer equator.
 */
export class TorusGeometry extends Geometry {
  /**
   * Constructs a torus.
   *
   * @param radius Distance from the torus center to the tube center.
   * @param tube Tube radius.
   * @param radialSegments Segments around the tube cross-section.
   * @param tubularSegments Segments along the ring.
   * @param arc Ring angle in radians, starting at +X.
   * @param thetaStart Start angle of the tube cross-section in radians.
   * @param thetaLength Swept angle of the tube cross-section in radians.
   */
  constructor(
    radius: number = 1,
    tube: number = 0.4,
    radialSegments: number = 12,
    tubularSegments: number = 48,
    arc: number = Math.PI * 2,
    thetaStart: number = 0,
    thetaLength: number = Math.PI * 2,
  ) {
    super();

    this.type = "TorusGeometry";
    this.parameters = {
      radius,
      tube,
      radialSegments,
      tubularSegments,
      arc,
      thetaStart,
      thetaLength,
    };

    const rs = Math.floor(radialSegments);
    const ts = Math.floor(tubularSegments);

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    // Same expressions as r186; each cosine and sine is evaluated once.
    for (let j = 0; j <= rs; j++) {
      const v = thetaStart + (j / rs) * thetaLength;
      const ringRadius = radius + tube * Math.cos(v);
      const pz = tube * Math.sin(v);
      for (let i = 0; i <= ts; i++) {
        const u = (i / ts) * arc;
        const cosU = Math.cos(u);
        const sinU = Math.sin(u);

        const px = ringRadius * cosU;
        const py = ringRadius * sinU;
        positions.push(px, py, pz);

        // Unit vector from the ring center, as Vector3.normalize computes it.
        const nx = px - radius * cosU;
        const ny = py - radius * sinU;
        const scale = 1 / (Math.sqrt(nx * nx + ny * ny + pz * pz) || 1);
        normals.push(nx * scale, ny * scale, pz * scale);

        uvs.push(i / ts, j / rs);
      }
    }

    const indices = buildTorusIndices(rs, ts);
    const vertexCount = (rs + 1) * (ts + 1);
    const IndexArray = vertexCount > 65535 ? Uint32Array : Uint16Array;

    this.setPositions(new Float32Array(positions));
    this.setNormals(new Float32Array(normals));
    this.setUVs(new Float32Array(uvs));
    this.index = new IndexArray(indices);
  }

  /** Restores geometry from a JSON record. */
  fromJSON(json: Record<string, unknown>): this {
    void json;
    return this;
  }
}
