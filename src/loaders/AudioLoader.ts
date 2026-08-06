import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";
import { getAudioContext } from "../audio/AudioContext.ts";
import { error } from "../utils/ConsoleUtils.ts";
import type { AudioBufferLike } from "../audio/AudioTypes.ts";

/**
 * Loads audio files via {@link FileLoader} and decodes them into
 * {@link AudioBufferLike} objects using the global audio context.
 */
export class AudioLoader extends Loader {
  /** Constructs an audio loader bound to the supplied or default manager. */
  override load(
    url: string,
    onLoad?: (buffer: AudioBufferLike) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (err: unknown) => void,
  ): void {
    const loader = new FileLoader(this.manager);
    loader.cache = this.cache;
    loader.path = this.path;
    loader.responseType = "arraybuffer";
    loader.requestHeader = this.requestHeader;
    loader.withCredentials = this.withCredentials;

    loader.load(
      url,
      (data) => {
        try {
          const arrayBuffer = data as ArrayBuffer;
          const context = getAudioContext();
          if (!context?.decodeAudioData) {
            handleError(
              new Error("AudioLoader: no decodeAudioData available."),
            );
            return;
          }
          const decodeUrl = `${url}#decode`;
          this.manager.itemStart(decodeUrl);
          context
            .decodeAudioData(arrayBuffer.slice(0))
            .then((audioBuffer) => {
              onLoad?.(audioBuffer);
              this.manager.itemEnd(decodeUrl);
            })
            .catch((e) => {
              handleError(e);
              this.manager.itemEnd(decodeUrl);
            });
        } catch (e) {
          handleError(e);
        }
      },
      onProgress,
      onError,
    );

    const handleError = (e: unknown): void => {
      if (onError) {
        onError(e);
      } else {
        error("AudioLoader", e);
      }
      this.manager.itemError(url);
    };
  }
}
