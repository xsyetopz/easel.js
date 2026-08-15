import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import type {
  PLYCustomPropertyMapping,
  PLYPropertyNameMapping,
  PLYScalarType,
} from "./_PLYLoaderHelpers.ts";
import { findList, findValue, mapPropertyName } from "./_PLYLoaderHelpers.ts";

interface PLYRecord {
  [name: string]: number | number[];
}

interface PLYElement {
  name: string;
  count: number;
  properties: { type: PLYScalarType | "list"; name: string }[];
}

function normalizeColor(
  value: number,
  type: PLYScalarType | undefined,
): number {
  if (
    type === "float" ||
    type === "float32" ||
    type === "double" ||
    type === "float64"
  )
    return value;
  return value > 1 ? value / 255 : value;
}

/** Extracts a guaranteed 3-element number tuple from an array of possibly-undefined values. */
function triple(values: (number | undefined)[]): [number, number, number] {
  return [values[0] ?? 0, values[1] ?? 0, values[2] ?? 0];
}

/** CPU vertex channels assembled from a PLY vertex element. */
export interface PLYVertexData {
  /** Position components in source order. */
  positions: number[];
  /** Normal components in source order. */
  normals: number[];
  /** Texture-coordinate components in source order. */
  uvs: number[];
  /** Vertex color components in source order. */
  colors: number[];
  /** Custom attributes keyed by their configured names. */
  custom: Map<string, number[]>;
}

const POSITION_NAMES = ["x", "y", "z"];
const NORMAL_NAMES = ["nx", "ny", "nz"];
const UV_NAMES = ["s", "t"];
const COLOR_NAMES = ["red", "green", "blue"];

function collectVertexAttributes(
  vertex: PLYRecord,
  customPropertyMapping: PLYCustomPropertyMapping,
  propertyNameMapping: PLYPropertyNameMapping,
  custom: Map<string, number[]>,
): void {
  for (const [name, propertyNames] of Object.entries(customPropertyMapping)) {
    const values = custom.get(name);
    if (!values) continue;
    for (const propertyName of propertyNames) {
      const mappedName = mapPropertyName(propertyName, propertyNameMapping);
      values.push(findValue(vertex, [mappedName]) ?? 0);
    }
  }
}

/** Processes all vertex records into typed attribute arrays. */
export function processVertices(
  vertices: PLYRecord[],
  vertexElement: PLYElement,
  customPropertyMapping: PLYCustomPropertyMapping,
  propertyNameMapping: PLYPropertyNameMapping,
): PLYVertexData {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const custom = new Map<string, number[]>();
  const typeByName = new Map(
    vertexElement.properties
      .filter((property) => property.type !== "list")
      .map((property) => [property.name, property.type as PLYScalarType]),
  );
  for (const [name] of Object.entries(customPropertyMapping))
    custom.set(name, []);
  for (const vertex of vertices) {
    const point = POSITION_NAMES.map((name) => findValue(vertex, [name]) ?? 0);
    positions.push(...triple(point));
    const normal = NORMAL_NAMES.map((name) => findValue(vertex, [name]));
    if (normal.every((value) => value !== undefined))
      normals.push(...triple(normal));
    const uv = UV_NAMES.map((name) => findValue(vertex, [name]));
    if (uv.every((value) => value !== undefined)) {
      const [u, v] = uv as number[];
      uvs.push(u, v);
    }
    const color = COLOR_NAMES.map((name) => findValue(vertex, [name]));
    if (color.every((value) => value !== undefined)) {
      const rgb = color as number[];
      for (let index = 0; index < 3; index++) {
        colors.push(
          normalizeColor(
            rgb[index] ?? 0,
            typeByName.get(COLOR_NAMES[index] ?? ""),
          ),
        );
      }
    }
    collectVertexAttributes(
      vertex,
      customPropertyMapping,
      propertyNameMapping,
      custom,
    );
  }
  return { positions, normals, uvs, colors, custom };
}

/** Builds triangle indices from face records using fan triangulation. */
export function processFaces(faces: PLYRecord[]): number[] {
  const indices: number[] = [];
  for (const face of faces) {
    const list = findList(face, ["vertex_indices", "vertex_index"]);
    if (!list || list.length < 3) continue;
    const first = list[0] ?? 0;
    for (let index = 1; index + 1 < list.length; index++)
      indices.push(first, list[index] ?? 0, list[index + 1] ?? 0);
  }
  return indices;
}

/** Finalizes a Geometry from processed vertex and face data. */
export function buildGeometry(
  data: PLYVertexData,
  indices: number[],
  customPropertyMapping: PLYCustomPropertyMapping,
): Geometry {
  const { positions, normals, uvs, colors, custom } = data;
  const geometry = new Geometry().setPositions(positions);
  if (indices.length > 0) geometry.index = indices;
  if (normals.length === positions.length) geometry.setNormals(normals);
  if (uvs.length === (positions.length / 3) * 2) geometry.setUVs(uvs);
  if (colors.length === positions.length) geometry.setColors(colors);
  for (const [name, values] of custom) {
    const itemSize = customPropertyMapping[name]?.length ?? 0;
    if (itemSize > 0 && values.length === (positions.length / 3) * itemSize)
      geometry.setAttribute(
        name,
        new Attribute(new Float32Array(values), itemSize),
      );
  }
  return geometry;
}
