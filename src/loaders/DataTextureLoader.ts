import { DataTexture } from "../textures/DataTexture.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";

interface ParseResult {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/**
 * Base loader for raw data to DataTexture.
 * Subclasses override parse() to handle specific formats.
 */
export class DataTextureLoader extends Loader {
  /** Loads the resource at `url` through the configured loading manager. */
  override load(
    url: string,
    onLoad?: (texture: DataTexture) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (err: unknown) => void,
  ): void {
    const fileLoader = new FileLoader(this.manager);
    fileLoader.cache = this.cache;
    fileLoader.path = this.path;
    fileLoader.responseType = "arraybuffer";
    fileLoader.requestHeader = this.requestHeader;

    fileLoader.load(
      url,
      (buffer) => {
        const result = this.parse(buffer as ArrayBuffer);
        if (!result) return;
        const texture = new DataTexture(
          result.data,
          result.width,
          result.height,
        );
        texture.buildBrightnessLevels();
        onLoad?.(texture);
      },
      onProgress,
      onError,
    );
  }

  /** Decodes an ArrayBuffer into raw RGBA pixels; subclasses provide the format-specific implementation. */
  override parse(_data: ArrayBuffer): ParseResult | undefined {
    return void 0 as ParseResult | undefined;
  }
}
