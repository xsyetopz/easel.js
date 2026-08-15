import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";
import type { VOXLoaderResult } from "./VOXLoader.ts";
import { parseVOX } from "./_VOXParser.ts";
import { buildScene } from "./_VOXScene.ts";

/** Loads and parses MagicaVoxel VOX 150/200 assets into CPU EASEL data. */
export class VOXLoader extends Loader {
  /** Loads a VOX resource through the configured loading manager. */
  override load(
    url: string,
    onLoad?: (result: VOXLoaderResult) => void,
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
          this.manager.itemError(url);
        }
      },
      onProgress,
      onError,
    );
  }

  /** Parses a VOX 150/200 ArrayBuffer or ArrayBufferView into CPU data. */
  override parse(input: ArrayBuffer | ArrayBufferView): VOXLoaderResult {
    const parsed = parseVOX(input);
    const scene = parsed.nodes[0]
      ? buildScene(0, parsed.nodes, parsed.chunks)
      : null;
    return {
      chunks: parsed.chunks,
      scene,
      nodes: parsed.nodes,
      palette: parsed.palette,
    };
  }
}
