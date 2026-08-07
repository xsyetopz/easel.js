import type { Attribute } from "../geometry/Attribute.ts";
import { decodeHsl16, encodeHsl16 } from "./Hsl16.ts";
import { clamp, fastTrunc } from "./MathUtils.ts";
import type { Matrix3 } from "./Matrix3.ts";
import type { Vector3 } from "./Vector3.ts";

/** RGB channels represented as normalized values in [0, 1]. */
export interface RGB {
  /** Red channel. */
  r: number;
  /** Green channel. */
  g: number;
  /** Blue channel. */
  b: number;
}

/** HSL channels represented with normalized hue, saturation, and lightness. */
export interface HSL {
  /** Hue normalized to the interval [0, 1]. */
  h: number;
  /** Saturation normalized to the interval [0, 1]. */
  s: number;
  /** Lightness normalized to the interval [0, 1]. */
  l: number;
}

/** Tuple containing normalized red, green, and blue channels. */
export type RGBArray = [number, number, number];

/** Accepted color input: Color, packed RGB number, or CSS color string. */
export type ColorValue = number | string | Color;

/** Number of hue degrees represented by a full normalized hue turn. */
export const COLOR_HUE_SCALE = 360;
/** Percentage scale used when formatting saturation. */
export const COLOR_SATURATION_SCALE = 100;
/** Percentage scale used when formatting lightness. */
export const COLOR_LIGHTNESS_SCALE = 100;
/** Byte scale used when packing normalized RGB channels. */
export const COLOR_RGB_SCALE = 255;

/** Converts a supported color value to integer RGB channel values in [0, 255]. */
export function colorToRgb(color: ColorValue): RGB {
  const tempColor = new Color(color);
  return {
    r: fastTrunc(tempColor.r * COLOR_RGB_SCALE),
    g: fastTrunc(tempColor.g * COLOR_RGB_SCALE),
    b: fastTrunc(tempColor.b * COLOR_RGB_SCALE),
  };
}

/** Decodes a packed 16-bit HSL integer into a new Color. */
export function colorFromHsl16(value: number): Color {
  const { h, s, l } = decodeHsl16(value);
  return new Color().setHSL(h, s, l);
}

function clampChannel(value: number): number {
  return clamp(value, 0, 1);
}

