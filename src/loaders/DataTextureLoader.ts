import { DataTexture } from "../textures/DataTexture.js";
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
  override load(
    url: string,
    onLoad?: (texture: DataTexture) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (err: unknown) => void,
  ): void {
    const fileLoader = new FileLoader(this.manager);
    fileLoader.setPath(this.path);
    fileLoader.setResponseType("arraybuffer");
    fileLoader.setRequestHeader(this.requestHeader);

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
        texture.needsUpdate = true;
        onLoad?.(texture);
      },
      onProgress,
      onError,
    );
  }

  /** Abstract - subclasses override to decode buffer. */
  parse(_data: ArrayBuffer): ParseResult | undefined {
    return void 0 as ParseResult | undefined;
  }
}
