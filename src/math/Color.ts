import type { Attribute } from "../geometry/Attribute.ts";
import type { Matrix3 } from "./Matrix3.ts";
import type { Vector3 } from "./Vector3.ts";
import { parseColorStyle } from "./_ColorParse.ts";
import {
  COLOR_HUE_SCALE,
  COLOR_LIGHTNESS_SCALE,
  COLOR_RGB_SCALE,
  COLOR_SATURATION_SCALE,
  clampChannel,
  colorApplyMatrix3,
  colorConvertLinearToSRGB,
  colorConvertSRGBToLinear,
  colorHsl16,
  colorLerpHSL,
  colorOffsetHSL,
  colorSetColorName,
  colorSetHSL,
  rgbToHsl,
} from "./_ColorUtils.ts";
import type { ColorValue, HSL, RGB } from "./_ColorUtils.ts";

export type { ColorValue, HSL, RGB, RGBArray } from "./_ColorUtils.ts";
export {
  COLOR_HUE_SCALE,
  COLOR_LIGHTNESS_SCALE,
  COLOR_RGB_SCALE,
  COLOR_SATURATION_SCALE,
  colorFromHsl16,
  colorToRgb,
} from "./_ColorUtils.ts";

/** RGB color with channel values in [0, 1]. */
export class Color {
  /** Normalized red channel. */
  r: number = 1;
  /** Normalized green channel. */
  g: number = 1;
  /** Normalized blue channel. */
  b: number = 1;
  /** Identifies this value as a color. */
  readonly isColor = true;

  /** Creates a color from a supported color value. */
  constructor(value?: ColorValue);
  /** Creates a color from normalized RGB channels. */
  constructor(r: number, g: number, b: number);
  /** Creates a color from a value or normalized RGB channels. */
  constructor(valueOrR?: ColorValue, g?: number, b?: number) {
    if (typeof valueOrR === "number" && g !== undefined && b !== undefined) {
      this.setRGB(valueOrR, g, b);
    } else if (valueOrR !== undefined) {
      this.set(valueOrR);
    } else {
      this.r = 0;
      this.g = 0;
      this.b = 0;
    }
  }

  /** Packed hexadecimal RGB value. */
  get hex(): number {
    const r = Math.round(clampChannel(this.r) * COLOR_RGB_SCALE);
    const g = Math.round(clampChannel(this.g) * COLOR_RGB_SCALE);
    const b = Math.round(clampChannel(this.b) * COLOR_RGB_SCALE);
    return (r << 16) | (g << 8) | b;
  }
  /** Assigns the packed hexadecimal RGB value. */
  set hex(value: number) {
    this.#setHex(value);
  }

  /** Six-character hexadecimal RGB string. */
  get hexString(): string {
    return this.hex.toString(16).padStart(6, "0");
  }

  /** CSS rgb() style string. */
  get style(): string {
    const r = Math.round(clampChannel(this.r) * COLOR_RGB_SCALE);
    const g = Math.round(clampChannel(this.g) * COLOR_RGB_SCALE);
    const b = Math.round(clampChannel(this.b) * COLOR_RGB_SCALE);
    return `rgb(${r},${g},${b})`;
  }
  /** Parses and assigns a CSS color style string. */
  set style(value: string) {
    parseColorStyle(this, value);
  }

  /** HSL channels in normalized form. */
  get hsl(): HSL {
    return rgbToHsl(this.r, this.g, this.b);
  }
  /** Packed 16-bit HSL representation. */
  get hsl16(): number {
    return colorHsl16(this);
  }
  /** CSS hsl() style string. */
  get hslString(): string {
    const { h, s, l } = this.hsl;
    return `hsl(${Math.trunc(h * COLOR_HUE_SCALE)},${Math.trunc(s * COLOR_SATURATION_SCALE)}%,${Math.trunc(l * COLOR_LIGHTNESS_SCALE)}%)`;
  }

  /** Returns an independent copy of this color. */
  clone(): Color {
    return new Color(this);
  }
  /** Copies channels from another color. */
  copy(source: Color): this {
    return this.#setChannels(source.r, source.g, source.b);
  }

  /** Writes normalized HSL channels into a target record. */
  getHSL(target: HSL = { h: 0, s: 0, l: 0 }): HSL {
    const { h, s, l } = this.hsl;
    target.h = h;
    target.s = s;
    target.l = l;
    return target;
  }
  /** Writes normalized RGB channels into a target record. */
  getRGB(target: RGB = { r: 0, g: 0, b: 0 }): RGB {
    target.r = this.r;
    target.g = this.g;
    target.b = this.b;
    return target;
  }

  /** Converts this color from sRGB to linear channels. */
  convertSRGBToLinear(): this {
    colorConvertSRGBToLinear(this);
    return this;
  }
  /** Converts this color from linear to sRGB channels. */
  convertLinearToSRGB(): this {
    colorConvertLinearToSRGB(this);
    return this;
  }
  /** Copies a linear color and converts it to sRGB. */
  copyLinearToSRGB(c: Color): this {
    return this.copy(c).convertLinearToSRGB();
  }
  /** Copies an sRGB color and converts it to linear. */
  copySRGBToLinear(c: Color): this {
    return this.copy(c).convertSRGBToLinear();
  }

