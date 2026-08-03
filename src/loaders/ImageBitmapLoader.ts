import { Loader } from "./Loader.ts";
import { DefaultLoadingManager } from "./LoadingManager.ts";

/** Loads an image as an ImageBitmap. */
export class ImageBitmapLoader extends Loader {
  #options: ImageBitmapOptions = {};

  setOptions(options: ImageBitmapOptions): this {
    this.#options = options;
    return this;
  }

  override load(
    url: string,
    onLoad?: (bitmap: ImageBitmap) => void,
    _onProgress?: (event: ProgressEvent) => void,
    onError?: (err: unknown) => void,
  ): void {
    const manager = this.manager ?? DefaultLoadingManager;
    const fullUrl = this.path + url;
    const options = this.#options;

    manager.itemStart(fullUrl);

    fetch(fullUrl, { headers: { Accept: "image/*", ...this.requestHeader } })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `ImageBitmapLoader: fetch failed - ${response.status} ${response.statusText}`,
          );
        }
        return response.blob();
      })
      .then((blob) => createImageBitmap(blob, options))
      .then((bitmap) => {
        onLoad?.(bitmap);
        manager.itemEnd(fullUrl);
      })
      .catch((err: unknown) => {
        onError?.(err);
        manager.itemError(fullUrl);
      });
  }
}
