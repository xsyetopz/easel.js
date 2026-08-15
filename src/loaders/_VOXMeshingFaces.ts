type Axis = 0 | 1 | 2;
type Triple = [number, number, number];

/** CPU mesh buffers produced from a greedy-meshed VOX voxel volume. */
export interface VOXMeshData {
  /** Vertex positions in EASEL coordinates, grouped as XYZ triples. */
  readonly vertices: number[];
  /** Triangle indices into VOXMeshData.vertices. */
  readonly indices: number[];
  /** Per-vertex RGB colors, grouped as normalized triples. */
  readonly colors: number[];
  /** Packed RGBA palette used to decode voxel color indices. */
  readonly palette: readonly number[];
}

interface AxisDimensions {
  readonly depth: number;
  readonly width: number;
  readonly height: number;
}
function axisDimensions(dims: Triple, axis: Axis): AxisDimensions {
  if (axis === 0) return { depth: dims[0], width: dims[1], height: dims[2] };
  if (axis === 1) return { depth: dims[1], width: dims[2], height: dims[0] };
  return { depth: dims[2], width: dims[0], height: dims[1] };
}
function axisVector(axis: Axis, value: number): Triple {
  if (axis === 0) return [value, 0, 0];
  if (axis === 1) return [0, value, 0];
  return [0, 0, value];
}
function voxelColor(volume: Uint8Array, dims: Triple, point: Triple): number {
  const index = point[0] + point[1] * dims[0] + point[2] * dims[0] * dims[1];
  return volume[index] ?? 0;
}

interface FaceMaskContext {
  readonly volume: Uint8Array;
  readonly dims: Triple;
  readonly axis: Axis;
  readonly slice: number;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly normal: Triple;
}
function faceMaskColor(context: FaceMaskContext, point: Triple): number {
  const behind =
    context.slice > 0
      ? voxelColor(context.volume, context.dims, [
          point[0] - context.normal[0],
          point[1] - context.normal[1],
          point[2] - context.normal[2],
        ])
      : 0;
  const infront =
    context.slice < context.depth
      ? voxelColor(context.volume, context.dims, point)
      : 0;
  if (behind > 0 && infront === 0) return behind;
  if (infront > 0 && behind === 0) return -infront;
  return 0;
}
function buildFaceMask(context: FaceMaskContext): Int16Array {
  const mask = new Int16Array(context.width * context.height);
  let cursor = 0;
  for (let vv = 0; vv < context.height; vv++) {
    for (let uu = 0; uu < context.width; uu++) {
      const point: Triple = [0, 0, 0];
      point[context.axis] = context.slice;
      point[((context.axis + 1) % 3) as Axis] = uu;
      point[((context.axis + 2) % 3) as Axis] = vv;
      mask[cursor] = faceMaskColor(context, point);
      cursor++;
    }
  }
  return mask;
}
function toEasel(point: Triple, dims: Triple): Triple {
  return [
    point[0] - dims[0] / 2,
    point[2] - dims[2] / 2,
    -point[1] + dims[1] / 2,
  ];
}

interface FaceContext {
  readonly mesh: VOXMeshData;
  readonly mask: Int16Array;
  readonly dims: Triple;
  readonly axis: Axis;
  readonly slice: number;
  readonly u: number;
  readonly v: number;
  readonly width: number;
  readonly height: number;
  readonly colorCode: number;
}

interface FaceVerticesContext {
  readonly position: Triple;
  readonly dims: Triple;
  readonly axis: Axis;
  readonly width: number;
  readonly height: number;
}
function faceVertices(context: FaceVerticesContext): Triple[] {
  const { position, dims, axis, width, height } = context;
  const du = axisVector(((axis + 1) % 3) as Axis, width);
  const dv = axisVector(((axis + 2) % 3) as Axis, height);
  return [
    toEasel(position, dims),
    toEasel(
      [position[0] + du[0], position[1] + du[1], position[2] + du[2]],
      dims,
    ),
    toEasel(
      [
        position[0] + du[0] + dv[0],
        position[1] + du[1] + dv[1],
        position[2] + du[2] + dv[2],
      ],
      dims,
    ),
    toEasel(
      [position[0] + dv[0], position[1] + dv[1], position[2] + dv[2]],
      dims,
    ),
  ];
}
function appendFaceColor(mesh: VOXMeshData, colorCode: number): void {
  const packed = mesh.palette[Math.abs(colorCode)] ?? 0xffffffff;
  const red = (packed & 0xff) / 255;
  const green = ((packed >> 8) & 0xff) / 255;
  const blue = ((packed >> 16) & 0xff) / 255;
  for (let vertex = 0; vertex < 4; vertex++) mesh.colors.push(red, green, blue);
}

