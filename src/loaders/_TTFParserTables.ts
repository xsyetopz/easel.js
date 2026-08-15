import { BinaryReader } from "./_TTFBinaryReader.ts";
import type { OutlinePoint } from "./_TTFParser.ts";

/** Byte range of a table within a TrueType font file. */
export interface TableRecord {
  /** Absolute byte offset where the table begins. */
  readonly offset: number;
  /** Number of bytes occupied by the table. */
  readonly length: number;
}

/** Horizontal metrics associated with one glyph. */
export interface GlyphMetric {
  /** Advance distance used when positioning the next glyph. */
  readonly advanceWidth: number;
  /** Horizontal offset from the glyph origin to its outline. */
  readonly leftSideBearing: number;
}

/** Bounds and location-format metadata from the TrueType head table. */
export interface FontHeader {
  /** Number of font units in one em square. */
  readonly unitsPerEm: number;
  /** Minimum horizontal outline coordinate in font units. */
  readonly xMin: number;
  /** Minimum vertical outline coordinate in font units. */
  readonly yMin: number;
  /** Maximum horizontal outline coordinate in font units. */
  readonly xMax: number;
  /** Maximum vertical outline coordinate in font units. */
  readonly yMax: number;
  /** Encoding used by the loca table for glyph offsets. */
  readonly indexToLocFormat: number;
}

/** Glyph count and horizontal layout metrics from a TrueType font. */
export interface FontMetrics {
  /** Total number of glyph records in the font. */
  readonly glyphCount: number;
  /** Number of glyphs with explicitly stored horizontal metrics. */
  readonly numberOfHMetrics: number;
  /** Distance from the baseline to the ascender line. */
  readonly ascender: number;
  /** Distance from the baseline to the descender line. */
  readonly descender: number;
}

/** Reads and validates the sfnt directory that indexes font tables. */
export function readTableRecords(
  bytes: Uint8Array,
): ReadonlyMap<string, TableRecord> {
  if (bytes.byteLength < 12)
    throw new RangeError("TTFLoader: truncated sfnt header.");
  const header = new BinaryReader(bytes);
  const scalarType = header.readUint32();
  if (scalarType !== 0x00010000 && scalarType !== 0x74727565)
    throw new Error("TTFLoader: only TrueType glyf outlines are supported.");
  const numTables = header.readUint16();
  header.skip(6);
  const tables = new Map<string, TableRecord>();
  for (let i = 0; i < numTables; i++) {
    const tag = header.readTag();
    header.skip(4);
    const offset = header.readUint32();
    const length = header.readUint32();
    if (offset + length > bytes.byteLength)
      throw new RangeError(`TTFLoader: table ${tag} exceeds the file bounds.`);
    tables.set(tag, { offset, length });
  }
  return tables;
}

/** Reads bounds and loca-format metadata from a TrueType head table. */
export function readFontHeader(bytes: Uint8Array): FontHeader {
  const reader = new BinaryReader(bytes);
  reader.skip(18);
  const unitsPerEm = reader.readUint16();
  if (unitsPerEm === 0)
    throw new RangeError("TTFLoader: unitsPerEm must be positive.");
  reader.skip(16);
  const xMin = reader.readInt16();
  const yMin = reader.readInt16();
  const xMax = reader.readInt16();
  const yMax = reader.readInt16();
  reader.skip(6);
  const indexToLocFormat = reader.readInt16();
  return { unitsPerEm, xMin, yMin, xMax, yMax, indexToLocFormat };
}

