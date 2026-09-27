import {
  COLOR_HUE_SCALE,
  COLOR_LIGHTNESS_SCALE,
  COLOR_RGB_SCALE,
  COLOR_SATURATION_SCALE,
} from "./_ColorUtils.ts";
import type { Color } from "./Color.ts";
import {
  decodesSrgbToWorking,
  SRGB_BYTE_TO_LINEAR,
} from "./ColorManagement.ts";

/** Parses a CSS color string with channels in `colorSpace` and applies it to `color`. */
export function parseColorStyle(
  color: Color,
  value: string,
  colorSpace: string,
): Color {
  const style = value.toLowerCase();
  if (style.startsWith("#")) return parseHexStyle(color, style, colorSpace);
  if (style.startsWith("rgb")) return parseRgbStyle(color, style, colorSpace);
  if (style.startsWith("hsl")) return parseHslStyle(color, style, colorSpace);

  throw new Error(`EASEL.Color.setStyle(): invalid style: ${style}`);
}

function parseHexStyle(color: Color, style: string, colorSpace: string): Color {
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
  return color.setHex(Number.parseInt(hex, 16), colorSpace);
}

function parseHslStyle(color: Color, style: string, colorSpace: string): Color {
  const values = style.match(/\d+/gu);
  if (!values || values.length < 3) {
    throw new Error(
      "EASEL.Color.#parseHSL(): hsl(a) style must be in 'hsl(h,s%,l%)' or 'hsla(h,s%,l%,a)' format",
    );
  }

  const h = Number(values[0]) / COLOR_HUE_SCALE;
  const s = Number(values[1]) / COLOR_SATURATION_SCALE;
  const l = Number(values[2]) / COLOR_LIGHTNESS_SCALE;

  return color.setHSL(h, s, l, colorSpace);
}

function parseRgbStyle(color: Color, style: string, colorSpace: string): Color {
  const values = style.match(/\d+/gu);
  if (!values || values.length < 3) {
    throw new Error(
      "EASEL.Color.#parseRGB(): rgb style must be in 'rgb(r,g,b)' or 'rgba(r,g,b,a)' format",
    );
  }

  const r = Number(values[0]);
  const g = Number(values[1]);
  const b = Number(values[2]);
  if (
    r <= COLOR_RGB_SCALE &&
    g <= COLOR_RGB_SCALE &&
    b <= COLOR_RGB_SCALE &&
    decodesSrgbToWorking(colorSpace)
  ) {
    // Integer 8-bit channels: the table holds the exact decode of each.
    color.r = SRGB_BYTE_TO_LINEAR[r];
    color.g = SRGB_BYTE_TO_LINEAR[g];
    color.b = SRGB_BYTE_TO_LINEAR[b];
    return color;
  }
  return color.setRGB(
    r / COLOR_RGB_SCALE,
    g / COLOR_RGB_SCALE,
    b / COLOR_RGB_SCALE,
    colorSpace,
  );
}
