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

  /** Returns a UV transform that fits a texture inside an aspect ratio without cropping. */
  contain(
    texture: { width: number; height: number },
    aspect: number,
  ): { offset: { x: number; y: number }; repeat: { x: number; y: number } } {
    const textureAspect = texture.width / texture.height;
    const scale = Math.min(aspect / textureAspect, 1);
    return {
      offset: { x: (1 - scale) / 2, y: (1 - scale) / 2 },
      repeat: { x: scale, y: scale },
    };
  },

  /** Returns a UV transform that covers an aspect ratio, cropping excess texture. */
  cover(
    texture: { width: number; height: number },
    aspect: number,
  ): { offset: { x: number; y: number }; repeat: { x: number; y: number } } {
    const textureAspect = texture.width / texture.height;
    const scale = Math.max(aspect / textureAspect, 1);
    return {
      offset: { x: (1 - scale) / 2, y: (1 - scale) / 2 },
      repeat: { x: scale, y: scale },
    };
  },

  /** Returns a UV transform that stretches a texture to fill the target. */
  fill(
    _texture: { width: number; height: number },
  ): { offset: { x: number; y: number }; repeat: { x: number; y: number } } {
    return {
      offset: { x: 0, y: 0 },
      repeat: { x: 1, y: 1 },
    };
  },

  /** Returns the byte length of a texture's RGBA pixel data. */
  getByteLength(texture: { width: number; height: number }): number {
    return texture.width * texture.height * 4;
  },
};

/** Creates a canvas element in environments that support the DOM. */
export function createCanvasElement(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  return canvas;
}

/** Utility namespace for general-purpose helpers. */
export const Utils = {
  /** Creates a canvas element in environments that support the DOM. */
  createCanvasElement(): HTMLCanvasElement {
    return createCanvasElement();
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
