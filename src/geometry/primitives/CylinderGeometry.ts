import { Geometry } from "../Geometry.ts";

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

    const rs = Math.floor(radialSegments);
    const hs = Math.floor(heightSegments);

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    let index = 0;
    const indexArray: number[][] = [];

    // torso
    const slope = (radiusBottom - radiusTop) / height;
    const halfHeight = height / 2;

    for (let y = 0; y <= hs; y++) {
      const row: number[] = [];
      const v = y / hs;
      const radius = v * (radiusBottom - radiusTop) + radiusTop;

      for (let x = 0; x <= rs; x++) {
        const u = x / rs;
        const theta = u * thetaLength + thetaStart;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        positions.push(
          radius * sinTheta,
          -v * height + halfHeight,
          radius * cosTheta,
        );

        const nx = sinTheta;
        const ny = slope;
        const nz = cosTheta;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        normals.push(nx / len, ny / len, nz / len);

        uvs.push(u, 1 - v);
        row.push(index++);
      }
      indexArray.push(row);
    }

    for (let x = 0; x < rs; x++) {
      for (let y = 0; y < hs; y++) {
        const a = indexArray[y][x];
        const b = indexArray[y + 1][x];
        const c = indexArray[y + 1][x + 1];
        const d = indexArray[y][x + 1];
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    // caps
    if (!openEnded) {
      buildCap(true);
      buildCap(false);
    }

    function buildCap(top: boolean): void {
      const radius = top ? radiusTop : radiusBottom;
      if (radius === 0) return;

      const sign = top ? 1 : -1;
      const centerY = sign * halfHeight;
      const centerIndex = index;

      positions.push(0, centerY, 0);
      normals.push(0, sign, 0);
      uvs.push(0.5, 0.5);
      index++;

      for (let x = 0; x <= rs; x++) {
        const u = x / rs;
        const theta = u * thetaLength + thetaStart;
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);

        positions.push(radius * sinTheta, centerY, radius * cosTheta);
        normals.push(0, sign, 0);
        uvs.push(cosTheta * 0.5 + 0.5, sinTheta * 0.5 * sign + 0.5);
        index++;
      }

      for (let x = 0; x < rs; x++) {
        const first = centerIndex + x + 1;
        const second = centerIndex + x + 2;
        if (top) {
          indices.push(centerIndex, first, second);
        } else {
          indices.push(second, first, centerIndex);
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
