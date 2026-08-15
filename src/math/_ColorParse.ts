import type { Color } from "./Color.ts";
import {
  COLOR_HUE_SCALE,
  COLOR_LIGHTNESS_SCALE,
  COLOR_RGB_SCALE,
  COLOR_SATURATION_SCALE,
} from "./_ColorUtils.ts";

/** Parses a CSS color string and applies it to `color`. */
export function parseColorStyle(color: Color, value: string): Color {
  const style = value.toLowerCase();
  if (style.startsWith("#")) return parseHexStyle(color, style);
  if (style.startsWith("rgb")) return parseRgbStyle(color, style);
  if (style.startsWith("hsl")) return parseHslStyle(color, style);

  throw new Error(`EASEL.Color.setStyle(): invalid style: ${style}`);
}

function parseHexStyle(color: Color, style: string): Color {
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
  color.hex = Number.parseInt(hex, 16);
  return color;
}

function parseHslStyle(color: Color, style: string): Color {
  const values = style.match(/\d+/gu);
  if (!values || values.length < 3) {
    throw new Error(
      "EASEL.Color.#parseHSL(): hsl(a) style must be in 'hsl(h,s%,l%)' or 'hsla(h,s%,l%,a)' format",
    );
  }

  const h = Number(values[0]) / COLOR_HUE_SCALE;
  const s = Number(values[1]) / COLOR_SATURATION_SCALE;
  const l = Number(values[2]) / COLOR_LIGHTNESS_SCALE;

  return color.setHSL(h, s, l);
}

function parseRgbStyle(color: Color, style: string): Color {
  const values = style.match(/\d+/gu);
  if (!values || values.length < 3) {
    throw new Error(
      "EASEL.Color.#parseRGB(): rgb style must be in 'rgb(r,g,b)' or 'rgba(r,g,b,a)' format",
    );
  }

  return color.setRGB(
    Number(values[0]) / COLOR_RGB_SCALE,
    Number(values[1]) / COLOR_RGB_SCALE,
    Number(values[2]) / COLOR_RGB_SCALE,
  );
}