interface ClearMaskContext {
  readonly mask: Int16Array;
  readonly dims: Triple;
  readonly axis: Axis;
  readonly u: number;
  readonly v: number;
  readonly width: number;
  readonly height: number;
}
function clearMask(context: ClearMaskContext): void {
  const { mask, dims, axis, u, v, width, height } = context;
  const { width: maskWidth } = axisDimensions(dims, axis);
  for (let row = 0; row < height; row++)
    for (let column = 0; column < width; column++)
      mask[u + column + (v + row) * maskWidth] = 0;
}
function appendFace(context: FaceContext): void {
  const { mesh, mask, dims, axis, slice, u, v, width, height, colorCode } =
    context;
  const position: Triple = [0, 0, 0];
  position[axis] = slice;
  position[((axis + 1) % 3) as Axis] = u;
  position[((axis + 2) % 3) as Axis] = v;
  const vertices = faceVertices({ position, dims, axis, width, height });
  const vertexIndex = mesh.vertices.length / 3;
  if (colorCode > 0)
    mesh.vertices.push(
      ...vertices[0],
      ...vertices[1],
      ...vertices[2],
      ...vertices[3],
    );
  else
    mesh.vertices.push(
      ...vertices[0],
      ...vertices[3],
      ...vertices[2],
      ...vertices[1],
    );
  mesh.indices.push(
    vertexIndex,
    vertexIndex + 1,
    vertexIndex + 2,
    vertexIndex,
    vertexIndex + 2,
    vertexIndex + 3,
  );
  appendFaceColor(mesh, colorCode);
  clearMask({ mask, dims, axis, u, v, width, height });
}

interface MaskMergeContext {
  readonly mesh: VOXMeshData;
  readonly mask: Int16Array;
  readonly dims: Triple;
  readonly axis: Axis;
  readonly slice: number;
}

interface FaceSizeContext {
  readonly mask: Int16Array;
  readonly cursor: number;
  readonly width: number;
  readonly height: number;
  readonly u: number;
  readonly v: number;
}
function findFaceSize(context: FaceSizeContext): {
  width: number;
  height: number;
} {
  const { mask, cursor, width, height, u, v } = context;
  const colorCode = mask[cursor] ?? 0;
  let faceWidth = 1;
  while (u + faceWidth < width && mask[cursor + faceWidth] === colorCode)
    faceWidth++;
  let faceHeight = 1;
  let done = false;
  while (v + faceHeight < height && !done) {
    for (let k = 0; k < faceWidth; k++) {
      if (mask[cursor + k + faceHeight * width] !== colorCode) {
        done = true;
        break;
      }
    }
    if (!done) faceHeight++;
  }
  return { width: faceWidth, height: faceHeight };
}
function mergeMaskFaces(context: MaskMergeContext): void {
  const { mesh, mask, dims, axis, slice } = context;
  const { width, height } = axisDimensions(dims, axis);
  for (let vv = 0; vv < height; vv++) {
    for (let uu = 0; uu < width; ) {
      const cursor = uu + vv * width;
      const colorCode = mask[cursor] ?? 0;
      if (colorCode === 0) {
        uu++;
        continue;
      }
      const faceSize = findFaceSize({
        mask,
        cursor,
        width,
        height,
        u: uu,
        v: vv,
      });
      appendFace({
        mesh,
        mask,
        dims,
        axis,
        slice,
        u: uu,
        v: vv,
        width: faceSize.width,
        height: faceSize.height,
        colorCode,
      });
      uu += faceSize.width;
    }
  }
}

/** Builds indexed triangle buffers by merging coplanar exposed voxel faces.
 *
 * @param volume Occupancy and palette-index bytes in source X/Y/Z order.
 * @param dims Volume dimensions as source X, Y, and Z lengths.
 * @param palette Packed RGBA colors indexed by voxel palette value.
 * @returns Greedy-meshed positions, indices, vertex colors, and palette.
 */
export function buildGreedyMeshData(
  volume: Uint8Array,
  dims: Triple,
  palette: readonly number[],
): VOXMeshData {
  const mesh: VOXMeshData = {
    vertices: [],
    indices: [],
    colors: [],
    palette,
  };
  const axes: readonly Axis[] = [0, 1, 2];
  for (const axis of axes) {
    const { depth, width, height } = axisDimensions(dims, axis);
    for (let slice = 0; slice <= depth; slice++) {
      const mask = buildFaceMask({
        volume,
        dims,
        axis,
        slice,
        width,
        height,
        depth,
        normal: axisVector(axis, 1),
      });
      mergeMaskFaces({ mesh, mask, dims, axis, slice });
    }
  }
  return mesh;
}
