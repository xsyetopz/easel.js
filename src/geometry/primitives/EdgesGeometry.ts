import { Geometry } from "../Geometry.ts";

/**
 * Extracts sharp edges from a source geometry.
 *
 * An edge is emitted when it has one adjacent face or when the angle between
 * adjacent face normals exceeds `thresholdAngle` degrees.
 */
export class EdgesGeometry extends Geometry {
  /** Serialization discriminator for this runtime type. */
  declare type: string;
  /** Primitive-construction parameters retained for serialization. */
  declare parameters: Record<string, unknown>;

  /** Extracts edges whose adjacent face normals exceed the angle threshold. */
  constructor(geometry: Geometry, thresholdAngle: number = 1) {
    super();

    this.type = "EdgesGeometry";
    this.parameters = { geometry, thresholdAngle };

    const thresholdDot = Math.cos((thresholdAngle * Math.PI) / 180);

    const posAttr = geometry.getAttribute("position");
    if (!posAttr) {
      this.setPositions(new Float32Array(0));
      return;
    }

    const srcPositions = posAttr.array;
    const srcIndex = geometry.index;

    const indexList: number[] = srcIndex
      ? Array.from(srcIndex)
      : Array.from({ length: srcPositions.length / 3 }, (_, i) => i);

    const edgeMap = _buildEdgeMap(indexList, srcPositions);

    const positions: number[] = [];
    for (const [, e] of edgeMap) {
      const [v0, v1, n0x, n0y, n0z, n1x, n1y, n1z] = e;
      const isSharp =
        n1x === -2 || n0x * n1x + n0y * n1y + n0z * n1z <= thresholdDot;
      if (isSharp) {
        positions.push(
          srcPositions[v0 * 3],
          srcPositions[v0 * 3 + 1],
          srcPositions[v0 * 3 + 2],
          srcPositions[v1 * 3],
          srcPositions[v1 * 3 + 1],
          srcPositions[v1 * 3 + 2],
        );
      }
    }

    this.setPositions(new Float32Array(positions));
  }
}

function _faceNormal(
  srcPositions: ArrayLike<number>,
  i: number,
  j: number,
  k: number,
): { nx: number; ny: number; nz: number } {
  const ax = srcPositions[i * 3];
  const ay = srcPositions[i * 3 + 1];
  const az = srcPositions[i * 3 + 2];
  const bx = srcPositions[j * 3];
  const by = srcPositions[j * 3 + 1];
  const bz = srcPositions[j * 3 + 2];
  const cx = srcPositions[k * 3];
  const cy = srcPositions[k * 3 + 1];
  const cz = srcPositions[k * 3 + 2];
  const ex = bx - ax;
  const ey = by - ay;
  const ez = bz - az;
  const fx = cx - ax;
  const fy = cy - ay;
  const fz = cz - az;
  const nx = ey * fz - ez * fy;
  const ny = ez * fx - ex * fz;
  const nz = ex * fy - ey * fx;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (len > 0) {
    return { nx: nx / len, ny: ny / len, nz: nz / len };
  }
  return { nx: 0, ny: 0, nz: 0 };
}

function _buildEdgeMap(
  indexList: number[],
  srcPositions: ArrayLike<number>,
): Map<string, number[]> {
  const edgeMap = new Map<string, number[]>();
  for (let i = 0; i < indexList.length; i += 3) {
    const a = indexList[i];
    const b = indexList[i + 1];
    const c = indexList[i + 2];
    const n = _faceNormal(srcPositions, a, b, c);
    for (const [v0, v1] of [
      [a, b],
      [b, c],
      [c, a],
    ]) {
      const key = v0 < v1 ? `${v0}_${v1}` : `${v1}_${v0}`;
      const entry = edgeMap.get(key);
      if (entry) {
        entry[5] = n.nx;
        entry[6] = n.ny;
        entry[7] = n.nz;
      } else {
        edgeMap.set(key, [v0, v1, n.nx, n.ny, n.nz, -2, -2, -2]);
      }
    }
  }
  return edgeMap;
}
