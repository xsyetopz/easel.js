import { Geometry } from "../Geometry.ts";

/** Vertex/index payload produced by {@link buildTorusKnotData}. */
interface TorusKnotData {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
}

/** Parameters for {@link buildTorusKnotData}. */
interface TorusKnotBuildOptions {
  radius: number;
  tube: number;
  tubularSegments: number;
  radialSegments: number;
  p: number;
  q: number;
}

/** Tube swept around a `(p, q)` torus-knot curve. */
export class TorusKnotGeometry extends Geometry {
  /** Serialization discriminator for this runtime type. */
  declare type: string;
  /** Primitive-construction parameters retained for serialization. */
  declare parameters: Record<string, unknown>;

  /** Constructs a tube around a `(p, q)` torus-knot path. */
  constructor(
    radius: number = 1,
    tube: number = 0.4,
    tubularSegments: number = 64,
    radialSegments: number = 8,
    p: number = 2,
    q: number = 3,
  ) {
    super();

    this.type = "TorusKnotGeometry";
    this.parameters = { radius, tube, tubularSegments, radialSegments, p, q };

    const data = buildTorusKnotData({
      radius,
      tube,
      tubularSegments,
      radialSegments,
      p,
      q,
    });

    this.setPositions(new Float32Array(data.positions));
    this.setNormals(new Float32Array(data.normals));
    this.setUVs(new Float32Array(data.uvs));
    const IndexArray =
      data.positions.length / 3 > 65535 ? Uint32Array : Uint16Array;
    this.index = new IndexArray(data.indices);
  }
}

/** Builds the full vertex and index buffers for a torus-knot tube. */
function buildTorusKnotData(opts: TorusKnotBuildOptions): TorusKnotData {
  const data: TorusKnotData = {
    positions: [],
    normals: [],
    uvs: [],
    indices: [],
  };
  buildTorusKnotVertices(data, opts);
  buildTorusKnotIndices(data, opts);
  return data;
}

/**
 * Sweeps a tube ring along the `(p, q)` curve, writing positions, normals,
 * and UVs with three.js r186's frame, ring direction, and arithmetic order.
 */
function buildTorusKnotVertices(
  data: TorusKnotData,
  opts: TorusKnotBuildOptions,
): void {
  const ts = Math.floor(opts.tubularSegments);
  const rs = Math.floor(opts.radialSegments);
  const { radius, tube, p, q } = opts;

  for (let i = 0; i <= ts; ++i) {
    const u = (i / ts) * p * Math.PI * 2;

    // P1 is the curve point; P2, slightly ahead, gives the tangent T. Both
    // use r186's `calculatePositionOnCurve` expressions.
    const u2 = u + 0.01;
    const qu1 = (q / p) * u;
    const qu2 = (q / p) * u2;
    const cs1 = Math.cos(qu1);
    const cs2 = Math.cos(qu2);
    const p1x = radius * (2 + cs1) * 0.5 * Math.cos(u);
    const p1y = radius * (2 + cs1) * Math.sin(u) * 0.5;
    const p1z = radius * Math.sin(qu1) * 0.5;
    const p2x = radius * (2 + cs2) * 0.5 * Math.cos(u2);
    const p2y = radius * (2 + cs2) * Math.sin(u2) * 0.5;
    const p2z = radius * Math.sin(qu2) * 0.5;

    // T = P2 - P1, N = P2 + P1, B = T x N, N = B x T, then normalize B and N.
    const tx = p2x - p1x;
    const ty = p2y - p1y;
    const tz = p2z - p1z;
    const sx = p2x + p1x;
    const sy = p2y + p1y;
    const sz = p2z + p1z;
    let bx = ty * sz - tz * sy;
    let by = tz * sx - tx * sz;
    let bz = tx * sy - ty * sx;
    let nx = by * tz - bz * ty;
    let ny = bz * tx - bx * tz;
    let nz = bx * ty - by * tx;
    const bScale = 1 / (Math.sqrt(bx * bx + by * by + bz * bz) || 1);
    bx *= bScale;
    by *= bScale;
    bz *= bScale;
    const nScale = 1 / (Math.sqrt(nx * nx + ny * ny + nz * nz) || 1);
    nx *= nScale;
    ny *= nScale;
    nz *= nScale;

    for (let j = 0; j <= rs; ++j) {
      const v = (j / rs) * Math.PI * 2;
      const cx = -tube * Math.cos(v);
      const cy = tube * Math.sin(v);

      const vx = p1x + (cx * nx + cy * bx);
      const vy = p1y + (cx * ny + cy * by);
      const vz = p1z + (cx * nz + cy * bz);
      data.positions.push(vx, vy, vz);

      const dx = vx - p1x;
      const dy = vy - p1y;
      const dz = vz - p1z;
      const scale = 1 / (Math.sqrt(dx * dx + dy * dy + dz * dz) || 1);
      data.normals.push(dx * scale, dy * scale, dz * scale);

      data.uvs.push(i / ts, j / rs);
    }
  }
}

/** Writes the quad-split index pairs connecting adjacent tube rings. */
function buildTorusKnotIndices(
  data: TorusKnotData,
  opts: TorusKnotBuildOptions,
): void {
  const ts = Math.floor(opts.tubularSegments);
  const rs = Math.floor(opts.radialSegments);

  for (let j = 1; j <= ts; j++) {
    for (let i = 1; i <= rs; i++) {
      const a = (rs + 1) * (j - 1) + (i - 1);
      const b = (rs + 1) * j + (i - 1);
      const c = (rs + 1) * j + i;
      const d = (rs + 1) * (j - 1) + i;
      data.indices.push(a, b, d);
      data.indices.push(b, c, d);
    }
  }
}
