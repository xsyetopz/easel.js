export interface OutlinePoint {
  x: number;
  y: number;
  onCurve: boolean;
}

export interface GlyphData {
  readonly advanceWidth: number;
  readonly xMin: number;
  readonly xMax: number;
  readonly contours: readonly (readonly OutlinePoint[])[];
}

interface TableRecord {
  readonly offset: number;
  readonly length: number;
}

interface GlyphMetric {
  readonly advanceWidth: number;
  readonly leftSideBearing: number;
}

const MORE_COMPONENTS = 0x0020;
const ARG_1_AND_2_ARE_WORDS = 0x0001;
const ARGS_ARE_XY_VALUES = 0x0002;
const WE_HAVE_A_SCALE = 0x0008;
const WE_HAVE_AN_X_AND_Y_SCALE = 0x0040;
const WE_HAVE_A_TWO_BY_TWO = 0x0080;
const WE_HAVE_INSTRUCTIONS = 0x0100;
const SCALED_COMPONENT_OFFSET = 0x0800;

export class TrueTypeFontData {
  readonly unitsPerEm: number;
  readonly ascender: number;
  readonly descender: number;
  readonly underlinePosition: number;
  readonly underlineThickness: number;
  readonly xMin: number;
  readonly xMax: number;
  readonly yMin: number;
  readonly yMax: number;
  readonly familyName: string;
  readonly nameRecords: Readonly<Record<string, string>>;
  readonly cmap: ReadonlyMap<number, number>;
  readonly #tables: ReadonlyMap<string, TableRecord>;
  readonly #bytes: Uint8Array;
  readonly #glyphOffsets: readonly number[];
  readonly #numberOfHMetrics: number;
  readonly #metrics: readonly GlyphMetric[];
  readonly #glyphCache = new Map<number, GlyphData>();
  readonly #glyphStack = new Set<number>();

  constructor(bytes: Uint8Array) {
    if (bytes.byteLength < 12)
      throw new RangeError("TTFLoader: truncated sfnt header.");
    this.#bytes = bytes;
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
        throw new RangeError(
          `TTFLoader: table ${tag} exceeds the file bounds.`,
        );
      tables.set(tag, { offset, length });
    }
    this.#tables = tables;
    const head = this.#table("head");
    const headReader = new BinaryReader(head);
    headReader.skip(18);
    this.unitsPerEm = headReader.readUint16();
    if (this.unitsPerEm === 0)
      throw new RangeError("TTFLoader: unitsPerEm must be positive.");
    headReader.skip(16);
    this.xMin = headReader.readInt16();
    this.yMin = headReader.readInt16();
    this.xMax = headReader.readInt16();
    this.yMax = headReader.readInt16();
    headReader.skip(6);
    const indexToLocFormat = headReader.readInt16();

