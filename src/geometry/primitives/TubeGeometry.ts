import { Vector3 } from "../../math/Vector3.ts";
import { Geometry } from "../Geometry.ts";

interface CurvePoint {
  x: number;
  y: number;
  z?: number;
}

interface TubeCurve {
  getPointAt: (u: number) => CurvePoint;
  getTangentAt: (u: number) => CurvePoint;
}

interface TubeBuildOptions {
  path: TubeCurve;
  tubularSegments: number;
  radius: number;
  radialSegments: number;
  closed: boolean;
}

interface VertexRingOptions {
  centers: Vector3[];
  frameNormals: Vector3[];
  frameBinormals: Vector3[];
  segCount: number;
  radius: number;
  radialSegments: number;
}

interface TubeGeometryData {
  tangents: Vector3[];
  frameNormals: Vector3[];
  frameBinormals: Vector3[];
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
}

/** Samples curve points and tangents at uniform parameter intervals. */
function sampleCurve(
  path: TubeCurve,
  segCount: number,
  closed: boolean,
): { centers: Vector3[]; tangents: Vector3[] } {
  const centers: Vector3[] = [];
  const tangents: Vector3[] = [];
  const sampleCount = closed ? segCount : segCount + 1;

  for (let i = 0; i < sampleCount; i++) {
    const u = i / segCount;
    const pt = path.getPointAt(u);
    const tan = path.getTangentAt(u);
    centers.push(new Vector3(pt.x, pt.y, pt.z ?? 0));
    tangents.push(new Vector3(tan.x, tan.y, tan.z ?? 0).normalize());
  }

  return { centers, tangents };
}

/** Reflects a vector across a plane defined by direction v and its squared length c. */
function reflectVector(vec: Vector3, v: Vector3, c: number): Vector3 {
  return c > 0
    ? vec.clone().sub(v.clone().multiplyScalar((2 / c) * v.dot(vec)))
    : vec.clone();
}

/** Computes rotation-minimizing frames along the sampled curve. */
function computeFrames(
  centers: Vector3[],
  tangents: Vector3[],
): { normals: Vector3[]; binormals: Vector3[] } {
  const normals: Vector3[] = [];
  const binormals: Vector3[] = [];
  const sampleCount = centers.length;

  // Bootstrap initial frame: find a vector not parallel to the first tangent
  const t0 = tangents[0];
  const init =
    Math.abs(t0.x) > 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
  const n0 = new Vector3()
    .copy(init)
    .sub(t0.clone().multiplyScalar(t0.dot(init)))
    .normalize();
  normals.push(n0);
  binormals.push(new Vector3().copy(t0).cross(n0).normalize());

  for (let i = 1; i < sampleCount; i++) {
    const tPrev = tangents[i - 1];
    const tCurr = tangents[i];
    const nPrev = normals[i - 1];

    // Double-reflection (Wang et al.)
    const v1 = centers[i].clone().sub(centers[i - 1]);
    const c1 = v1.dot(v1);
    const nL = reflectVector(nPrev, v1, c1);
    const tL = reflectVector(tPrev, v1, c1);

    const v2 = tCurr.clone().sub(tL);
    const c2 = v2.dot(v2);
    const nCurr =
      c2 > 0
        ? nL.clone().sub(v2.clone().multiplyScalar((2 / c2) * v2.dot(nL)))
        : nL.clone();

    normals.push(nCurr.normalize());
    binormals.push(new Vector3().copy(tCurr).cross(nCurr).normalize());
  }

  return { normals, binormals };
}