function srgbToLinearChannel(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function linearToSrgbChannel(value: number): number {
  const clamped = clamp(value, 0, 1);
  return clamped <= 0.0031308
    ? clamped * 12.92
    : 1.055 * clamped ** (1 / 2.4) - 0.055;
}

/** Common CSS color name to hex value lookup. */
const CSS_COLOR_NAMES: Record<string, number> = {
  aliceblue: 0xf0f8ff,
  antiquewhite: 0xfaebd7,
  aqua: 0x00ffff,
  aquamarine: 0x7fffd4,
  azure: 0xf0ffff,
  beige: 0xf5f5dc,
  bisque: 0xffe4c4,
  black: 0x000000,
  blue: 0x0000ff,
  blueviolet: 0x8a2be2,
  brown: 0xa52a2a,
  burlywood: 0xdeb887,
  cadetblue: 0x5f9ea0,
  chartreuse: 0x7fff00,
  chocolate: 0xd2691e,
  coral: 0xff7f50,
  cornflowerblue: 0x6495ed,
  cornsilk: 0xfff8dc,
  crimson: 0xdc143c,
  cyan: 0x00ffff,
  darkblue: 0x00008b,
  darkcyan: 0x008b8b,
  darkgoldenrod: 0xb8860b,
  darkgray: 0xa9a9a9,
  darkgreen: 0x006400,
  darkgrey: 0xa9a9a9,
  darkkhaki: 0xbdb76b,
  darkmagenta: 0x8b008b,
  darkolivegreen: 0x556b2f,
  darkorange: 0xff8c00,
  darkorchid: 0x9932cc,
  darkred: 0x8b0000,
  darksalmon: 0xe9967a,
  darkseagreen: 0x8fbc8f,
  darkslateblue: 0x483d8b,
  darkslategray: 0x2f4f4f,
  darkslategrey: 0x2f4f4f,
  darkturquoise: 0x00ced1,
  darkviolet: 0x9400d3,
  deeppink: 0xff1493,
  deepskyblue: 0x00bfff,
  dimgray: 0x696969,
  dimgrey: 0x696969,
  dodgerblue: 0x1e90ff,
  firebrick: 0xb22222,
  floralwhite: 0xfffaf0,
  forestgreen: 0x228b22,
  fuchsia: 0xff00ff,
  gainsboro: 0xdcdcdc,
  ghostwhite: 0xf8f8ff,
  gold: 0xffd700,
  goldenrod: 0xdaa520,
  gray: 0x808080,
  green: 0x008000,
  greenyellow: 0xadff2f,
  grey: 0x808080,
  honeydew: 0xf0fff0,
  hotpink: 0xff69b4,
  indianred: 0xcd5c5c,
  indigo: 0x4b0082,
  ivory: 0xfffff0,
  khaki: 0xf0e68c,
  lavender: 0xe6e6fa,
  lavenderblush: 0xfff0f5,
  lawngreen: 0x7cfc00,
  lemonchiffon: 0xfffacd,
  lightblue: 0xadd8e6,
  lightcoral: 0xf08080,
  lightcyan: 0xe0ffff,
  lightgoldenrodyellow: 0xfafad2,
  lightgray: 0xd3d3d3,
  lightgreen: 0x90ee90,
  lightgrey: 0xd3d3d3,
  lightpink: 0xffb6c1,
  lightsalmon: 0xffa07a,
  lightseagreen: 0x20b2aa,
  lightskyblue: 0x87cefa,
  lightslategray: 0x778899,
  lightslategrey: 0x778899,
  lightsteelblue: 0xb0c4de,
  lightyellow: 0xffffe0,
  lime: 0x00ff00,
  limegreen: 0x32cd32,
  linen: 0xfaf0e6,
  magenta: 0xff00ff,
  maroon: 0x800000,
  mediumaquamarine: 0x66cdaa,
  mediumblue: 0x0000cd,
  mediumorchid: 0xba55d3,
  mediumpurple: 0x9370db,
  mediumseagreen: 0x3cb371,
  mediumslateblue: 0x7b68ee,
  mediumspringgreen: 0x00fa9a,
  mediumturquoise: 0x48d1cc,
  mediumvioletred: 0xc71585,
  midnightblue: 0x191970,
  mintcream: 0xf5fffa,
  mistyrose: 0xffe4e1,
  moccasin: 0xffe4b5,
  navajowhite: 0xffdead,
  navy: 0x000080,
  oldlace: 0xfdf5e6,
  olive: 0x808000,
  olivedrab: 0x6b8e23,
  orange: 0xffa500,
  orangered: 0xff4500,
  orchid: 0xda70d6,
  palegoldenrod: 0xeee8aa,
  palegreen: 0x98fb98,
  paleturquoise: 0xafeeee,
  palevioletred: 0xdb7093,
  papayawhip: 0xffefd5,
  peachpuff: 0xffdab9,
  peru: 0xcd853f,
  pink: 0xffc0cb,
  plum: 0xdda0dd,
  powderblue: 0xb0e0e6,
  purple: 0x800080,
  rebeccapurple: 0x663399,
  red: 0xff0000,
  rosybrown: 0xbc8f8f,
  royalblue: 0x4169e1,
  saddlebrown: 0x8b4513,
  salmon: 0xfa8072,
  sandybrown: 0xf4a460,
  seagreen: 0x2e8b57,
  seashell: 0xfff5ee,
  sienna: 0xa0522d,
  silver: 0xc0c0c0,
  skyblue: 0x87ceeb,
  slateblue: 0x6a5acd,
  slategray: 0x708090,
  slategrey: 0x708090,
  snow: 0xfffafa,
  springgreen: 0x00ff7f,
  steelblue: 0x4682b4,
  tan: 0xd2b48c,
  teal: 0x008080,
  thistle: 0xd8bfd8,
  tomato: 0xff6347,
  turquoise: 0x40e0d0,
  violet: 0xee82ee,
  wheat: 0xf5deb3,
  white: 0xffffff,
  whitesmoke: 0xf5f5f5,
  yellow: 0xffff00,
  yellowgreen: 0x9acd32,
};

/** RGB color with channel values in [0, 1]. */
export class Color {
  /** Red channel. */
  r: number = 1;
  /** Green channel. */
  g: number = 1;
  /** Blue channel. */
  b: number = 1;

  /** Type marker identifying Color instances. */
  readonly isColor = true;

  /**
   * Accepts a single ColorValue or three separate r, g, b components.
   * With no arguments the color is initialised to black.
   */
  constructor();
  /** Constructs a color from normalized RGB components or a supported color value. */
  constructor(value: ColorValue);
  /** Constructs a color from normalized RGB components or a supported color value. */
  constructor(r: number, g: number, b: number);
  /** Constructs a color from normalized RGB components or a supported color value. */
  constructor(...args: [] | [ColorValue] | [number, number, number]) {
    if (args.length === 3) {
      this.setRGB(args[0], args[1], args[2]);
    } else if (args.length === 1) {
      this.set(args[0]);
    } else {
      this.r = 0;
      this.g = 0;
      this.b = 0;
    }
  }

  /** Packed 24-bit RGB value with each normalized channel clamped and rounded to [0, 255]. */
  get hex(): number {
    const r = Math.round(clampChannel(this.r) * COLOR_RGB_SCALE);
    const g = Math.round(clampChannel(this.g) * COLOR_RGB_SCALE);
    const b = Math.round(clampChannel(this.b) * COLOR_RGB_SCALE);
    return (r << 16) | (g << 8) | b;
  }

  /** Decodes a packed 24-bit RGB number into normalized channels. */
  set hex(value: number) {
    this.#setHex(value);
  }

  /** Lower-case six-digit hexadecimal representation of the packed RGB value. */
  get hexString(): string {
    return this.hex.toString(16).padStart(6, "0");
  }

  /** Opaque CSS `rgb(r,g,b)` string generated from normalized channels. */
  get style(): string {
    const r = Math.round(clampChannel(this.r) * COLOR_RGB_SCALE);
    const g = Math.round(clampChannel(this.g) * COLOR_RGB_SCALE);
    const b = Math.round(clampChannel(this.b) * COLOR_RGB_SCALE);
    return `rgb(${r},${g},${b})`;
  }

  /** Parses a supported CSS color string into normalized channels. */
  set style(value: string) {
    this.#setStyle(value);
  }

  /** HSL channels derived from the normalized RGB channels. */
  get hsl(): HSL {
    const r = this.r;
    const g = this.g;
    const b = this.b;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    let h = 0;
    let s = 0;
    const l = (min + max) / 2;

    if (min !== max) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      h =
        max === r
          ? (g - b) / d + (g < b ? 6 : 0)
          : max === g
            ? (b - r) / d + 2
            : (r - g) / d + 4;
      h /= 6;
    }

    return { h, s, l };
  }

  /** Packs normalized HSL channels into the compact 16-bit HSL representation. */
  get hsl16(): number {
    const { h, s, l } = this.hsl;
    return encodeHsl16(h, s, l);
  }

  /** CSS `hsl(...)` string using integer degree and percentage fields. */
  get hslString(): string {
    const hsl = this.hsl;

    const h = fastTrunc(hsl.h * COLOR_HUE_SCALE);
    const s = fastTrunc(hsl.s * COLOR_SATURATION_SCALE);
    const l = fastTrunc(hsl.l * COLOR_LIGHTNESS_SCALE);
    return `hsl(${h},${s}%,${l}%)`;
  }

  /** Returns a new instance with the same component values. */
  clone(): Color {
    return new Color(this);
  }

  /** Copies component values from the supplied instance into this one. */
  copy(source: Color): this {
    this.#setChannels(source.r, source.g, source.b);
    return this;
  }

  /** Writes normalized HSL channels into `target` and returns it. */
  getHSL(target: HSL = { h: 0, s: 0, l: 0 }): HSL {
    const { h, s, l } = this.hsl;
    target.h = h;
    target.s = s;
    target.l = l;
    return target;
  }

  /** Copies normalized r, g, b channels into `target` and returns it. */
  getRGB(target: RGB = { r: 0, g: 0, b: 0 }): RGB {
    target.r = this.r;
    target.g = this.g;
    target.b = this.b;
    return target;
  }

  /** Converts the color in place from sRGB to linear-light space. */
  convertSRGBToLinear(): this {
    this.r = srgbToLinearChannel(this.r);
    this.g = srgbToLinearChannel(this.g);
    this.b = srgbToLinearChannel(this.b);
    return this;
  }

  /** Converts the color in place from linear-light space to sRGB. */
  convertLinearToSRGB(): this {
    this.r = linearToSrgbChannel(this.r);
    this.g = linearToSrgbChannel(this.g);
    this.b = linearToSrgbChannel(this.b);
    return this;
  }

  /** Copies `color` then converts from linear-light space to sRGB in place. */
  copyLinearToSRGB(color: Color): this {
    return this.copy(color).convertLinearToSRGB();
  }

  /** Copies `color` then converts from sRGB to linear-light space in place. */
  copySRGBToLinear(color: Color): this {
    return this.copy(color).convertSRGBToLinear();
  }

  /** Sets this color to the RGB interpolation between `c1` and `c2`. */
  lerpColors(c1: Color, c2: Color, t: number): this {
    this.#setChannels(
      c1.r + (c2.r - c1.r) * t,
      c1.g + (c2.g - c1.g) * t,
      c1.b + (c2.b - c1.b) * t,
    );
    return this;
  }

  /** Adds `color` channel by channel and clamps each result to [0, 1]. */
  add(color: Color): this {
    return this.#setChannels(
      this.r + color.r,
      this.g + color.g,
      this.b + color.b,
    );
  }

  /** Stores the channel-wise sum of `color1` and `color2`, clamped to [0, 1]. */
  addColors(color1: Color, color2: Color): this {
    return this.#setChannels(
      color1.r + color2.r,
      color1.g + color2.g,
      color1.b + color2.b,
    );
  }

  /** Adds `scalar` to each channel and clamps the results to [0, 1]. */
  addScalar(scalar: number): this {
    return this.#setChannels(this.r + scalar, this.g + scalar, this.b + scalar);
  }

  /** Applies a 3×3 color transform and clamps each resulting channel to [0, 1]. */
  applyMatrix3(matrix: Matrix3): this {
    const { r, g, b } = this;
    const elements = matrix.elements;
    return this.#setChannels(
      elements[0] * r + elements[3] * g + elements[6] * b,
      elements[1] * r + elements[4] * g + elements[7] * b,
      elements[2] * r + elements[5] * g + elements[8] * b,
    );
  }

  /** Returns true when all normalized RGB channels exactly match `color`. */
  equals(color: Color): boolean {
    return this.r === color.r && this.g === color.g && this.b === color.b;
  }

  /** Reads three normalized RGB channels from `values` at `offset`. */
  fromArray(values: ArrayLike<number>, offset: number = 0): this {
    return this.#setChannels(
      values[offset],
      values[offset + 1],
      values[offset + 2],
    );
  }

  /** Reads r, g, b from an Attribute at the given vertex index. */
  fromBufferAttribute(attribute: Attribute, index: number): this {
    return this.#setChannels(
      attribute.getX(index),
      attribute.getY(index),
      attribute.getZ(index),
    );
  }

  /** Interpolates this color toward `color` in RGB space by `t`. */
  lerp(color: Color, t: number): this {
    return this.#setChannels(
      this.r + (color.r - this.r) * t,
      this.g + (color.g - this.g) * t,
      this.b + (color.b - this.b) * t,
    );
  }

  /** Interpolates this color toward `color` in HSL space by `t`. */
  lerpHSL(color: Color, t: number): this {
    const a = this.hsl;
    const b = color.hsl;
    return this.setHSL(
      a.h + (b.h - a.h) * t,
      a.s + (b.s - a.s) * t,
      a.l + (b.l - a.l) * t,
    );
  }

  /** Multiplies channels by the corresponding channels in `color`. */
  multiply(color: Color): this {
    return this.#setChannels(
      this.r * color.r,
      this.g * color.g,
      this.b * color.b,
    );
  }

  /** Multiplies each channel by `scalar` and clamps to [0, 1]. */
  multiplyScalar(scalar: number): this {
    return this.#setChannels(this.r * scalar, this.g * scalar, this.b * scalar);
  }

  /** Offsets the current HSL channels by `h`, `s`, and `l`, then clamps RGB output. */
  offsetHSL(h: number, s: number, l: number): this {
    const current = this.hsl;
    return this.setHSL(current.h + h, current.s + s, current.l + l);
  }

  /** Copies normalized RGB channels from `vector.x`, `vector.y`, and `vector.z`. */
  setFromVector3(vector: Vector3): this {
    return this.#setChannels(vector.x, vector.y, vector.z);
  }

  /** Sets the color from a common named CSS color; unknown names default to black. */
  setColorName(name: string): this {
    const hex = CSS_COLOR_NAMES[name.toLowerCase()];
    if (hex === undefined) {
      return this.#setHex(0x000000);
    }
    return this.#setHex(hex);
  }

  /** Sets every channel to `scalar`, clamped to [0, 1]. */
  setScalar(scalar: number): this {
    return this.#setChannels(scalar, scalar, scalar);
  }

  /** Subtracts `color` channel by channel and floors each result at zero. */
  sub(color: Color): this {
    return this.#setChannels(
      this.r - color.r,
      this.g - color.g,
      this.b - color.b,
    );
  }

  /** Writes normalized RGB channels into `values` at `offset`. */
  toArray(values: number[] = [], offset: number = 0): number[] {
    values[offset] = this.r;
    values[offset + 1] = this.g;
    values[offset + 2] = this.b;
    return values;
  }

  /** Serializes this color as its packed 24-bit RGB number. */
  toJSON(): number {
    return this.hex;
  }

  /** Replaces this color from a Color, packed RGB number, or CSS string. */
  set(value: ColorValue): this {
    if (value instanceof Color) {
      this.copy(value);
      return this;
    }
    if (typeof value === "number") {
      return this.#setHex(value);
    }
    if (typeof value === "string") {
      return this.#setStyle(value);
    }

    throw new Error(
      `EASEL.Color.set(): invalid value: ${Object.prototype.toString.call(value)}`,
    );
  }

  #setHex(value: number): this {
    if (value > 0xffffff || value < 0) {
      throw new Error("EASEL.Color.setHex(): hex out of range");
    }
    const hex = fastTrunc(value);

    this.r = (hex >> 16) / COLOR_RGB_SCALE;
    this.g = ((hex >> 8) & COLOR_RGB_SCALE) / COLOR_RGB_SCALE;
    this.b = (hex & COLOR_RGB_SCALE) / COLOR_RGB_SCALE;
    return this;
  }

  /**
   * @param h Hue in [0, 1]
   * @param s Saturation in [0, 1]
   * @param l Lightness in [0, 1]
   */
  setHSL(h: number, s: number, l: number): this {
    const hue = ((h % 1) + 1) % 1;
    const saturation = clampChannel(s);
    const lightness = clampChannel(l);

    const hue2rgb = (
      channelP: number,
      channelQ: number,
      _t: number,
    ): number => {
      let t = _t;
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return channelP + (channelQ - channelP) * 6 * t;
      if (t < 1 / 2) return channelQ;
      if (t < 2 / 3) return channelP + (channelQ - channelP) * (2 / 3 - t) * 6;
      return channelP;
    };

    if (saturation === 0) {
      return this.#setChannels(lightness, lightness, lightness);
    }

    const q =
      lightness < 0.5
        ? lightness * (1 + saturation)
        : lightness + saturation - lightness * saturation;
    const p = 2 * lightness - q;

    return this.#setChannels(
      hue2rgb(p, q, hue + 1 / 3),
      hue2rgb(p, q, hue),
      hue2rgb(p, q, hue - 1 / 3),
    );
  }

  /** Replaces RGB channels; each component must be finite and within [0, 1]. */
  setRGB(r: number, g: number, b: number): this {
    if (
      !(Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) ||
      r < 0 ||
      r > 1 ||
      g < 0 ||
      g > 1 ||
      b < 0 ||
      b > 1
    ) {
      throw new RangeError(
        "EASEL.Color.setRGB(): components must be finite values in [0, 1]",
      );
    }

    return this.#setChannels(r, g, b);
  }

  #setStyle(value: string): this {
    const style = value.toLowerCase();
    if (style.startsWith("#")) return this.#parseHex(style);
    if (style.startsWith("rgb")) return this.#parseRGB(style);
    if (style.startsWith("hsl")) return this.#parseHSL(style);

    throw new Error(`EASEL.Color.setStyle(): invalid style: ${style}`);
  }

  #parseHex(style: string): this {
    if (style.length !== 4 && style.length !== 7) {
      throw new Error(
        "EASEL.Color.#parseHex(): hex style must be in '#rgb' or '#rrggbb' format",
      );
    }

    const hex =
      style.length === 4
        ? style
            .slice(1)
            .split("")
            .map((c) => c + c)
            .join("")
        : style.slice(1);
    return this.#setHex(Number.parseInt(hex, 16));
  }

  #parseHSL(style: string): this {
    const values = style.match(/\d+/gu);
    if (!values || values.length < 3) {
      throw new Error(
        "EASEL.Color.#parseHSL(): hsl(a) style must be in 'hsl(h,s%,l%)' or 'hsla(h,s%,l%,a)' format",
      );
    }

    const h = Number(values[0]) / COLOR_HUE_SCALE;
    const s = Number(values[1]) / COLOR_SATURATION_SCALE;
    const l = Number(values[2]) / COLOR_LIGHTNESS_SCALE;

    return this.setHSL(h, s, l);
  }

  #parseRGB(style: string): this {
    const values = style.match(/\d+/gu);
    if (!values || values.length < 3) {
      throw new Error(
        "EASEL.Color.#parseRGB(): rgb style must be in 'rgb(r,g,b)' or 'rgba(r,g,b,a)' format",
      );
    }

    return this.setRGB(
      Number(values[0]) / COLOR_RGB_SCALE,
      Number(values[1]) / COLOR_RGB_SCALE,
      Number(values[2]) / COLOR_RGB_SCALE,
    );
  }

  #setChannels(r: number, g: number, b: number): this {
    this.r = clampChannel(r);
    this.g = clampChannel(g);
    this.b = clampChannel(b);
    return this;
  }
}
