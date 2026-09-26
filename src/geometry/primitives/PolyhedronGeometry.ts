import { Geometry } from "../Geometry.ts";

/**
 * Base geometry for subdivided polyhedra projected onto a sphere.
 *
 * Each source triangle is split into `(detail + 1)²` triangles, matching
 * THREE.PolyhedronGeometry, then its vertices are normalized to the requested
 * radius. `detail = 0` keeps flat face normals; higher detail uses smooth
 * normals. UVs follow THREE's spherical mapping and seam correction.
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
    for (let i = 0; i < indices.length; i += 3) {
      subdivideFace(
        vertexAt(vertices, indices[i]),
        vertexAt(vertices, indices[i + 1]),
        vertexAt(vertices, indices[i + 2]),
        detail,
        positions,
      );
    }

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      const scale = radius / Math.sqrt(x * x + y * y + z * z);
      positions[i] = x * scale;
      positions[i + 1] = y * scale;
      positions[i + 2] = z * scale;
    }

    const normals =
      detail === 0 ? faceNormals(positions) : unitNormals(positions);

    this.setPositions(new Float32Array(positions));
    this.setNormals(new Float32Array(normals));
    this.setUVs(new Float32Array(sphericalUVs(positions)));
  }
}

type Vertex = [number, number, number];

function vertexAt(vertices: number[], index: number): Vertex {
  const stride = index * 3;
  return [vertices[stride], vertices[stride + 1], vertices[stride + 2]];
}

function lerp(a: Vertex, b: Vertex, t: number): Vertex {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

/** Splits one triangle into a `(detail + 1)²` grid in THREE's vertex order. */
function subdivideFace(
  a: Vertex,
  b: Vertex,
  c: Vertex,
  detail: number,
  out: number[],
): void {
  const cols = detail + 1;
  const grid: Vertex[][] = [];
  for (let i = 0; i <= cols; i++) {
    const aj = lerp(a, c, i / cols);
    const bj = lerp(b, c, i / cols);
    const rows = cols - i;
    const row: Vertex[] = [];
    for (let j = 0; j <= rows; j++) {
      row.push(j === 0 && i === cols ? aj : lerp(aj, bj, j / rows));
    }
    grid.push(row);
  }

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < 2 * (cols - i) - 1; j++) {
      const k = Math.floor(j / 2);
      if (j % 2 === 0) {
        out.push(...grid[i][k + 1], ...grid[i + 1][k], ...grid[i][k]);
      } else {
        out.push(...grid[i][k + 1], ...grid[i + 1][k + 1], ...grid[i + 1][k]);
      }
    }
  }
}

/** Flat per-face normals, as THREE computes for `detail = 0`. */
function faceNormals(positions: number[]): number[] {
  const normals: number[] = [];
  for (let i = 0; i < positions.length; i += 9) {
    const abX = positions[i] - positions[i + 3];
    const abY = positions[i + 1] - positions[i + 4];
    const abZ = positions[i + 2] - positions[i + 5];
    const cbX = positions[i + 6] - positions[i + 3];
    const cbY = positions[i + 7] - positions[i + 4];
    const cbZ = positions[i + 8] - positions[i + 5];
    let nx = cbY * abZ - cbZ * abY;
    let ny = cbZ * abX - cbX * abZ;
    let nz = cbX * abY - cbY * abX;
    const length = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    nx /= length;
    ny /= length;
    nz /= length;
    normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  }
  return normals;
}

/** Smooth normals pointing away from the sphere center. */
function unitNormals(positions: number[]): number[] {
  const normals: number[] = [];
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    const length = Math.sqrt(x * x + y * y + z * z) || 1;
    normals.push(x / length, y / length, z / length);
  }
  return normals;
}

function azimuth(x: number, z: number): number {
  return Math.atan2(z, -x);
}

/** THREE.PolyhedronGeometry spherical UVs with pole and seam correction. */
function sphericalUVs(positions: number[]): number[] {
  const uvs: number[] = [];
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    const inclination = Math.atan2(-y, Math.sqrt(x * x + z * z));
    uvs.push(azimuth(x, z) / 2 / Math.PI + 0.5, 0.5 - inclination / Math.PI);
  }

  for (let i = 0, j = 0; i < positions.length; i += 9, j += 6) {
    const centroidAzimuth = azimuth(
      (positions[i] + positions[i + 3] + positions[i + 6]) / 3,
      (positions[i + 2] + positions[i + 5] + positions[i + 8]) / 3,
    );
    for (let k = 0; k < 3; k++) {
      const u = j + k * 2;
      const x = positions[i + k * 3];
      const z = positions[i + k * 3 + 2];
      if (centroidAzimuth < 0 && uvs[u] === 1) uvs[u] -= 1;
      if (x === 0 && z === 0) uvs[u] = centroidAzimuth / 2 / Math.PI + 0.5;
    }
  }

  for (let j = 0; j < uvs.length; j += 6) {
    const max = Math.max(uvs[j], uvs[j + 2], uvs[j + 4]);
    const min = Math.min(uvs[j], uvs[j + 2], uvs[j + 4]);
    if (max > 0.9 && min < 0.1) {
      if (uvs[j] < 0.2) uvs[j] += 1;
      if (uvs[j + 2] < 0.2) uvs[j + 2] += 1;
      if (uvs[j + 4] < 0.2) uvs[j + 4] += 1;
    }
  }
  return uvs;
}
