import type { Shape } from "../curves/Shape.ts";
import { ShapePath } from "../curves/ShapePath.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";
import { TrueTypeFontData } from "./_TTFParser.ts";
import { outlineToString, parseGlyphPath, round } from "./_TTFGlyph.ts";

/** One glyph in the JSON shape returned by THREE's TTFLoader. */
export interface TTFGlyph {
  /** Horizontal advance in the 1000-unit font coordinate system. */
  readonly ha: number;
  /** Left side bearing bound in the 1000-unit coordinate system. */
  readonly x_min: number;
  /** Right side glyph bound in the 1000-unit coordinate system. */
  readonly x_max: number;
  /** Space-separated FontLoader outline commands. */
  readonly o: string;
}

/** Font bounding box in the source font's units-per-em coordinate system. */
export interface TTFBoundingBox {
  /** Minimum horizontal font bound in source units. */
  readonly xMin: number;
  /** Maximum horizontal font bound in source units. */
  readonly xMax: number;
  /** Minimum vertical font bound in source units. */
  readonly yMin: number;
  /** Maximum vertical font bound in source units. */
  readonly yMax: number;
}

/** Parsed TrueType data compatible with THREE's `Font` constructor. */
export interface TTFLoaderResult {
  /** Parsed glyph records keyed by Unicode character. */
  /** @see TTFGlyph */
  readonly glyphs: Readonly<Record<string, TTFGlyph>>;
  /** Full font name from the name table. */
  readonly familyName: string;
  /** Typographic ascender in the normalized 1000-unit scale. */
  readonly ascender: number;
  /** Typographic descender in the normalized 1000-unit scale. */
  readonly descender: number;
  /** Underline position from the source font. */
  readonly underlinePosition: number;
  /** Underline thickness from the source font. */
  readonly underlineThickness: number;
  /** Font bounds in source units. */
  readonly boundingBox: TTFBoundingBox;
  /** Normalized glyph resolution. */
  readonly resolution: 1000;
  /** Name-table records retained from the source font. */
  readonly original_font_information: Readonly<Record<string, string>>;
}

/** Text directions accepted by {@link TTFFont.generateShapes}. */
export type TTFDirection = "ltr" | "rtl" | "tb";

/**
 * CPU font adapter that turns TTFLoader data into EASEL `Shape` contours.
 *
 * The returned shapes are ordinary curve data and can be passed directly to
 * `ShapeGeometry`; no browser font, WebGL resource, or GPU text path is used.
 */
export class TTFFont {
  /** Type-test flag matching THREE's `Font` object. */
  readonly isFont = true;
  /** Serialization discriminator matching THREE's `Font` object. */
  readonly type = "Font";
  /** Raw data returned by {@link TTFLoader.parse}. */
  readonly data: TTFLoaderResult;

  /** Constructs a CPU font adapter around parsed TrueType data. */
  constructor(data: TTFLoaderResult) {
    this.data = data;
  }

  /**
   * Generates EASEL shape contours for text at the requested font size.
   *
   * The coordinate and line-break behavior follows THREE's `Font` adapter:
   * sizes are in the source `resolution` units, newline advances by the font
   * bounding-box height, and `rtl`/`tb` reverse the source character order.
   */
  generateShapes(
    text: string,
    size = 100,
    direction: TTFDirection = "ltr",
  ): Shape[] {
    if (!Number.isFinite(size) || size < 0)
      throw new RangeError(
        "TTFFont.generateShapes size must be finite and non-negative.",
      );
    const scale = size / this.data.resolution;
    const lineHeight =
      (this.data.boundingBox.yMax -
        this.data.boundingBox.yMin +
        this.data.underlineThickness) *
      scale;
    const chars = Array.from(text);
    if (direction === "rtl" || direction === "tb") chars.reverse();

    const paths: ShapePath[] = [];
    let offsetX = 0;
    let offsetY = 0;
    for (const char of chars) {
      if (char === "\n") {
        offsetX = 0;
        offsetY -= lineHeight;
        continue;
      }
      const glyph = this.data.glyphs[char] ?? this.data.glyphs["?"];
      if (!glyph) continue;
      const path = parseGlyphPath(glyph.o, scale, offsetX, offsetY);
      paths.push(path);
      if (direction === "tb") {
        offsetX = 0;
        offsetY += this.data.ascender * scale;
      } else {
        offsetX += glyph.ha * scale;
      }
    }

    const shapes: Shape[] = [];
    for (const path of paths) shapes.push(...path.toShapes());
    return shapes;
  }
}

/**
 * Loads binary TrueType files and converts their outlines to FontLoader JSON.
 *
 * The parser supports the `cmap`, `head`, `hhea`, `hmtx`, `loca`, `glyf`,
 * `name`, and `post` tables used by regular TrueType fonts, including simple
 * and compound glyphs. CFF/OpenType outlines are intentionally rejected
 * because they require a different CPU decoder.
 */
export class TTFLoader extends Loader {
  /** Whether parsed contours should be emitted in reverse winding order. */
  reversed = false;

  /** Loads and parses a binary TrueType resource. */
  override load(
    url: string,
    onLoad?: (result: TTFLoaderResult) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (error: unknown) => void,
  ): void {
    const fileLoader = new FileLoader(this.manager);
    fileLoader.cache = this.cache;
    fileLoader.path = this.path;
    fileLoader.responseType = "arraybuffer";
    fileLoader.requestHeader = this.requestHeader;
    fileLoader.withCredentials = this.withCredentials;
    fileLoader.load(
      url,
      (data) => {
        try {
          onLoad?.(this.parse(data as ArrayBuffer));
        } catch (error) {
          onError?.(error);
        }
      },
      onProgress,
      onError,
    );
  }

  /** Parses a regular TrueType sfnt into THREE-compatible font JSON. */
  parse(data: ArrayBuffer | Uint8Array): TTFLoaderResult {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const font = new TrueTypeFontData(bytes);
    const scale = 100000 / (font.unitsPerEm * 72);
    const glyphs: Record<string, TTFGlyph> = {};
    for (const [codePoint, glyphIndex] of font.cmap) {
      const glyph = font.glyph(glyphIndex);
      if (!glyph) continue;
      const token: TTFGlyph = {
        ha: round(glyph.advanceWidth * scale),
        x_min: round(glyph.xMin * scale),
        x_max: round(glyph.xMax * scale),
        o: outlineToString(glyph.contours, scale, this.reversed),
      };
      const character = String.fromCodePoint(codePoint);
      glyphs[character] = token;
    }

    return {
      glyphs,
      familyName: font.familyName,
      ascender: round(font.ascender * scale),
      descender: round(font.descender * scale),
      underlinePosition: font.underlinePosition,
      underlineThickness: font.underlineThickness,
      boundingBox: {
        xMin: font.xMin,
        xMax: font.xMax,
        yMin: font.yMin,
        yMax: font.yMax,
      },
      resolution: 1000,
      original_font_information: font.nameRecords,
    };
  }
}
