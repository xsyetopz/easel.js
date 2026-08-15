import { Geometry } from "../Geometry.ts";

/** Mutable buffers shared across torso and cap builders. */
interface CylinderBuffers {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
  vertexCount: number;
}

/** Vertex/index payload produced by {@link buildCylinderData}. */
interface CylinderData {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
}

/** Parameters for {@link buildCylinderData}. */
interface CylinderBuildOptions {
  radiusTop: number;
  radiusBottom: number;
  height: number;
  radialSegments: number;
  heightSegments: number;
  openEnded: boolean;
  thetaStart: number;
  thetaLength: number;
}

/** Cylinder or truncated cone with optional end caps. */
export class CylinderGeometry extends Geometry {
  /** Serialization discriminator for this runtime type. */
  declare type: string;
  /** Primitive-construction parameters retained for serialization. */
  declare parameters: Record<string, unknown>;

  /** Constructs a cylinder or truncated cone with segmented side and optional caps. */
  constructor(
    radiusTop: number = 1,
    radiusBottom: number = 1,
    height: number = 1,
    radialSegments: number = 32,
    heightSegments: number = 1,
    openEnded: boolean = false,
    thetaStart: number = 0,
    thetaLength: number = Math.PI * 2,
  ) {
    super();

    this.type = "CylinderGeometry";
    this.parameters = {
      radiusTop,
      radiusBottom,
      height,
      radialSegments,
      heightSegments,
      openEnded,
      thetaStart,
      thetaLength,
    };

    const data = buildCylinderData({
      radiusTop,
      radiusBottom,
      height,
      radialSegments,
      heightSegments,
      openEnded,
      thetaStart,
      thetaLength,
    });

    this.setPositions(new Float32Array(data.positions));
    this.setNormals(new Float32Array(data.normals));
    this.setUVs(new Float32Array(data.uvs));
    const IndexArray =
      data.positions.length / 3 > 65535 ? Uint32Array : Uint16Array;
    this.index = new IndexArray(data.indices);
  }
}

/** Builds the torso and optional cap geometry for a cylinder or truncated cone. */
function buildCylinderData(opts: CylinderBuildOptions): CylinderData {
  const buffers: CylinderBuffers = {
    positions: [],
    normals: [],
    uvs: [],
    indices: [],
    vertexCount: 0,
  };

  buildTorso(buffers, opts);

  if (!opts.openEnded) {
    buildCap(buffers, opts, true);
    buildCap(buffers, opts, false);
  }

  return {
    positions: buffers.positions,
    normals: buffers.normals,
    uvs: buffers.uvs,
    indices: buffers.indices,
  };
}

/** Builds the segmented torso (side wall) vertices and indices. */
function buildTorso(
  buffers: CylinderBuffers,
  opts: CylinderBuildOptions,
): void {
  const { radiusTop, radiusBottom, height, thetaStart, thetaLength } = opts;
  const rs = Math.floor(opts.radialSegments);
  const hs = Math.floor(opts.heightSegments);

  const slope = (radiusBottom - radiusTop) / height;
  const halfHeight = height / 2;
  const indexArray: number[][] = [];

  for (let y = 0; y <= hs; y++) {
    const row: number[] = [];
    const v = y / hs;
    const radius = v * (radiusBottom - radiusTop) + radiusTop;

    for (let x = 0; x <= rs; x++) {
      const u = x / rs;
      const theta = u * thetaLength + thetaStart;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      buffers.positions.push(
        radius * sinTheta,
        -v * height + halfHeight,
        radius * cosTheta,
      );

      const nx = sinTheta;
      const ny = slope;
      const nz = cosTheta;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      buffers.normals.push(nx / len, ny / len, nz / len);

      buffers.uvs.push(u, 1 - v);
      row.push(buffers.vertexCount++);
    }
    indexArray.push(row);
  }

  for (let x = 0; x < rs; x++) {
    for (let y = 0; y < hs; y++) {
      const a = indexArray[y][x];
      const b = indexArray[y + 1][x];
      const c = indexArray[y + 1][x + 1];
      const d = indexArray[y][x + 1];
      buffers.indices.push(a, b, d);
      buffers.indices.push(b, c, d);
    }
  }
}

/** Builds a single end cap (top or bottom) vertices and indices. */
function buildCap(
  buffers: CylinderBuffers,
  opts: CylinderBuildOptions,
  top: boolean,
): void {
  const { radiusTop, radiusBottom, height, thetaStart, thetaLength } = opts;
  const rs = Math.floor(opts.radialSegments);

  const radius = top ? radiusTop : radiusBottom;
  if (radius === 0) return;

  const sign = top ? 1 : -1;
  const halfHeight = height / 2;
  const centerY = sign * halfHeight;
  const centerIndex = buffers.vertexCount;

  buffers.positions.push(0, centerY, 0);
  buffers.normals.push(0, sign, 0);
  buffers.uvs.push(0.5, 0.5);
  buffers.vertexCount++;

  for (let x = 0; x <= rs; x++) {
    const u = x / rs;
    const theta = u * thetaLength + thetaStart;
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);

    buffers.positions.push(radius * sinTheta, centerY, radius * cosTheta);
    buffers.normals.push(0, sign, 0);
    buffers.uvs.push(cosTheta * 0.5 + 0.5, sinTheta * 0.5 * sign + 0.5);
    buffers.vertexCount++;
  }

  for (let x = 0; x < rs; x++) {
    const first = centerIndex + x + 1;
    const second = centerIndex + x + 2;
    if (top) {
      buffers.indices.push(centerIndex, first, second);
    } else {
      buffers.indices.push(second, first, centerIndex);
    }
  }
}
