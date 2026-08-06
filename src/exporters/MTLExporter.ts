import type { Node } from "../core/Node.ts";
import { Mesh } from "../objects/Mesh.ts";
import type { Texture } from "../textures/Texture.ts";

/** Options for deterministic Wavefront MTL output. */
export interface MTLExporterOptions {
  /** Overrides a texture's source path when it has no named source URL. */
  readonly texturePath?: (texture: Texture) => string | undefined;
}

/** Serializes EASEL CPU material state to Wavefront MTL text. */
export class MTLExporter {
  /** Converts materials used by a node hierarchy to deterministic MTL text. */
  parse(root: Node, options: MTLExporterOptions = {}): string {
    const materials = new Map<string, MaterialRecord>();
    root.traverse((node) => {
      if (!(node instanceof Mesh) || node.material === undefined) return;
      const material = node.material as MaterialLike;
      const name =
        material.name || `${material.type || "Material"}_${materials.size + 1}`;
      if (!materials.has(name))
        materials.set(name, toRecord(material, options));
    });

    const lines = ["# EASEL MTL export"];
    for (const [name, material] of materials) {
      lines.push(`newmtl ${name}`);
      lines.push(
        `Ka ${format(material.r)} ${format(material.g)} ${format(material.b)}`,
      );
      lines.push(
        `Kd ${format(material.r)} ${format(material.g)} ${format(material.b)}`,
      );
      lines.push("Ks 0 0 0");
      lines.push(`d ${format(material.opacity)}`);
      lines.push(`illum ${material.map === undefined ? 1 : 2}`);
      if (material.map !== undefined) lines.push(`map_Kd ${material.map}`);
      lines.push("");
    }
    return `${lines.join("\n")}`;
  }
}

interface MaterialLike {
  readonly name?: string;
  readonly type?: string;
  readonly color?: {
    readonly r: number;
    readonly g: number;
    readonly b: number;
  };
  readonly map?: Texture;
  readonly opacity?: number;
}

interface MaterialRecord {
  r: number;
  g: number;
  b: number;
  opacity: number;
  map: string | undefined;
}

function toRecord(
  material: MaterialLike,
  options: MTLExporterOptions,
): MaterialRecord {
  const color = material.color;
  const opacity = material.opacity === undefined ? 1 : 1 - material.opacity / 8;
  return {
    r: clamp(color?.r ?? 1),
    g: clamp(color?.g ?? 1),
    b: clamp(color?.b ?? 1),
    opacity: clamp(opacity),
    map: texturePath(material.map, options),
  };
}

function texturePath(
  texture: Texture | undefined,
  options: MTLExporterOptions,
): string | undefined {
  if (texture === undefined) return;
  const override = options.texturePath?.(texture);
  if (override !== undefined && override !== "") return override;
  if (texture.name !== "") return texture.name;
  const source = texture.source.toJSON().url;
  return typeof source === "string" && source !== "" ? source : undefined;
}

function clamp(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

function format(value: number): string {
  return String(Number(value.toFixed(6)));
}
