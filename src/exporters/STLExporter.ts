import type { Node } from "../core/Node.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Mesh } from "../objects/Mesh.ts";

const _matrix = new Matrix4();
const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();
const _normal = new Vector3();

/** Serializes EASEL mesh triangles to ASCII STL text. */
export class STLExporter {
  /** Converts a node hierarchy and its meshes into ASCII STL text. */
  parse(root: Node, name: string = "EASEL"): string {
    root.updateMatrixWorld(true, true, true);
    const lines: string[] = [`solid ${name}`];
    root.traverse((node) => {
      if (!(node instanceof Mesh && node.geometry)) return;
      const geometry = node.geometry;
      const position = geometry.getAttribute("position");
      if (!position) return;
      _matrix.copy(node.matrixWorld);
      const index = geometry.index;
      const emit = (a: number, b: number, c: number): void => {
        _a.set(
          position.getX(a),
          position.getY(a),
          position.getZ(a),
        ).applyMatrix4(_matrix);
        _b.set(
          position.getX(b),
          position.getY(b),
          position.getZ(b),
        ).applyMatrix4(_matrix);
        _c.set(
          position.getX(c),
          position.getY(c),
          position.getZ(c),
        ).applyMatrix4(_matrix);
        _normal
          .subVectors(_c, _b)
          .cross(new Vector3().subVectors(_a, _b))
          .normalize();
        lines.push(
          ` facet normal ${format(_normal.x)} ${format(_normal.y)} ${format(_normal.z)}`,
        );
        lines.push("  outer loop");
        lines.push(`   vertex ${format(_a.x)} ${format(_a.y)} ${format(_a.z)}`);
        lines.push(`   vertex ${format(_b.x)} ${format(_b.y)} ${format(_b.z)}`);
        lines.push(`   vertex ${format(_c.x)} ${format(_c.y)} ${format(_c.z)}`);
        lines.push("  endloop", " endfacet");
      };
      if (index) {
        for (let offset = 0; offset + 2 < index.length; offset += 3)
          emit(index[offset], index[offset + 1], index[offset + 2]);
      } else {
        for (let offset = 0; offset + 2 < position.count; offset += 3)
          emit(offset, offset + 1, offset + 2);
      }
    });
    lines.push(`endsolid ${name}`);
    return `${lines.join("\n")}\n`;
  }
}

function format(value: number): string {
  return Number.isFinite(value) ? String(Number(value.toFixed(6))) : "0";
}
