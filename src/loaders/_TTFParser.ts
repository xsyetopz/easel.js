import { BinaryReader } from "./_TTFBinaryReader.ts";
import { readCmap } from "./_TTFCmap.ts";
import { readCompoundContours } from "./_TTFCompound.ts";
import { readNames } from "./_TTFNames.ts";
import type { GlyphMetric, TableRecord } from "./_TTFParserTables.ts";
import {
  readFontHeader,
  readFontMetrics,
  readGlyphOffsets,
  readMetrics,
  readSimpleContours,
  readTableRecords,
} from "./_TTFParserTables.ts";

/** One point in a TrueType glyph outline. */
export interface OutlinePoint {
  /** Horizontal outline coordinate. */
  x: number;
  /** Vertical outline coordinate. */
  y: number;
  /** Whether this point lies on the curve. */
  onCurve: boolean;
}

/** Parsed metrics and contours for one TrueType glyph. */
export interface GlyphData {
  /** Glyph advance width in font units. */
  readonly advanceWidth: number;
  /** Minimum horizontal outline coordinate. */
  readonly xMin: number;
  /** Maximum horizontal outline coordinate. */
  readonly xMax: number;
  /** Closed glyph contours in source order. */
  readonly contours: readonly (readonly OutlinePoint[])[];
}

/** Parsed TrueType font metrics, naming tables, and glyph mappings. */
export class TrueTypeFontData {
  /** Number of font units per em square. */
  readonly unitsPerEm: number;
  /** Font ascender distance in font units. */
  readonly ascender: number;
  /** Font descender distance in font units. */
  readonly descender: number;
  /** Vertical position of the underline in font units. */
  readonly underlinePosition: number;
  /** Underline stroke thickness in font units. */
  readonly underlineThickness: number;
  /** Minimum horizontal font outline coordinate. */
  readonly xMin: number;
  /** Maximum horizontal font outline coordinate. */
  readonly xMax: number;
  /** Minimum vertical font outline coordinate. */
  readonly yMin: number;
  /** Maximum vertical font outline coordinate. */
  readonly yMax: number;
  /** Preferred family or full font name. */
  readonly familyName: string;
  /** Name table records keyed by normalized record name. */
  readonly nameRecords: Readonly<Record<string, string>>;
  /** Unicode code points mapped to glyph indices. */
  readonly cmap: ReadonlyMap<number, number>;
  readonly #tables: ReadonlyMap<string, TableRecord>;
  readonly #bytes: Uint8Array;
  readonly #glyphOffsets: readonly number[];
  readonly #metrics: readonly GlyphMetric[];
  readonly #glyphCache = new Map<number, GlyphData>();
  readonly #glyphStack = new Set<number>();

  /** Parses supported TrueType tables from the supplied font bytes. */
  constructor(bytes: Uint8Array) {
    this.#bytes = bytes;
    this.#tables = readTableRecords(bytes);
    const head = readFontHeader(this.#table("head"));
    this.unitsPerEm = head.unitsPerEm;
    this.xMin = head.xMin;
    this.yMin = head.yMin;
    this.xMax = head.xMax;
    this.yMax = head.yMax;
    const metrics = readFontMetrics(this.#table("maxp"), this.#table("hhea"));
    this.ascender = metrics.ascender;
    this.descender = metrics.descender;
    this.#metrics = readMetrics(
      this.#table("hmtx"),
      metrics.numberOfHMetrics,
      metrics.glyphCount,
    );
    this.#glyphOffsets = readGlyphOffsets(
      this.#table("loca"),
      metrics.glyphCount,
      head.indexToLocFormat,
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

  /** Returns and caches the parsed glyph outline at the given index. */
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
      let contours: OutlinePoint[][];
      if (contourCount >= 0) {
        contours = readSimpleContours(reader, contourCount);
      } else if (contourCount === -1) {
        contours = readCompoundContours(reader, (glyphIndex) =>
          this.glyph(glyphIndex),
        );
      } else {
        contours = [];
      }
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
}