  /** Interpolates between two colors. */
  lerpColors(c1: Color, c2: Color, t: number): this {
    return this.#setChannels(
      c1.r + (c2.r - c1.r) * t,
      c1.g + (c2.g - c1.g) * t,
      c1.b + (c2.b - c1.b) * t,
    );
  }
  /** Adds another color channel-wise. */
  add(c: Color): this {
    return this.#setChannels(this.r + c.r, this.g + c.g, this.b + c.b);
  }
  /** Adds two colors channel-wise. */
  addColors(c1: Color, c2: Color): this {
    return this.#setChannels(c1.r + c2.r, c1.g + c2.g, c1.b + c2.b);
  }
  /** Adds a scalar to each channel. */
  addScalar(s: number): this {
    return this.#setChannels(this.r + s, this.g + s, this.b + s);
  }

  /** Applies a 3x3 color transform matrix. */
  applyMatrix3(m: Matrix3): this {
    colorApplyMatrix3(this, m);
    return this;
  }

  /** Tests channel equality with another color. */
  equals(c: Color): boolean {
    return this.r === c.r && this.g === c.g && this.b === c.b;
  }

  /** Reads normalized channels from an array. */
  fromArray(values: ArrayLike<number>, offset: number = 0): this {
    return this.#setChannels(
      values[offset],
      values[offset + 1],
      values[offset + 2],
    );
  }
  /** Reads normalized channels from an attribute. */
  fromBufferAttribute(attr: Attribute, index: number): this {
    return this.#setChannels(
      attr.getX(index),
      attr.getY(index),
      attr.getZ(index),
    );
  }
  /** Interpolates this color toward another color. */
  lerp(c: Color, t: number): this {
    return this.#setChannels(
      this.r + (c.r - this.r) * t,
      this.g + (c.g - this.g) * t,
      this.b + (c.b - this.b) * t,
    );
  }
  /** Interpolates in HSL space. */
  lerpHSL(c: Color, t: number): this {
    colorLerpHSL(this, c, t);
    return this;
  }
  /** Multiplies channels by another color. */
  multiply(c: Color): this {
    return this.#setChannels(this.r * c.r, this.g * c.g, this.b * c.b);
  }
  /** Multiplies every channel by a scalar. */
  multiplyScalar(s: number): this {
    return this.#setChannels(this.r * s, this.g * s, this.b * s);
  }
  /** Offsets HSL channels. */
  offsetHSL(h: number, s: number, l: number): this {
    colorOffsetHSL(this, h, s, l);
    return this;
  }
  /** Copies channels from a vector. */
  setFromVector3(v: Vector3): this {
    return this.#setChannels(v.x, v.y, v.z);
  }
  /** Sets the color from a named CSS color. */
  setColorName(name: string): this {
    colorSetColorName(this, name);
    return this;
  }
  /** Sets every channel to a scalar. */
  setScalar(s: number): this {
    return this.#setChannels(s, s, s);
  }
  /** Subtracts another color channel-wise. */
  sub(c: Color): this {
    return this.#setChannels(this.r - c.r, this.g - c.g, this.b - c.b);
  }

  /** Writes normalized channels to an array. */
  toArray(values: number[] = [], offset: number = 0): number[] {
    values[offset] = this.r;
    values[offset + 1] = this.g;
    values[offset + 2] = this.b;
    return values;
  }
  /** Serializes the color as a packed hexadecimal value. */
  toJSON(): number {
    return this.hex;
  }

  /** Assigns a supported color value. */
  set(value: ColorValue): this {
    if (value instanceof Color) {
      this.copy(value);
      return this;
    }
    if (typeof value === "number") return this.#setHex(value);
    if (typeof value === "string") {
      parseColorStyle(this, value);
      return this;
    }
    throw new Error(
      `EASEL.Color.set(): invalid value: ${Object.prototype.toString.call(value)}`,
    );
  }

  #setHex(value: number): this {
    if (value > 0xffffff || value < 0)
      throw new Error("EASEL.Color.setHex(): hex out of range");
    const hex = Math.trunc(value);
    this.r = (hex >> 16) / COLOR_RGB_SCALE;
    this.g = ((hex >> 8) & COLOR_RGB_SCALE) / COLOR_RGB_SCALE;
    this.b = (hex & COLOR_RGB_SCALE) / COLOR_RGB_SCALE;
    return this;
  }

  /** Assigns normalized HSL channels. */
  setHSL(h: number, s: number, l: number): this {
    colorSetHSL(this, h, s, l);
    return this;
  }

  /** Assigns normalized RGB channels. */
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

  #setChannels(r: number, g: number, b: number): this {
    this.r = clampChannel(r);
    this.g = clampChannel(g);
    this.b = clampChannel(b);
    return this;
  }
}