/** Builds vertex positions, normals, and UVs for tube rings. */
function buildVertexRings(opts: VertexRingOptions): {
  positions: number[];
  vertexNormals: number[];
  uvs: number[];
} {
  const {
    centers,
    frameNormals,
    frameBinormals,
    segCount,
    radius,
    radialSegments,
  } = opts;
  const positions: number[] = [];
  const vertexNormals: number[] = [];
  const uvs: number[] = [];
  const sampleCount = centers.length;

  for (let i = 0; i < sampleCount; i++) {
    const center = centers[i];
    const normal = frameNormals[i];
    const binormal = frameBinormals[i];
    const uTube = i / segCount;

    for (let j = 0; j <= radialSegments; j++) {
      const theta = (j / radialSegments) * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const vx = cosT * normal.x + sinT * binormal.x;
      const vy = cosT * normal.y + sinT * binormal.y;
      const vz = cosT * normal.z + sinT * binormal.z;

      positions.push(
        center.x + radius * vx,
        center.y + radius * vy,
        center.z + radius * vz,
      );

      const nLen = Math.sqrt(vx * vx + vy * vy + vz * vz);
      vertexNormals.push(
        nLen > 0 ? vx / nLen : vx,
        nLen > 0 ? vy / nLen : vy,
        nLen > 0 ? vz / nLen : vz,
      );

      uvs.push(uTube, j / radialSegments);
    }
  }

  return { positions, vertexNormals, uvs };
}

/** Builds quad indices connecting adjacent tube rings. */
function buildRingIndices(
  segCount: number,
  radialSegments: number,
  closed: boolean,
  sampleCount: number,
): number[] {
  const indices: number[] = [];
  const ringVertCount = radialSegments + 1;

  for (let i = 0; i < segCount; i++) {
    const iNext = closed ? (i + 1) % sampleCount : i + 1;
    for (let j = 0; j < radialSegments; j++) {
      const a = i * ringVertCount + j;
      const b = iNext * ringVertCount + j;
      const c = iNext * ringVertCount + j + 1;
      const d = i * ringVertCount + j + 1;

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  return indices;
}

/** Builds all tube geometry data from the given options. */
function buildTubeData(options: TubeBuildOptions): TubeGeometryData {
  const { path, tubularSegments, radius, radialSegments, closed } = options;
  const segCount = tubularSegments;

  const { centers, tangents } = sampleCurve(path, segCount, closed);
  const { normals, binormals } = computeFrames(centers, tangents);
  const { positions, vertexNormals, uvs } = buildVertexRings({
    centers,
    frameNormals: normals,
    frameBinormals: binormals,
    segCount,
    radius,
    radialSegments,
  });
  const indices = buildRingIndices(
    segCount,
    radialSegments,
    closed,
    centers.length,
  );

  return {
    tangents,
    frameNormals: normals,
    frameBinormals: binormals,
    positions,
    normals: vertexNormals,
    uvs,
    indices,
  };
}

/**
 * Generates a tube along a 3D curve path with rotation-minimizing frames.
 *
 * Sampling is bounded by `tubularSegments` and `radialSegments`; no adaptive
 * subdivision is performed.
 */
export class TubeGeometry extends Geometry {
  /** Frame tangents sampled along the curve. */
  readonly tangents: Vector3[] = [];
  /** Frame normals sampled along the curve. */
  readonly normals: Vector3[] = [];
  /** Frame binormals sampled along the curve. */
  readonly binormals: Vector3[] = [];

  /** Sweeps a circular profile along a 3D curve using bounded rotation-minimizing frames. */
  constructor(
    path: TubeCurve,
    tubularSegments: number = 64,
    radius: number = 1,
    radialSegments: number = 8,
    closed: boolean = false,
  ) {
    super();

    this.type = "TubeGeometry";
    this.parameters = {
      path,
      tubularSegments,
      radius,
      radialSegments,
      closed,
    };

    const data = buildTubeData({
      path,
      tubularSegments,
      radius,
      radialSegments,
      closed,
    });

    this.tangents.push(...data.tangents);
    this.normals.push(...data.frameNormals);
    this.binormals.push(...data.frameBinormals);

    const vertexCount = data.positions.length / 3;
    const IndexArray = vertexCount > 65535 ? Uint32Array : Uint16Array;

    this.setPositions(new Float32Array(data.positions));
    this.setNormals(new Float32Array(data.normals));
    this.setUVs(new Float32Array(data.uvs));
    this.index = new IndexArray(data.indices);
    this.computeBoundingSphere();
  }

  /** Restores geometry from a JSON record. */
  fromJSON(json: Record<string, unknown>): this {
    void json;
    return this;
  }
}
