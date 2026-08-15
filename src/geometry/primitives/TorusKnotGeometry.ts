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

/** Orthonormal frame (point, normal, binormal) at a torus-knot sample. */
interface TorusKnotFrame {
  px: number;
  py: number;
  pz: number;
  nx: number;
  ny: number;
  nz: number;
  bx: number;
  by: number;
  bz: number;
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

/** Sweeps a tube ring along the `(p, q)` curve, writing positions, normals, and UVs. */
function buildTorusKnotVertices(
  data: TorusKnotData,
  opts: TorusKnotBuildOptions,
): void {
  const ts = Math.floor(opts.tubularSegments);
  const rs = Math.floor(opts.radialSegments);
  const { radius, tube, p, q } = opts;

  for (let i = 0; i <= ts; i++) {
    const u = (i / ts) * p * Math.PI * 2;
    const f = computeTorusKnotFrame(u, radius, p, q);

    for (let j = 0; j <= rs; j++) {
      const v = (j / rs) * Math.PI * 2;
      const cosV = Math.cos(v);
      const sinV = Math.sin(v);

      const nx = cosV * f.nx + sinV * f.bx;
      const ny = cosV * f.ny + sinV * f.by;
      const nz = cosV * f.nz + sinV * f.bz;

      data.positions.push(f.px + tube * nx, f.py + tube * ny, f.pz + tube * nz);
      data.normals.push(nx, ny, nz);
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

  for (let i = 1; i <= ts; i++) {
    for (let j = 1; j <= rs; j++) {
      const a = (rs + 1) * (i - 1) + (j - 1);
      const b = (rs + 1) * i + (j - 1);
      const c = (rs + 1) * i + j;
      const d = (rs + 1) * (i - 1) + j;
      data.indices.push(a, d, b);
      data.indices.push(b, d, c);
    }
  }
}

/** Computes the orthonormal frame (position, normal, binormal) at parameter `u`. */
function computeTorusKnotFrame(
  u: number,
  radius: number,
  p: number,
  q: number,
): TorusKnotFrame {
  const P1: number[] = [];
  const P2: number[] = [];
  const quOverP = q / p;
  computeTorusKnotPoint(u, P1, quOverP, radius);
  computeTorusKnotPoint(u + 0.01, P2, quOverP, radius);

  const Tx = P2[0] - P1[0];
  const Ty = P2[1] - P1[1];
  const Tz = P2[2] - P1[2];

  // N = -normalize(P1 + P2) - points away from center of curvature
  let Nx = -(P1[0] + P2[0]);
  let Ny = -(P1[1] + P2[1]);
  let Nz = -(P1[2] + P2[2]);
  let Nlen = Math.sqrt(Nx * Nx + Ny * Ny + Nz * Nz) || 1;
  Nx /= Nlen;
  Ny /= Nlen;
  Nz /= Nlen;

  // B = normalize(T x N)
  let Bx = Ty * Nz - Tz * Ny;
  let By = Tz * Nx - Tx * Nz;
  let Bz = Tx * Ny - Ty * Nx;
  const Blen = Math.sqrt(Bx * Bx + By * By + Bz * Bz) || 1;
  Bx /= Blen;
  By /= Blen;
  Bz /= Blen;

  // Re-orthogonalize N = B x T (already unit-ish)
  Nx = By * Tz - Bz * Ty;
  Ny = Bz * Tx - Bx * Tz;
  Nz = Bx * Ty - By * Tx;
  Nlen = Math.sqrt(Nx * Nx + Ny * Ny + Nz * Nz) || 1;
  Nx /= Nlen;
  Ny /= Nlen;
  Nz /= Nlen;

  return {
    px: P1[0],
    py: P1[1],
    pz: P1[2],
    nx: Nx,
    ny: Ny,
    nz: Nz,
    bx: Bx,
    by: By,
    bz: Bz,
  };
}

/** Evaluates the `(p, q)` torus-knot curve at parameter `u`, writing into `out`. */
function computeTorusKnotPoint(
  u: number,
  out: number[],
  quOverP: number,
  radius: number,
): void {
  const cs = Math.cos(u);
  const sn = Math.sin(u);
  const r = 0.5 * (2 + Math.cos(quOverP * u));
  out[0] = r * cs * radius;
  out[1] = r * sn * radius;
  out[2] = Math.sin(quOverP * u) * radius * 0.5;
}
