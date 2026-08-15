import { Geometry } from "../Geometry.ts";

/**
 * Base geometry for subdivided polyhedra projected onto a sphere.
 *
 * Each source triangle is subdivided by `detail`, then its vertices are
 * normalized to the requested radius and assigned spherical UVs.
 */
export class PolyhedronGeometry extends Geometry {
  /** Serialization discriminator for this runtime type. */
  declare type: string;
  /** Primitive-construction parameters retained for serialization. */
  declare parameters: Record<string, unknown>;

  /** Constructs a subdivided polyhedron from flat vertex and triangle-index arrays. */
  constructor(
    vertices: number[],
    indices: number[],
    radius: number = 1,
    detail: number = 0,
  ) {
    super();

    this.type = "PolyhedronGeometry";
    this.parameters = { vertices, indices, radius, detail };

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    // Build initial triangles from flat vertex/index arrays
    for (let i = 0; i < indices.length; i += 3) {
      const ax = vertices[indices[i] * 3];
      const ay = vertices[indices[i] * 3 + 1];
      const az = vertices[indices[i] * 3 + 2];
      const bx = vertices[indices[i + 1] * 3];
      const by = vertices[indices[i + 1] * 3 + 1];
      const bz = vertices[indices[i + 1] * 3 + 2];
      const cx = vertices[indices[i + 2] * 3];
      const cy = vertices[indices[i + 2] * 3 + 1];
      const cz = vertices[indices[i + 2] * 3 + 2];

      subdivide({
        a: [ax, ay, az],
        b: [bx, by, bz],
        c: [cx, cy, cz],
        detail,
        out: positions,
      });
    }

    // Project onto sphere and compute normals/uvs
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      const len = Math.sqrt(x * x + y * y + z * z);
      const nx = x / len;
      const ny = y / len;
      const nz = z / len;

      positions[i] = nx * radius;
      positions[i + 1] = ny * radius;
      positions[i + 2] = nz * radius;

      normals.push(nx, ny, nz);

      const u = 0.5 + Math.atan2(nz, nx) / (2 * Math.PI);
      const v = 0.5 - Math.asin(ny) / Math.PI;
      uvs.push(u, v);
    }

    this.setPositions(new Float32Array(positions));
    this.setNormals(new Float32Array(normals));
    this.setUVs(new Float32Array(uvs));
  }
}

interface SubdivideOptions {
  a: number[];
  b: number[];
  c: number[];
  detail: number;
  out: number[];
}

/** Recursively subdivide a triangle into 4^detail sub-triangles. */
function subdivide(opts: SubdivideOptions): void {
  if (opts.detail === 0) {
    opts.out.push(...opts.a, ...opts.b, ...opts.c);
    return;
  }

  const ab = midpoint(opts.a, opts.b);
  const bc = midpoint(opts.b, opts.c);
  const ca = midpoint(opts.c, opts.a);

  subdivide({
    a: opts.a,
    b: ab,
    c: ca,
    detail: opts.detail - 1,
    out: opts.out,
  });
  subdivide({
    a: opts.b,
    b: bc,
    c: ab,
    detail: opts.detail - 1,
    out: opts.out,
  });
  subdivide({
    a: opts.c,
    b: ca,
    c: bc,
    detail: opts.detail - 1,
    out: opts.out,
  });
  subdivide({ a: ab, b: bc, c: ca, detail: opts.detail - 1, out: opts.out });
}

function midpoint(a: number[], b: number[]): number[] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}
