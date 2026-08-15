import type { Node } from "../core/Node.ts";
import { Matrix3 } from "../math/Matrix3.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Mesh } from "../objects/Mesh.ts";

const _matrix = new Matrix4();
const _point = new Vector3();
const _normal = new Vector3();
const _normalMatrix = new Matrix3();

/** Options controlling deterministic Wavefront OBJ output. */
export interface OBJExporterOptions {
  /** Optional companion MTL library referenced from the OBJ header. */
  readonly materialLibrary?: string;
}

/** Serializes EASEL mesh geometry to Wavefront OBJ text. */
export class OBJExporter {
  /** Converts a node hierarchy and its meshes into OBJ text. */
  parse(root: Node, options: OBJExporterOptions = {}): string {
    root.updateMatrixWorld(true, true, true);
    const lines: string[] = ["# EASEL OBJ export"];
    if (
      options.materialLibrary !== undefined &&
      options.materialLibrary !== ""
    ) {
      lines.push(`mtllib ${options.materialLibrary}`);
    }
    let vertexOffset = 1;
    root.traverse((node) => {
      if (!(node instanceof Mesh && node.geometry)) return;
      const geometry = node.geometry;
      const position = geometry.getAttribute("position");
      if (!position) return;
      const uv = geometry.getAttribute("uv");
      const normal = geometry.getAttribute("normal");
      const color = geometry.getAttribute("color");
      _matrix.copy(node.matrixWorld);
      _normalMatrix.getNormalMatrix(_matrix);
      lines.push(`o ${node.name || node.type}`);
      if (node.material?.name) lines.push(`usemtl ${node.material.name}`);
      const material = node.material as
        | { color?: unknown; map?: { uuid?: string } }
        | undefined;
      const materialColor = material?.color;
      if (
        materialColor &&
        typeof materialColor === "object" &&
        "hex" in materialColor
      ) {
        const hex = (materialColor as { hex: number }).hex
          .toString(16)
          .padStart(6, "0");
        lines.push(`# easel-material-color ${hex}`);
      }
      if (material?.map?.uuid)
        lines.push(`# easel-texture ${material.map.uuid}`);
      for (let index = 0; index < position.count; index++) {
        _point.set(
          position.getX(index),
          position.getY(index),
          position.getZ(index),
        );
        _point.applyMatrix4(_matrix);
        const suffix = color
          ? ` ${format(color.getX(index))} ${format(color.getY(index))} ${format(color.getZ(index))}`
          : "";
        lines.push(
          `v ${format(_point.x)} ${format(_point.y)} ${format(_point.z)}${suffix}`,
        );
      }
      if (uv) {
        for (let index = 0; index < position.count; index++) {
          lines.push(`vt ${format(uv.getX(index))} ${format(uv.getY(index))}`);
        }
      }
      if (normal) {
        for (let index = 0; index < position.count; index++) {
          _normal.set(
            normal.getX(index),
            normal.getY(index),
            normal.getZ(index),
          );
          _normal.applyNormalMatrix(_normalMatrix);
          lines.push(
            `vn ${format(_normal.x)} ${format(_normal.y)} ${format(_normal.z)}`,
          );
        }
      }
      const index = geometry.index;
      const emitFace = (a: number, b: number, c: number): void => {
        const face = [a, b, c].map((value) => {
          const vertex = vertexOffset + value;
          if (uv && normal) return `${vertex}/${vertex}/${vertex}`;
          if (uv) return `${vertex}/${vertex}`;
          if (normal) return `${vertex}//${vertex}`;
          return String(vertex);
        });
        lines.push(`f ${face.join(" ")}`);
      };
      if (index) {
        for (let offset = 0; offset + 2 < index.length; offset += 3) {
          emitFace(index[offset], index[offset + 1], index[offset + 2]);
        }
      } else {
        for (let offset = 0; offset + 2 < position.count; offset += 3) {
          emitFace(offset, offset + 1, offset + 2);
        }
      }
      vertexOffset += position.count;
    });
    return `${lines.join("\n")}\n`;
  }
}

function format(value: number): string {
  return Number.isFinite(value) ? String(Number(value.toFixed(6))) : "0";
}
