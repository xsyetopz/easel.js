import { fromHalfFloat, toHalfFloat } from "../math/DataUtils.ts";
import { getDataUrl, srgbToLinear, type ImageDataLike } from "./ImageUtils.ts";
import {
  isShapeClockwise,
  type ShapePoint2D,
  shapeArea,
  triangulateShape,
} from "../math/ShapeUtils.ts";

/** Utility namespace for 2D shape operations. */
export const ShapeUtils = {
  /** Calculate the signed area of a 2D contour polygon. */
  area(contour: readonly ShapePoint2D[]): number {
    return shapeArea(contour);
  },

  /** Returns `true` when the contour uses clockwise winding. */
  isClockWise(points: readonly ShapePoint2D[]): boolean {
    return isShapeClockwise(points);
  },

  /** Triangulates a contour and its holes into source-indexed faces. */
  triangulateShape(
    contour: readonly ShapePoint2D[],
    holes: readonly (readonly ShapePoint2D[])[],
  ): [number, number, number][] {
    return triangulateShape(contour, holes);
  },
};

/** Utility namespace for image operations. */
export const ImageUtils = {
  /** Encodes image data as a data URL. */
  getDataUrl(
    image: HTMLImageElement | HTMLCanvasElement | ImageData,
    type: string = "image/png",
  ): string {
    return getDataUrl(image, type);
  },

  /** Converts an sRGB image to linear-light space. */
  srgbToLinear<
    TImage extends
      | HTMLImageElement
      | HTMLCanvasElement
      | ImageBitmap
      | ImageDataLike,
  >(
    image: TImage,
  ): TImage extends ImageDataLike<infer TArray>
    ? ImageDataLike<TArray>
    : HTMLCanvasElement {
    return srgbToLinear(image) as TImage extends ImageDataLike<infer TArray>
      ? ImageDataLike<TArray>
      : HTMLCanvasElement;
  },
};

/** Utility namespace for texture operations. */
export const TextureUtils = {
  /** Encodes texture image data as a data URL. */
  getDataUrl(
    image: HTMLImageElement | HTMLCanvasElement | ImageData,
    type: string = "image/png",
  ): string {
    return getDataUrl(image, type);
  },
};

/** Utility namespace for data format conversions. */
export const DataUtils = {
  /** Encodes a JavaScript number as an IEEE 754 binary16 value. */
  toHalfFloat(value: number): number {
    return toHalfFloat(value);
  },

  /** Decodes an IEEE 754 binary16 value into a JavaScript number. */
  fromHalfFloat(value: number): number {
    return fromHalfFloat(value);
  },
};
