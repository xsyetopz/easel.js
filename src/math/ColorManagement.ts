import {
  type ColorSpace,
  LinearSRGBColorSpace,
  LinearTransfer,
  SRGBColorSpace,
  SRGBTransfer,
} from "../core/Constants.ts";

/** RGB channels converted in place by {@link ColorManagement}. */
export interface ColorChannels {
  /** Red channel. */
  r: number;
  /** Green channel. */
  g: number;
  /** Blue channel. */
  b: number;
}

/** three.js `SRGBToLinear`: decodes one sRGB channel to linear light. */
export function SRGBToLinear(c: number): number {
  return c < 0.04045
    ? c * 0.0773993808
    : (c * 0.9478672986 + 0.0521327014) ** 2.4;
}

/**
 * `SRGBToLinear(i / 255)` for every 8-bit sRGB channel value `i`, so 8-bit
 * input decodes to linear without a `pow` per channel.
 */
export const SRGB_BYTE_TO_LINEAR: Float64Array = new Float64Array(256);
for (let i = 0; i < 256; i++) SRGB_BYTE_TO_LINEAR[i] = SRGBToLinear(i / 255);

/** three.js `LinearToSRGB`: encodes one linear-light channel to sRGB. */
export function LinearToSRGB(c: number): number {
  return c < 0.0031308 ? c * 12.92 : 1.055 * c ** 0.41666 - 0.055;
}

function transferOf(colorSpace: string): string {
  if (colorSpace === SRGBColorSpace) return SRGBTransfer;
  if (colorSpace === LinearSRGBColorSpace) return LinearTransfer;
  throw new RangeError(
    `ColorManagement: unsupported color space "${colorSpace}".`,
  );
}

/**
 * Whether channels given in `colorSpace` convert to the working space by the
 * sRGB decode alone, so 8-bit input can use {@link SRGB_BYTE_TO_LINEAR}.
 */
export function decodesSrgbToWorking(colorSpace: string): boolean {
  return (
    colorSpace === SRGBColorSpace &&
    ColorManagement.enabled &&
    ColorManagement.workingColorSpace === LinearSRGBColorSpace
  );
}

/** Shape of {@link ColorManagement}, spelled out for JSR's explicit-type rule. */
export interface ColorManagementAPI {
  /** When false, every conversion returns its input unchanged. */
  enabled: boolean;
  /** Color space that `Color` channels and baked lighting use. */
  workingColorSpace: ColorSpace;
  /** Converts channels in place between two supported color spaces. */
  convert<TColor extends ColorChannels>(
    color: TColor,
    sourceColorSpace: string,
    targetColorSpace: string,
  ): TColor;
  /** Converts working-space channels in place to `targetColorSpace`. */
  workingToColorSpace<TColor extends ColorChannels>(
    color: TColor,
    targetColorSpace: string,
  ): TColor;
  /** Converts channels in place from `sourceColorSpace` to the working space. */
  colorSpaceToWorking<TColor extends ColorChannels>(
    color: TColor,
    sourceColorSpace: string,
  ): TColor;
  /** Returns the transfer function identifier of a color space. */
  getTransfer(colorSpace: string): string;
}

/**
 * Color management as in three.js r186. `Color` stores channels in the linear
 * `workingColorSpace`; hex and CSS input is decoded from sRGB on assignment
 * and encoded back on output. The renderer encodes its linear lighting result
 * to sRGB before writing the Canvas2D framebuffer. `NoColorSpace` (`""`) on
 * either side of a conversion leaves the channels unchanged.
 */
export const ColorManagement: ColorManagementAPI = {
  /** When false, every conversion returns its input unchanged. */
  enabled: true,
  /** Color space that `Color` channels and baked lighting use. */
  workingColorSpace: LinearSRGBColorSpace,

  /** Converts channels in place between two supported color spaces. */
  convert<TColor extends ColorChannels>(
    color: TColor,
    sourceColorSpace: string,
    targetColorSpace: string,
  ): TColor {
    if (
      !this.enabled ||
      sourceColorSpace === targetColorSpace ||
      !sourceColorSpace ||
      !targetColorSpace
    ) {
      return color;
    }
    const sourceTransfer = transferOf(sourceColorSpace);
    const targetTransfer = transferOf(targetColorSpace);
    if (sourceTransfer === SRGBTransfer) {
      color.r = SRGBToLinear(color.r);
      color.g = SRGBToLinear(color.g);
      color.b = SRGBToLinear(color.b);
    }
    if (targetTransfer === SRGBTransfer) {
      color.r = LinearToSRGB(color.r);
      color.g = LinearToSRGB(color.g);
      color.b = LinearToSRGB(color.b);
    }
    return color;
  },

  /** Converts working-space channels in place to `targetColorSpace`. */
  workingToColorSpace<TColor extends ColorChannels>(
    color: TColor,
    targetColorSpace: string,
  ): TColor {
    return this.convert(color, this.workingColorSpace, targetColorSpace);
  },

  /** Converts channels in place from `sourceColorSpace` to the working space. */
  colorSpaceToWorking<TColor extends ColorChannels>(
    color: TColor,
    sourceColorSpace: string,
  ): TColor {
    return this.convert(color, sourceColorSpace, this.workingColorSpace);
  },

  /** Returns the transfer function identifier of a color space. */
  getTransfer(colorSpace: string): string {
    if (colorSpace === "") return LinearTransfer;
    return transferOf(colorSpace);
  },
};
