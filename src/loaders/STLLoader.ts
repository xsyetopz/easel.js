import { Geometry } from "../geometry/Geometry.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";

const NORMAL_PATTERN =
  /facet\s+normal\s+(?<x>[-+\d.eE]+)\s+(?<y>[-+\d.eE]+)\s+(?<z>[-+\d.eE]+)/giu;
const VERTEX_PATTERN =
  /vertex\s+(?<x>[-+\d.eE]+)\s+(?<y>[-+\d.eE]+)\s+(?<z>[-+\d.eE]+)/giu;

function parseAscii(text: string): Geometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const facetNormals: number[][] = [];
  let normalMatch: RegExpExecArray | null;
  normalMatch = NORMAL_PATTERN.exec(text);
  while (normalMatch !== null) {
    const { x, y, z } = normalMatch.groups ?? {};
    facetNormals.push([
      Number.parseFloat(x ?? "0"),
      Number.parseFloat(y ?? "0"),
      Number.parseFloat(z ?? "0"),
    ]);
    normalMatch = NORMAL_PATTERN.exec(text);
  }
  let vertexMatch: RegExpExecArray | null;
  let vertexIndex = 0;
  vertexMatch = VERTEX_PATTERN.exec(text);
  while (vertexMatch !== null) {
    const { x, y, z } = vertexMatch.groups ?? {};
    positions.push(
      Number.parseFloat(x ?? "0"),
      Number.parseFloat(y ?? "0"),
      Number.parseFloat(z ?? "0"),
    );
    const normal = facetNormals[Math.floor(vertexIndex / 3)] ?? [0, 0, 0];
    normals.push(normal[0] ?? 0, normal[1] ?? 0, normal[2] ?? 0);
    vertexIndex++;
    vertexMatch = VERTEX_PATTERN.exec(text);
  }
  const geometry = new Geometry().setPositions(positions);
  if (positions.length > 0 && facetNormals.length > 0)
    geometry.setNormals(normals);
  else geometry.computeVertexNormals();
  return geometry;
}

function parseBinary(data: ArrayBuffer): Geometry | undefined {
  if (data.byteLength < 84) return;
  const view = new DataView(data);
  const triangles = view.getUint32(80, true);
  if (triangles > Math.floor((data.byteLength - 84) / 50)) return;
  const positions: number[] = [];
  const normals: number[] = [];
  let offset = 84;
  for (let triangle = 0; triangle < triangles; triangle++) {
    const nx = view.getFloat32(offset, true);
    const ny = view.getFloat32(offset + 4, true);
    const nz = view.getFloat32(offset + 8, true);
    for (let vertex = 0; vertex < 3; vertex++) {
      const vertexOffset = offset + 12 + vertex * 12;
      positions.push(
        view.getFloat32(vertexOffset, true),
        view.getFloat32(vertexOffset + 4, true),
        view.getFloat32(vertexOffset + 8, true),
      );
      normals.push(nx, ny, nz);
    }
    offset += 50;
  }
  return new Geometry().setPositions(positions).setNormals(normals);
}

/** Loads ASCII or binary STL triangle data into CPU geometry. */
export class STLLoader extends Loader {
  /** Loads an STL resource through the configured loading manager. */
  override load(
    url: string,
    onLoad?: (geometry: Geometry) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (err: unknown) => void,
  ): void {
    const fileLoader = new FileLoader(this.manager);
    fileLoader.cache = this.cache;
    fileLoader.path = this.path;
    fileLoader.responseType = "arraybuffer";
    fileLoader.requestHeader = this.requestHeader;
    fileLoader.withCredentials = this.withCredentials;
    fileLoader.load(
      url,
      (data) => onLoad?.(this.parse(data as ArrayBuffer)),
      onProgress,
      onError,
    );
  }

  /** Parses ASCII text or binary STL data into triangle geometry. */
  override parse(data: string | ArrayBuffer): Geometry {
    if (typeof data === "string") return parseAscii(data);
    const binary = parseBinary(data);
    if (binary !== undefined && binary.getAttribute("position")?.count !== 0) {
      return binary;
    }
    return parseAscii(new TextDecoder().decode(data));
  }
}
