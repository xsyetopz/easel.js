import { Geometry } from "../geometry/Geometry.ts";
import { BasicMaterial } from "../materials/BasicMaterial.ts";
import type { Material } from "../materials/Material.ts";
import { Group } from "../objects/Group.ts";
import { Mesh } from "../objects/Mesh.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";
import type { MTLLoaderResult, MTLMaterialDefinition } from "./MTLLoader.ts";

interface ObjObject {
  name: string;
  vertices: number[];
  uvs: number[];
  normals: number[];
  indices: number[];
  keys: Map<string, number>;
  hasUV: boolean;
  hasNormal: boolean;
  materialName: string | undefined;
}

/** CPU material table supplied by the caller when an OBJ references an MTL file. */
export interface OBJLoaderOptions {
  /** Materials keyed by the names used by `usemtl` records. */
  readonly materials?: OBJMaterialTable;
}

/** CPU material map or the typed result returned by {@link MTLLoader}. */
export type OBJMaterialTable =
  | Readonly<Record<string, Material>>
  | Pick<MTLLoaderResult, "materials" | "definitions">;

interface ResolvedMaterialTable {
  readonly materials: Readonly<Record<string, Material>>;
  readonly definitions:
    | Readonly<Record<string, MTLMaterialDefinition>>
    | undefined;
}

function isMTLMaterialTable(
  value: OBJMaterialTable,
): value is Pick<MTLLoaderResult, "materials" | "definitions"> {
  return "materials" in value && "definitions" in value;
}

function resolveMaterialTable(
  table: OBJMaterialTable | undefined,
): ResolvedMaterialTable | undefined {
  if (table === undefined) return;
  if (isMTLMaterialTable(table)) {
    return {
      materials: table.materials,
      definitions: table.definitions,
    };
  }
  return { materials: table, definitions: undefined };
}

function isMaterialOptions(
  value: OBJLoaderOptions | OBJMaterialTable,
): value is OBJLoaderOptions {
  return "materials" in value && !("definitions" in value);
}

function resolveIndex(value: string, count: number): number | undefined {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed === 0) return;
  const index = parsed < 0 ? count + parsed : parsed - 1;
  return index >= 0 && index < count ? index : undefined;
}

function createObject(name: string, materialName?: string): ObjObject {
  return {
    name,
    vertices: [],
    uvs: [],
    normals: [],
    indices: [],
    keys: new Map(),
    hasUV: false,
    hasNormal: false,
    materialName,
  };
}

/** Loads Wavefront OBJ text into CPU geometry and a scene-graph group. */
export class OBJLoader extends Loader {
  #materials: OBJMaterialTable | undefined;

  /** Installs a CPU material map or parsed MTL table for subsequent parses. */
  setMaterials(value: OBJMaterialTable | undefined): this {
    this.#materials = value;
    return this;
  }

  /** Loads an OBJ resource through the configured loading manager. */
  override load(
    url: string,
    onLoad?: (group: Group) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (err: unknown) => void,
  ): void {
    const fileLoader = new FileLoader(this.manager);
    fileLoader.cache = this.cache;
    fileLoader.path = this.path;
    fileLoader.responseType = "text";
    fileLoader.requestHeader = this.requestHeader;
    fileLoader.withCredentials = this.withCredentials;
    fileLoader.load(
      url,
      (text) => onLoad?.(this.parse(String(text))),
      onProgress,
      onError,
    );
  }