/** Reads glyph count and horizontal layout metrics from maxp and hhea tables. */
export function readFontMetrics(
  maxpBytes: Uint8Array,
  hheaBytes: Uint8Array,
): FontMetrics {
  const maxp = new BinaryReader(maxpBytes);
  maxp.skip(4);
  const glyphCount = maxp.readUint16();
  const hhea = new BinaryReader(hheaBytes);
  hhea.skip(4);
  const ascender = hhea.readInt16();
  const descender = hhea.readInt16();
  hhea.skip(26);
  const numberOfHMetrics = hhea.readUint16();
  if (numberOfHMetrics === 0 || numberOfHMetrics > glyphCount)
    throw new RangeError("TTFLoader: invalid hhea horizontal metric count.");
  return { glyphCount, numberOfHMetrics, ascender, descender };
}

/** Reads explicit metrics and extends the final advance width to all glyphs. */
export function readMetrics(
  bytes: Uint8Array,
  numberOfHMetrics: number,
  glyphCount: number,
): readonly GlyphMetric[] {
  const reader = new BinaryReader(bytes);
  const metrics: GlyphMetric[] = [];
  for (let i = 0; i < numberOfHMetrics; i++) {
    metrics.push({
      advanceWidth: reader.readUint16(),
      leftSideBearing: reader.readInt16(),
    });
  }
  const lastAdvance = metrics.at(-1)?.advanceWidth ?? 0;
  for (let i = numberOfHMetrics; i < glyphCount; i++)
    metrics.push({
      advanceWidth: lastAdvance,
      leftSideBearing: reader.readInt16(),
    });
  return metrics;
}

/** Reads the loca table and returns byte offsets for each glyph outline. */
export function readGlyphOffsets(
  bytes: Uint8Array,
  glyphCount: number,
  format: number,
): readonly number[] {
  const reader = new BinaryReader(bytes);
  const offsets: number[] = [];
  for (let i = 0; i <= glyphCount; i++)
    offsets.push(format === 0 ? reader.readUint16() * 2 : reader.readUint32());
  return offsets;
}

/** Decodes point flags, coordinates, and contour boundaries for a simple glyph. */
export function readSimpleContours(
  reader: BinaryReader,
  contourCount: number,
): OutlinePoint[][] {
  if (contourCount === 0) return [];
  if (contourCount < 0 || contourCount > 0x10000)
    throw new RangeError("TTFLoader: invalid simple glyph contour count.");
  const ends: number[] = [];
  for (let i = 0; i < contourCount; i++) ends.push(reader.readUint16());
  const pointCount = (ends.at(-1) ?? -1) + 1;
  if (pointCount <= 0 || pointCount > 0x100000)
    throw new RangeError("TTFLoader: invalid simple glyph point count.");
  const instructionLength = reader.readUint16();
  reader.skip(instructionLength);
  const flags: number[] = [];
  while (flags.length < pointCount) {
    const flag = reader.readUint8();
    flags.push(flag);
    if (flag & 0x08) {
      const repeat = reader.readUint8();
      for (let i = 0; i < repeat; i++) flags.push(flag);
    }
  }
  if (flags.length !== pointCount)
    throw new RangeError(
      "TTFLoader: simple glyph flag count does not match points.",
    );
  const xValues = readCoordinates(reader, flags, 0x02, 0x10);
  const yValues = readCoordinates(reader, flags, 0x04, 0x20);
  const points = flags.map((flag, index) => ({
    x: xValues[index] ?? 0,
    y: yValues[index] ?? 0,
    onCurve: (flag & 0x01) !== 0,
  }));
  const contours: OutlinePoint[][] = [];
  let start = 0;
  for (const end of ends) {
    contours.push(points.slice(start, end + 1));
    start = end + 1;
  }
  return contours;
}

function readCoordinates(
  reader: BinaryReader,
  flags: readonly number[],
  shortVector: number,
  sameOrPositive: number,
): number[] {
  const values: number[] = [];
  let coordinate = 0;
  for (const flag of flags) {
    if (flag & shortVector) {
      const delta = reader.readUint8();
      coordinate += flag & sameOrPositive ? delta : -delta;
    } else if (!(flag & sameOrPositive)) {
      coordinate += reader.readInt16();
    }
    values.push(coordinate);
  }
  return values;
}
