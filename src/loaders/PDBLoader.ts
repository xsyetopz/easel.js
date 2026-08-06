import { Geometry } from "../geometry/Geometry.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";

/** Atom tuple returned by {@link PDBLoader}; xyz, RGB byte color, element. */
export type PDBAtom = readonly [
  number,
  number,
  number,
  readonly [number, number, number],
  string,
];

/** JSON-compatible metadata returned with a parsed PDB asset. */
export interface PDBJSON {
  /** Parsed atom records in source order. */
  readonly atoms: readonly PDBAtom[];
}

/** CPU geometry and metadata produced by {@link PDBLoader.parse}. */
export interface PDBParseResult {
  /** Atom positions and per-atom CPK colors. */
  readonly geometryAtoms: Geometry;
  /** Bond endpoint positions as connected line pairs. */
  readonly geometryBonds: Geometry;
  /** Raw atom metadata for labels and inspection. */
  readonly json: PDBJSON;
}

const cpk: Record<string, readonly [number, number, number]> = {
  h: [255, 255, 255],
  c: [144, 144, 144],
  n: [48, 80, 248],
  o: [255, 13, 13],
  f: [144, 224, 80],
  p: [255, 128, 0],
  s: [255, 255, 48],
  cl: [31, 240, 31],
  br: [166, 41, 41],
  i: [148, 0, 148],
  fe: [224, 102, 51],
  mg: [138, 255, 0],
  ca: [61, 255, 0],
  zn: [125, 128, 176],
};
const fallbackColor: readonly [number, number, number] = [180, 180, 180];
const linePattern = /\r?\n/u;

function field(text: string, start: number, end: number): string {
  return text.slice(start, end).trim();
}

function titleCase(value: string): string {
  return value.length === 0
    ? value
    : value[0]?.toUpperCase() + value.slice(1).toLowerCase();
}

function atomElement(line: string): string {
  const declared = field(line, 76, 78).toLowerCase();
  if (declared) return declared;
  return field(line, 12, 14)
    .replace(/[^a-z]/giu, "")
    .toLowerCase();
}

function bondKey(start: number, end: number): string {
  return `${Math.min(start, end)}:${Math.max(start, end)}`;
}

/** Loads Protein Data Bank text into CPU atom and bond geometries. */
export class PDBLoader extends Loader {
  /** Loads a PDB resource through the configured loading manager. */
  override load(
    url: string,
    onLoad?: (result: PDBParseResult) => void,
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
      (text) => {
        try {
          onLoad?.(this.parse(String(text)));
        } catch (error) {
          onError?.(error);
        }
      },
      onProgress,
      onError,
    );
  }

  /** Parses PDB ATOM/HETATM and CONECT records into CPU geometry. */
  parse(text: string): PDBParseResult {
    const atoms: PDBAtom[] = [];
    const bySerial = new Map<number, PDBAtom>();
    const connections: Array<readonly [number, number]> = [];
    const bonds: Array<readonly [number, number]> = [];
    const bondKeys = new Set<string>();
    for (const line of text.split(linePattern)) {
      const record = line.slice(0, 6).trim();
      if (record === "ATOM" || record === "HETATM") {
        const serial = Number.parseInt(field(line, 6, 11), 10);
        const x = Number.parseFloat(field(line, 30, 38));
        const y = Number.parseFloat(field(line, 38, 46));
        const z = Number.parseFloat(field(line, 46, 54));
        if (![serial, x, y, z].every(Number.isFinite)) continue;
        const element = atomElement(line);
        const atom: PDBAtom = [
          x,
          y,
          z,
          cpk[element] ?? fallbackColor,
          titleCase(element),
        ];
        atoms.push(atom);
        if (Number.isFinite(serial)) bySerial.set(serial, atom);
      } else if (record === "CONECT") {
        const serial = Number.parseInt(field(line, 6, 11), 10);
        if (!Number.isFinite(serial)) continue;
        for (let offset = 11; offset < line.length; offset += 5) {
          const target = Number.parseInt(field(line, offset, offset + 5), 10);
          if (Number.isFinite(target)) connections.push([serial, target]);
        }
      }
    }
    for (const [serial, target] of connections) {
      if (!(bySerial.has(serial) && bySerial.has(target))) continue;
      const key = bondKey(serial, target);
      if (bondKeys.has(key)) continue;
      bondKeys.add(key);
      bonds.push([serial, target]);
    }
    const atomPositions: number[] = [];
    const atomColors: number[] = [];
    for (const atom of atoms) {
      atomPositions.push(atom[0], atom[1], atom[2]);
      atomColors.push(atom[3][0] / 255, atom[3][1] / 255, atom[3][2] / 255);
    }
    const bondPositions: number[] = [];
    for (const [startSerial, endSerial] of bonds) {
      const start = bySerial.get(startSerial);
      const end = bySerial.get(endSerial);
      if (!(start && end)) continue;
      bondPositions.push(start[0], start[1], start[2], end[0], end[1], end[2]);
    }
    const geometryAtoms = new Geometry()
      .setPositions(atomPositions)
      .setColors(atomColors);
    const geometryBonds = new Geometry().setPositions(bondPositions);
    return { geometryAtoms, geometryBonds, json: { atoms } };
  }
}
