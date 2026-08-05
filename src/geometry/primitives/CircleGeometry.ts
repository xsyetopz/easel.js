import { Geometry } from "../Geometry.ts";

/** Flat circle or circular sector on the XY plane with +Z normals. */
export class CircleGeometry extends Geometry {
  /** Constructs a circle or sector on the XY plane from radius, angles, and segments. */
  constructor(
    radius: number = 1,
    segments: number = 32,
    thetaStart: number = 0,
    thetaLength: number = Math.PI * 2,
  ) {
    super();

    this.type = "CircleGeometry";
    this.parameters = { radius, segments, thetaStart, thetaLength };

    const segmentCount = Math.max(3, Math.floor(segments));
    const positions = new Float32Array((segmentCount + 2) * 3);
    const normals = new Float32Array((segmentCount + 2) * 3);
    const uvs = new Float32Array((segmentCount + 2) * 2);
    const IndexArray = segmentCount + 2 > 65535 ? Uint32Array : Uint16Array;
    const indices = new IndexArray(segmentCount * 3);

    normals[2] = 1;
    uvs[0] = 0.5;
    uvs[1] = 0.5;

    for (let segment = 0; segment <= segmentCount; segment++) {
      const angle = thetaStart + (segment / segmentCount) * thetaLength;
      const vertex = segment + 1;
      const positionOffset = vertex * 3;
      const uvOffset = vertex * 2;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);

      positions[positionOffset] = x;
      positions[positionOffset + 1] = y;
      normals[positionOffset + 2] = 1;
      if (radius === 0) {
        uvs[uvOffset] = 0.5;
        uvs[uvOffset + 1] = 0.5;
      } else {
        uvs[uvOffset] = (x / radius + 1) / 2;
        uvs[uvOffset + 1] = (y / radius + 1) / 2;
      }
    }

    for (let segment = 0; segment < segmentCount; segment++) {
      const offset = segment * 3;
      indices[offset] = segment + 1;
      indices[offset + 1] = segment + 2;
      indices[offset + 2] = 0;
    }

    this.setPositions(positions);
    this.setNormals(normals);
    this.setUVs(uvs);
    this.index = indices;
  }
}