  /** Parses Wavefront OBJ text into a group of meshes. */
  parse(
    text: string,
    options: OBJLoaderOptions | OBJMaterialTable = {},
  ): Group {
    const configuredTable = isMaterialOptions(options)
      ? options.materials
      : Object.keys(options).length === 0
        ? undefined
        : options;
    const materialTable = resolveMaterialTable(
      configuredTable ?? this.#materials,
    );
    const positions: number[][] = [];
    const uvs: number[][] = [];
    const normals: number[][] = [];
    const objects: ObjObject[] = [];
    let currentMaterialName: string | undefined;
    const inlineMaterialColors = new Map<string, number>();
    const libraries: string[] = [];
    let current = createObject("Object");
    objects.push(current);

    for (const rawLine of text.split(/\r?\n/u)) {
      const line = rawLine.trim();
      if (line === "") continue;
      if (line.startsWith("#")) {
        const colorMatch = line.match(
          /^#\s*easel-material-color\s+([0-9a-f]{6})$/iu,
        );
        if (colorMatch && currentMaterialName) {
          inlineMaterialColors.set(
            currentMaterialName,
            Number.parseInt(colorMatch[1]!, 16),
          );
        }
        continue;
      }
      const parts = line.split(/\s+/u);
      const command = parts[0];
      if (command === "mtllib") {
        libraries.push(...parts.slice(1));
      } else if (command === "usemtl") {
        currentMaterialName = parts.slice(1).join(" ") || undefined;
        if (current.indices.length > 0 || current.vertices.length > 0) {
          current = createObject(current.name, currentMaterialName);
          objects.push(current);
        } else {
          current.materialName = currentMaterialName;
        }
      }
      if (command === "v" && parts.length >= 4) {
        positions.push([
          Number.parseFloat(parts[1] ?? "0"),
          Number.parseFloat(parts[2] ?? "0"),
          Number.parseFloat(parts[3] ?? "0"),
        ]);
      } else if (command === "vt" && parts.length >= 3) {
        uvs.push([
          Number.parseFloat(parts[1] ?? "0"),
          Number.parseFloat(parts[2] ?? "0"),
        ]);
      } else if (command === "vn" && parts.length >= 4) {
        normals.push([
          Number.parseFloat(parts[1] ?? "0"),
          Number.parseFloat(parts[2] ?? "0"),
          Number.parseFloat(parts[3] ?? "0"),
        ]);
      } else if (command === "o" || command === "g") {
        const name = parts.slice(1).join(" ") || `Object${objects.length}`;
        if (current.indices.length === 0 && current.vertices.length === 0) {
          current.name = name;
        } else {
          current = createObject(name, currentMaterialName);
          objects.push(current);
        }
      } else if (command === "f" && parts.length >= 4) {
        const face: number[] = [];
        for (const token of parts.slice(1)) {
          const fields = token.split("/");
          const position = resolveIndex(fields[0] ?? "", positions.length);
          if (position === undefined) continue;
          const uv = fields[1]
            ? resolveIndex(fields[1], uvs.length)
            : undefined;
          const normal = fields[2]
            ? resolveIndex(fields[2], normals.length)
            : undefined;
          const key = `${position}/${uv ?? ""}/${normal ?? ""}`;
          let index = current.keys.get(key);
          if (index === undefined) {
            index = current.vertices.length / 3;
            const point = positions[position] ?? [0, 0, 0];
            current.vertices.push(point[0] ?? 0, point[1] ?? 0, point[2] ?? 0);
            const texcoord = uv === undefined ? [0, 0] : (uvs[uv] ?? [0, 0]);
            current.uvs.push(texcoord[0] ?? 0, texcoord[1] ?? 0);
            const direction =
              normal === undefined ? [0, 0, 0] : (normals[normal] ?? [0, 0, 0]);
            current.normals.push(
              direction[0] ?? 0,
              direction[1] ?? 0,
              direction[2] ?? 0,
            );
            current.keys.set(key, index);
            current.hasUV ||= uv !== undefined;
            current.hasNormal ||= normal !== undefined;
          }
          face.push(index);
        }
        for (let index = 1; index + 1 < face.length; index++) {
          current.indices.push(face[0]!, face[index]!, face[index + 1]!);
        }
      }
    }

    const group = new Group();
    for (const object of objects) {
      if (object.indices.length === 0) continue;
      const geometry = new Geometry().setPositions(object.vertices);
      geometry.index = object.indices;
      if (object.hasUV) geometry.setUVs(object.uvs);
      if (object.hasNormal) geometry.setNormals(object.normals);
      else geometry.computeVertexNormals();
      const configuredMaterial = object.materialName
        ? materialTable?.materials[object.materialName]
        : undefined;
      const material =
        configuredMaterial?.clone() ??
        new BasicMaterial({
          color: object.materialName
            ? (inlineMaterialColors.get(object.materialName) ?? 0xffffff)
            : 0xffffff,
        });
      if (object.materialName) material.name = object.materialName;
      const mesh = new Mesh(geometry, material);
      mesh.name = object.name;
      if (object.materialName)
        mesh.userData["materialName"] = object.materialName;
      const definition = object.materialName
        ? materialTable?.definitions?.[object.materialName]
        : undefined;
      if (definition?.mapKd !== undefined) {
        mesh.userData["mapKd"] = {
          path: definition.mapKd.path,
          url: definition.mapKd.url,
        };
      }
      group.add(mesh);
    }
    if (libraries.length > 0) group.userData["mtllib"] = libraries;
    return group;
  }
}
