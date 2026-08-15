import { BinaryReader } from "./_TTFBinaryReader.ts";

interface CmapRecord {
  readonly platform: number;
  readonly encoding: number;
  readonly offset: number;
}

/** Decodes the highest-priority supported Unicode cmap subtable. */
export function readCmap(bytes: Uint8Array): ReadonlyMap<number, number> {
  const reader = new BinaryReader(bytes);
  reader.skip(2);
  const count = reader.readUint16();
  const records: CmapRecord[] = [];
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
    const map = readCmapFormat(format, bytes, record.offset, formatReader);
    if (map && map.size > 0) return map;
  }
  throw new Error("TTFLoader: no supported Unicode cmap subtable was found.");
}

function cmapPriority(record: CmapRecord): 1 | 2 | 3 | 4 {
  if (record.platform === 3 && record.encoding === 10) return 4;
  if (record.platform === 0) return 3;
  if (record.platform === 3 && record.encoding === 1) return 2;
  return 1;
}

function readCmapFormat(
  format: number,
  bytes: Uint8Array,
  offset: number,
  reader: BinaryReader,
): Map<number, number> | undefined {
  if (format === 12) return readCmapFormat12(reader);
  if (format === 4) return readCmapFormat4(bytes, offset);
  if (format === 0) return readCmapFormat0(reader);
  return new Map<number, number>();
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
  const endCodes = readUint16Values(reader, segmentCount);
  reader.skip(2);
  const startCodes = readUint16Values(reader, segmentCount);
  const deltas = readInt16Values(reader, segmentCount);
  const rangeOffsetBase = reader.offset;
  const rangeOffsets = readUint16Values(reader, segmentCount);
  const map = new Map<number, number>();
  for (let segment = 0; segment < segmentCount; segment++) {
    readCmapFormat4Segment({
      reader,
      map,
      offset,
      length,
      rangeOffsetBase,
      segment,
      start: startCodes[segment] ?? 0,
      end: Math.min(endCodes[segment] ?? startCodes[segment] ?? 0, 0xffff),
      delta: deltas[segment] ?? 0,
      rangeOffset: rangeOffsets[segment] ?? 0,
    });
  }
  return map;
}

interface CmapFormat4Segment {
  readonly reader: BinaryReader;
  readonly map: Map<number, number>;
  readonly offset: number;
  readonly length: number;
  readonly rangeOffsetBase: number;
  readonly segment: number;
  readonly start: number;
  readonly end: number;
  readonly delta: number;
  readonly rangeOffset: number;
}

function readCmapFormat4Segment({
  reader,
  map,
  offset,
  length,
  rangeOffsetBase,
  segment,
  start,
  end,
  delta,
  rangeOffset,
}: CmapFormat4Segment): void {
  if (start > end || start === 0xffff) return;
  for (let codePoint = start; codePoint <= end; codePoint++) {
    let glyph = 0;
    if (rangeOffset === 0) {
      glyph = (codePoint + delta) & 0xffff;
    } else {
      const address =
        rangeOffsetBase + segment * 2 + rangeOffset + (codePoint - start) * 2;
      if (address + 2 <= offset + length)
        glyph = reader.view.getUint16(address, false);
      if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
    }
    if (codePoint !== 0xffff) map.set(codePoint, glyph);
  }
}

function readUint16Values(reader: BinaryReader, count: number): number[] {
  const values: number[] = [];
  for (let i = 0; i < count; i++) values.push(reader.readUint16());
  return values;
}

function readInt16Values(reader: BinaryReader, count: number): number[] {
  const values: number[] = [];
  for (let i = 0; i < count; i++) values.push(reader.readInt16());
  return values;
}
