import type { Node } from "../core/Node.ts";
import { Matrix3 } from "../math/Matrix3.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Mesh } from "../objects/Mesh.ts";

/** Options controlling deterministic PLY output. */
export interface PLYExporterOptions {
  /** Emits binary little-endian PLY instead of ASCII when true. */
  binary?: boolean;
}

interface PLYVertex {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  u: number;
  v: number;
  r: number;
  g: number;
  b: number;
}

interface PLYData {
  vertices: PLYVertex[];
  faces: [number, number, number][];
  hasNormals: boolean;
  hasUVs: boolean;
  hasColors: boolean;
}

const matrix = new Matrix4();
const normalMatrix = new Matrix3();
const position = new Vector3();
const normal = new Vector3();

/** Serializes EASEL mesh geometry to deterministic PLY text or binary data. */
export class PLYExporter {
  /** Converts a node hierarchy to ASCII PLY text by default. */
  parse(root: Node, options: PLYExporterOptions = {}): string | Uint8Array {
    const data = collect(root);
    return options.binary ? encodeBinary(data) : encodeAscii(data);
  }

  /** Converts a node hierarchy to binary little-endian PLY data. */
  parseBinary(root: Node): Uint8Array {
    return encodeBinary(collect(root));
  }
}

function collect(root: Node): PLYData {
  root.updateMatrixWorld(true, true, true);
  const vertices: PLYVertex[] = [];
  const faces: [number, number, number][] = [];
  let hasNormals = false;
  let hasUVs = false;
  let hasColors = false;
  root.traverse((node) => {
    if (!(node instanceof Mesh && node.geometry)) return;
    const geometry = node.geometry;
    const positions = geometry.getAttribute("position");
    if (!positions || positions.itemSize < 3) return;
    const normals = geometry.getAttribute("normal");
    const uvs = geometry.getAttribute("uv");
    const colors = geometry.getAttribute("color");
    hasNormals ||= normals !== undefined;
    hasUVs ||= uvs !== undefined;
    hasColors ||= colors !== undefined;
    matrix.copy(node.matrixWorld);
    normalMatrix.getNormalMatrix(matrix);
    const offset = vertices.length;
    for (let index = 0; index < positions.count; index++) {
      position.set(
        positions.getX(index),
        positions.getY(index),
        positions.getZ(index),
      );
      position.applyMatrix4(matrix);
      if (normals && normals.itemSize >= 3) {
        normal.set(
          normals.getX(index),
          normals.getY(index),
          normals.getZ(index),
        );
        normal.applyMatrix3(normalMatrix).normalize();
      }
      vertices.push({
        x: position.x,
        y: position.y,
        z: position.z,
        nx: normals ? normal.x : 0,
        ny: normals ? normal.y : 0,
        nz: normals ? normal.z : 0,
        u: uvs?.getX(index) ?? 0,
        v: uvs?.getY(index) ?? 0,
        r: toColorByte(colors?.getX(index) ?? 1),
        g: toColorByte(colors?.getY(index) ?? 1),
        b: toColorByte(colors?.getZ(index) ?? 1),
      });
    }
    const index = geometry.index;
    if (index) {
      for (let cursor = 0; cursor + 2 < index.length; cursor += 3) {
        faces.push([
          offset + index[cursor],
          offset + index[cursor + 1],
          offset + index[cursor + 2],
        ]);
      }
    } else {
      for (let cursor = 0; cursor + 2 < positions.count; cursor += 3) {
        faces.push([offset + cursor, offset + cursor + 1, offset + cursor + 2]);
      }
    }
  });
  return { vertices, faces, hasNormals, hasUVs, hasColors };
}

function encodeAscii(data: PLYData): string {
  const lines = [
    "ply",
    "format ascii 1.0",
    `element vertex ${data.vertices.length}`,
    "property float x",
    "property float y",
    "property float z",
  ];
  if (data.hasNormals)
    lines.push("property float nx", "property float ny", "property float nz");
  if (data.hasUVs) lines.push("property float s", "property float t");
  if (data.hasColors)
    lines.push(
      "property uchar red",
      "property uchar green",
      "property uchar blue",
    );
  lines.push(
    `element face ${data.faces.length}`,
    "property list uchar int vertex_indices",
    "end_header",
  );
  for (const vertex of data.vertices) {
    const values = [format(vertex.x), format(vertex.y), format(vertex.z)];
    if (data.hasNormals)
      values.push(format(vertex.nx), format(vertex.ny), format(vertex.nz));
    if (data.hasUVs) values.push(format(vertex.u), format(vertex.v));
    if (data.hasColors)
      values.push(String(vertex.r), String(vertex.g), String(vertex.b));
    lines.push(values.join(" "));
  }
  for (const face of data.faces)
    lines.push(`3 ${face[0]} ${face[1]} ${face[2]}`);
  return `${lines.join("\n")}\n`;
}

function encodeBinary(data: PLYData): Uint8Array {
  const headerText =
    encodeAscii(data)
      .split("end_header\n", 1)[0]
      ?.replace("format ascii 1.0", "format binary_little_endian 1.0") +
    "end_header\n";
  const vertexSize =
    12 +
    (data.hasNormals ? 12 : 0) +
    (data.hasUVs ? 8 : 0) +
    (data.hasColors ? 3 : 0);
  const bodySize = data.vertices.length * vertexSize + data.faces.length * 13;
  const output = new Uint8Array(
    new ArrayBuffer(new TextEncoder().encode(headerText).length + bodySize),
  );
  const headerBytes = new TextEncoder().encode(headerText);
  output.set(headerBytes);
  const view = new DataView(output.buffer, headerBytes.length);
  let offset = 0;
  for (const vertex of data.vertices) {
    view.setFloat32(offset, vertex.x, true);
    offset += 4;
    view.setFloat32(offset, vertex.y, true);
    offset += 4;
    view.setFloat32(offset, vertex.z, true);
    offset += 4;
    if (data.hasNormals) {
      view.setFloat32(offset, vertex.nx, true);
      offset += 4;
      view.setFloat32(offset, vertex.ny, true);
      offset += 4;
      view.setFloat32(offset, vertex.nz, true);
      offset += 4;
    }
    if (data.hasUVs) {
      view.setFloat32(offset, vertex.u, true);
      offset += 4;
      view.setFloat32(offset, vertex.v, true);
      offset += 4;
    }
    if (data.hasColors) {
      view.setUint8(offset++, vertex.r);
      view.setUint8(offset++, vertex.g);
      view.setUint8(offset++, vertex.b);
    }
  }
  for (const face of data.faces) {
    view.setUint8(offset++, 3);
    view.setUint32(offset, face[0], true);
    offset += 4;
    view.setUint32(offset, face[1], true);
    offset += 4;
    view.setUint32(offset, face[2], true);
    offset += 4;
  }
  return output;
}

function toColorByte(value: number): number {
  return Math.round(
    Math.min(1, Math.max(0, Number.isFinite(value) ? value : 1)) * 255,
  );
}

function format(value: number): string {
  return Number.isFinite(value) ? String(Number(value.toFixed(6))) : "0";
}
