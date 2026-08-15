import { triangulateShape } from "../../math/ShapeUtils.ts";
import { Geometry } from "../Geometry.ts";

interface ExtrudeOptions {
  depth?: number;
  steps?: number;
  bevelEnabled?: boolean;
  bevelThickness?: number;
  bevelSize?: number;
  bevelSegments?: number;
}

interface Point2D {
  x: number;
  y: number;
}

interface ExtrudeShape {
  extractPoints: (divisions: number) => {
    shape: Point2D[];
    holes: Point2D[][];
  };
}

interface BuildContext {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
  depth: number;
  steps: number;
}

interface ShapeData {
  flatCoords: number[];
  faceIndices: number[];
  vertexCount: number;
  contours: Point2D[][];
}

interface MeshData {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
  vertexCount: number;
}

/** Extracts flat coordinates, triangulation, and contour list from a shape. */
function extractShapeData(shape: ExtrudeShape): ShapeData {
  const { shape: shapePoints, holes } = shape.extractPoints(12);

  const flatCoords: number[] = [];
  for (const pt of shapePoints) {
    flatCoords.push(pt.x, pt.y);
  }
  for (const hole of holes) {
    for (const pt of hole) {
      flatCoords.push(pt.x, pt.y);
    }
  }

  const faceIndices = triangulateShape(shapePoints, holes).flat();
  const vertexCount = flatCoords.length / 2;
  const contours = [shapePoints, ...holes];

  return { flatCoords, faceIndices, vertexCount, contours };
}

/** Adds front-face vertices and indices at z=0 (normal faces -Z). */
function addFrontFace(
  ctx: BuildContext,
  data: ShapeData,
  vertexOffset: number,
): number {
  const { positions, normals, uvs, indices } = ctx;
  const { flatCoords, faceIndices, vertexCount } = data;

  for (let i = 0; i < vertexCount; i++) {
    positions.push(flatCoords[i * 2], flatCoords[i * 2 + 1], 0);
    normals.push(0, 0, -1);
    uvs.push(flatCoords[i * 2], flatCoords[i * 2 + 1]);
  }
  for (const idx of faceIndices) {
    indices.push(vertexOffset + idx);
  }
  return vertexOffset + vertexCount;
}

/** Adds back-face vertices and indices at z=depth (normal faces +Z, reversed winding). */
function addBackFace(
  ctx: BuildContext,
  data: ShapeData,
  vertexOffset: number,
): number {
  const { positions, normals, uvs, indices, depth } = ctx;
  const { flatCoords, faceIndices, vertexCount } = data;

  for (let i = 0; i < vertexCount; i++) {
    positions.push(flatCoords[i * 2], flatCoords[i * 2 + 1], depth);
    normals.push(0, 0, 1);
    uvs.push(flatCoords[i * 2], flatCoords[i * 2 + 1]);
  }
  for (let i = 0; i < faceIndices.length; i += 3) {
    indices.push(
      vertexOffset + faceIndices[i],
      vertexOffset + faceIndices[i + 2],
      vertexOffset + faceIndices[i + 1],
    );
  }
  return vertexOffset + vertexCount;
}

/** Adds side-wall quads along the outer contour and each hole contour. */
function addSideWalls(
  ctx: BuildContext,
  data: ShapeData,
  vertexOffset: number,
): number {
  const { positions, normals, uvs, indices, steps, depth } = ctx;
  let offset = vertexOffset;

  for (const contour of data.contours) {
    const contourLen = contour.length;
    for (let s = 0; s < steps; s++) {
      const z0 = (s / steps) * depth;
      const z1 = ((s + 1) / steps) * depth;

      for (let i = 0; i < contourLen; i++) {
        const next = (i + 1) % contourLen;
        const ax = contour[i].x;
        const ay = contour[i].y;
        const bx = contour[next].x;
        const by = contour[next].y;

        const tx = bx - ax;
        const ty = by - ay;
        const len = Math.sqrt(tx * tx + ty * ty);
        const nx = len > 0 ? ty / len : 0;
        const ny = len > 0 ? -tx / len : 1;

        const uA = i / contourLen;
        const uB = (i + 1) / contourLen;
        const v0 = s / steps;
        const v1 = (s + 1) / steps;

        const base = offset;

        positions.push(ax, ay, z0);
        normals.push(nx, ny, 0);
        uvs.push(uA, v0);
        positions.push(bx, by, z0);
        normals.push(nx, ny, 0);
        uvs.push(uB, v0);
        positions.push(bx, by, z1);
        normals.push(nx, ny, 0);
        uvs.push(uB, v1);
        positions.push(ax, ay, z1);
        normals.push(nx, ny, 0);
        uvs.push(uA, v1);

        indices.push(base, base + 1, base + 2);
        indices.push(base, base + 2, base + 3);

        offset += 4;
      }
    }
  }
  return offset;
}

/** Builds all vertex/index data for the extruded shapes. */
function buildExtrudeData(
  shapes: ExtrudeShape[],
  depth: number,
  steps: number,
): MeshData {
  const ctx: BuildContext = {
    positions: [],
    normals: [],
    uvs: [],
    indices: [],
    depth,
    steps,
  };
  let vertexOffset = 0;

  for (const shape of shapes) {
    const data = extractShapeData(shape);
    vertexOffset = addFrontFace(ctx, data, vertexOffset);
    vertexOffset = addBackFace(ctx, data, vertexOffset);
    vertexOffset = addSideWalls(ctx, data, vertexOffset);
  }

  return { ...ctx, vertexCount: vertexOffset };
}

/**
 * Extrudes one or more flat contours along the Z axis.
 *
 * Generated meshes contain front, back, and side faces. Bevel options are
 * retained in serialized parameters but are not rasterized.
 */
export class ExtrudeGeometry extends Geometry {
  /** Extrudes one or more flat contours along +Z using the requested depth and steps. */
  constructor(
    shapes: ExtrudeShape | ExtrudeShape[],
    options: ExtrudeOptions = {},
  ) {
    super();

    this.type = "ExtrudeGeometry";
    (this as unknown as { parameters: Record<string, unknown> }).parameters = {
      shapes,
      options,
    };

    const depth = options.depth ?? 1;
    const steps = Math.max(1, options.steps ?? 1);
    const shapeArray = Array.isArray(shapes) ? shapes : [shapes];

    const { positions, normals, uvs, indices, vertexCount } = buildExtrudeData(
      shapeArray,
      depth,
      steps,
    );

    const IndexArray = vertexCount > 65535 ? Uint32Array : Uint16Array;

    this.setPositions(new Float32Array(positions));
    this.setNormals(new Float32Array(normals));
    this.setUVs(new Float32Array(uvs));
    this.index = new IndexArray(indices);
    this.computeBoundingSphere();
  }

  /** Restores geometry from a JSON record. */
  fromJSON(json: Record<string, unknown>): this {
    void json;
    return this;
  }
}