    const maxp = new BinaryReader(this.#table("maxp"));
    maxp.skip(4);
    const glyphCount = maxp.readUint16();
    const hhea = new BinaryReader(this.#table("hhea"));
    hhea.skip(4);
    this.ascender = hhea.readInt16();
    this.descender = hhea.readInt16();
    hhea.skip(26);
    this.#numberOfHMetrics = hhea.readUint16();
    if (this.#numberOfHMetrics === 0 || this.#numberOfHMetrics > glyphCount)
      throw new RangeError("TTFLoader: invalid hhea horizontal metric count.");
    this.#metrics = readMetrics(
      this.#table("hmtx"),
      this.#numberOfHMetrics,
      glyphCount,
    );
    this.#glyphOffsets = readGlyphOffsets(
      this.#table("loca"),
      glyphCount,
      indexToLocFormat,
    );
    const names = readNames(this.#optionalTable("name"));
    this.nameRecords = names.records;
    this.familyName = names.fullName || names.familyName || "TrueType";
    const post = this.#optionalTable("post");
    if (post) {
      const postReader = new BinaryReader(post);
      postReader.skip(8);
      this.underlinePosition = postReader.readInt16();
      this.underlineThickness = postReader.readInt16();
    } else {
      this.underlinePosition = -100;
      this.underlineThickness = 50;
    }
    this.cmap = readCmap(this.#table("cmap"));
  }

  glyph(index: number): GlyphData | undefined {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= this.#glyphOffsets.length - 1
    )
      return;
    const cached = this.#glyphCache.get(index);
    if (cached) return cached;
    if (this.#glyphStack.has(index))
      throw new Error("TTFLoader: cyclic compound glyph.");
    this.#glyphStack.add(index);
    try {
      const start = this.#glyphOffsets[index] ?? 0;
      const end = this.#glyphOffsets[index + 1] ?? start;
      const metrics = this.#metrics[index] ?? this.#metrics.at(-1);
      if (!metrics) return;
      const glyphTable = this.#table("glyf");
      if (start === end) {
        const empty: GlyphData = {
          advanceWidth: metrics.advanceWidth,
          xMin: metrics.leftSideBearing,
          xMax: metrics.leftSideBearing,
          contours: [],
        };
        this.#glyphCache.set(index, empty);
        return empty;
      }
      const reader = new BinaryReader(glyphTable, start, end);
      const contourCount = reader.readInt16();
      const xMin = reader.readInt16();
      reader.skip(2);
      const xMax = reader.readInt16();
      reader.skip(2);
      const contours =
        contourCount >= 0
          ? readSimpleContours(reader, contourCount)
          : contourCount === -1
            ? this.#readCompoundContours(reader)
            : [];
      const result: GlyphData = {
        advanceWidth: metrics.advanceWidth,
        xMin,
        xMax,
        contours,
      };
      this.#glyphCache.set(index, result);
      return result;
    } finally {
      this.#glyphStack.delete(index);
    }
  }

  #table(tag: string): Uint8Array {
    const record = this.#tables.get(tag);
    if (!record)
      throw new Error(`TTFLoader: required ${tag} table is missing.`);
    return this.#bytes.subarray(record.offset, record.offset + record.length);
  }

  #optionalTable(tag: string): Uint8Array | undefined {
    const record = this.#tables.get(tag);
    return record
      ? this.#bytes.subarray(record.offset, record.offset + record.length)
      : undefined;
  }

  #readCompoundContours(reader: BinaryReader): OutlinePoint[][] {
    const contours: OutlinePoint[][] = [];
    let flags = 0;
    do {
      flags = reader.readUint16();
      const glyphIndex = reader.readUint16();
      const wordArguments = (flags & ARG_1_AND_2_ARE_WORDS) !== 0;
      const arg1 = wordArguments ? reader.readInt16() : reader.readInt8();
      const arg2 = wordArguments ? reader.readInt16() : reader.readInt8();
      let a = 1;
      let b = 0;
      let c = 0;
      let d = 1;
      if (flags & WE_HAVE_A_SCALE) {
        a = d = reader.readInt16() / 16384;
      } else if (flags & WE_HAVE_AN_X_AND_Y_SCALE) {
        a = reader.readInt16() / 16384;
        d = reader.readInt16() / 16384;
      } else if (flags & WE_HAVE_A_TWO_BY_TWO) {
        a = reader.readInt16() / 16384;
        b = reader.readInt16() / 16384;
        c = reader.readInt16() / 16384;
        d = reader.readInt16() / 16384;
      }
      const child = this.glyph(glyphIndex);
      if (!child) continue;
      const points = child.contours.flatMap((contour) =>
        contour.map((point) => ({
          x: a * point.x + c * point.y,
          y: b * point.x + d * point.y,
          onCurve: point.onCurve,
        })),
      );
      let offsetX = 0;
      let offsetY = 0;
      if (flags & ARGS_ARE_XY_VALUES) {
        offsetX = arg1;
        offsetY = arg2;
        if (flags & SCALED_COMPONENT_OFFSET) {
          const transformedX = a * offsetX + c * offsetY;
          const transformedY = b * offsetX + d * offsetY;
          offsetX = transformedX;
          offsetY = transformedY;
        }
      } else {
        const parent = contours.flatMap((contour) => contour)[arg1];
        const component = points[arg2];
        if (parent && component) {
          offsetX = parent.x - component.x;
          offsetY = parent.y - component.y;
        }
      }
      for (const contour of child.contours) {
        const transformed = contour.map((point) => ({
          x: a * point.x + c * point.y + offsetX,
          y: b * point.x + d * point.y + offsetY,
          onCurve: point.onCurve,
        }));
        contours.push(transformed);
      }
    } while (flags & MORE_COMPONENTS);
    if (flags & WE_HAVE_INSTRUCTIONS) {
      const instructionLength = reader.readUint16();
      reader.skip(instructionLength);
    }
    return contours;
  }
}

function readMetrics(
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

function readGlyphOffsets(
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

function readSimpleContours(
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

function readCmap(bytes: Uint8Array): ReadonlyMap<number, number> {
  const reader = new BinaryReader(bytes);
  reader.skip(2);
  const count = reader.readUint16();
  const records: Array<{ platform: number; encoding: number; offset: number }> =
    [];
  for (let i = 0; i < count; i++)
    records.push({
      platform: reader.readUint16(),
      encoding: reader.readUint16(),
      offset: reader.readUint32(),
    });
  const candidates = records
    .filter(
      (record) =>
        record.platform === 3 || record.platform === 0 || record.platform === 2,
    )
    .sort((left, right) => cmapPriority(right) - cmapPriority(left));
  for (const record of candidates) {
    const formatReader = new BinaryReader(bytes);
    formatReader.seek(record.offset);
    const format = formatReader.readUint16();
    const map =
      format === 12
        ? readCmapFormat12(formatReader)
        : format === 4
          ? readCmapFormat4(bytes, record.offset)
          : format === 0
            ? readCmapFormat0(formatReader)
            : undefined;
    if (map && map.size > 0) return map;
  }
  throw new Error("TTFLoader: no supported Unicode cmap subtable was found.");
}

function cmapPriority(record: {
  platform: number;
  encoding: number;
}): 1 | 2 | 3 | 4 {
  if (record.platform === 3 && record.encoding === 10) return 4;
  if (record.platform === 0) return 3;
  if (record.platform === 3 && record.encoding === 1) return 2;
  return 1;
}

function readCmapFormat0(reader: BinaryReader): Map<number, number> {
  reader.skip(2 + 2 + 2);
  const map = new Map<number, number>();
  for (let codePoint = 0; codePoint < 256; codePoint++)
    map.set(codePoint, reader.readUint8());
  return map;
}

function readCmapFormat12(reader: BinaryReader): Map<number, number> {
  reader.skip(2 + 4 + 4);
  const groups = reader.readUint32();
  const map = new Map<number, number>();
  for (let i = 0; i < groups; i++) {
    const start = reader.readUint32();
    const end = reader.readUint32();
    const glyph = reader.readUint32();
    for (let codePoint = start; codePoint <= end; codePoint++) {
      map.set(codePoint, glyph + codePoint - start);
      if (codePoint === 0x10ffff) break;
    }
  }
  return map;
}

function readCmapFormat4(
  bytes: Uint8Array,
  offset: number,
): Map<number, number> {
  const reader = new BinaryReader(bytes);
  reader.seek(offset);
  reader.readUint16();
  const length = reader.readUint16();
  reader.skip(2);
  const segmentCount = reader.readUint16() / 2;
  reader.skip(6);
  const endCodes: number[] = [];
  for (let i = 0; i < segmentCount; i++) endCodes.push(reader.readUint16());
  reader.skip(2);
  const startCodes: number[] = [];
  for (let i = 0; i < segmentCount; i++) startCodes.push(reader.readUint16());
  const deltas: number[] = [];
  for (let i = 0; i < segmentCount; i++) deltas.push(reader.readInt16());
  const rangeOffsetBase = reader.offset;
  const rangeOffsets: number[] = [];
  for (let i = 0; i < segmentCount; i++) rangeOffsets.push(reader.readUint16());
  const map = new Map<number, number>();
  for (let segment = 0; segment < segmentCount; segment++) {
    const start = startCodes[segment] ?? 0;
    const end = Math.min(endCodes[segment] ?? start, 0xffff);
    if (start > end || start === 0xffff) continue;
    const rangeOffset = rangeOffsets[segment] ?? 0;
    for (let codePoint = start; codePoint <= end; codePoint++) {
      let glyph = 0;
      if (rangeOffset === 0) {
        glyph = (codePoint + (deltas[segment] ?? 0)) & 0xffff;
      } else {
        const address =
          rangeOffsetBase + segment * 2 + rangeOffset + (codePoint - start) * 2;
        if (address + 2 <= offset + length)
          glyph = reader.view.getUint16(address, false);
        if (glyph !== 0) glyph = (glyph + (deltas[segment] ?? 0)) & 0xffff;
      }
      if (codePoint !== 0xffff) map.set(codePoint, glyph);
    }
  }
  return map;
}

function readNames(bytes: Uint8Array | undefined): {
  familyName: string;
  fullName: string;
  records: Readonly<Record<string, string>>;
} {
  if (!bytes) return { familyName: "", fullName: "", records: {} };
  const reader = new BinaryReader(bytes);
  const format = reader.readUint16();
  if (format > 1) return { familyName: "", fullName: "", records: {} };
  const count = reader.readUint16();
  const stringOffset = reader.readUint16();
  const records: Record<string, string> = {};
  for (let i = 0; i < count; i++) {
    const platform = reader.readUint16();
    reader.skip(2);
    reader.skip(2);
    const nameId = reader.readUint16();
    const length = reader.readUint16();
    const offset = reader.readUint16();
    const value = decodeName(
      bytes.subarray(stringOffset + offset, stringOffset + offset + length),
      platform,
    );
    if (!value) continue;
    const key =
      nameId === 1 ? "familyName" : nameId === 4 ? "fullName" : `name${nameId}`;
    if (!(key in records)) records[key] = value;
  }
  return {
    familyName: records["familyName"] ?? "",
    fullName: records["fullName"] ?? "",
    records,
  };
}

function decodeName(bytes: Uint8Array, platform: number): string {
  if (platform === 0 || platform === 3) {
    let value = "";
    for (let i = 0; i + 1 < bytes.length; i += 2)
      value += String.fromCharCode((bytes[i] ?? 0) * 256 + (bytes[i + 1] ?? 0));
    return value;
  }
  return new TextDecoder().decode(bytes);
}

export class BinaryReader {
  readonly #view: DataView;
  readonly #end: number;
  #offset: number;

  constructor(bytes: Uint8Array, start = 0, end = bytes.byteLength) {
    this.#view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.#offset = start;
    this.#end = end;
    if (start < 0 || end < start || end > bytes.byteLength)
      throw new RangeError("TTFLoader: invalid table bounds.");
  }

  get offset(): number {
    return this.#offset;
  }

  get view(): DataView {
    return this.#view;
  }

  seek(offset: number): void {
    if (offset < 0 || offset > this.#end)
      throw new RangeError("TTFLoader: read outside table bounds.");
    this.#offset = offset;
  }

  skip(length: number): void {
    this.seek(this.#offset + length);
  }

  readUint8(): number {
    this.#require(1);
    return this.#view.getUint8(this.#offset++);
  }

  readInt8(): number {
    this.#require(1);
    return this.#view.getInt8(this.#offset++);
  }

  readUint16(): number {
    this.#require(2);
    const value = this.#view.getUint16(this.#offset, false);
    this.#offset += 2;
    return value;
  }

  readInt16(): number {
    this.#require(2);
    const value = this.#view.getInt16(this.#offset, false);
    this.#offset += 2;
    return value;
  }

  readUint32(): number {
    this.#require(4);
    const value = this.#view.getUint32(this.#offset, false);
    this.#offset += 4;
    return value;
  }

  readTag(): string {
    return String.fromCharCode(
      this.readUint8(),
      this.readUint8(),
      this.readUint8(),
      this.readUint8(),
    );
  }

  #require(length: number): void {
    if (this.#offset + length > this.#end)
      throw new RangeError("TTFLoader: truncated table data.");
  }
}
