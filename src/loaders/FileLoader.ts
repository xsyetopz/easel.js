import { Loader } from "./Loader.ts";
import { DefaultLoadingManager } from "./LoadingManager.ts";

/** Loads files via the fetch API. */
export class FileLoader extends Loader {
  #responseType = "";

  #mimeType: string | undefined = undefined;

  setResponseType(type: string): this {
    this.#responseType = type;
    return this;
  }

  setMimeType(type: string): this {
    this.#mimeType = type;
    return this;
  }

  override load(
    url: string,
    onLoad?: ((data: unknown) => void) | undefined,
    _onProgress?: ((event: ProgressEvent) => void) | undefined,
    onError?: ((err: unknown) => void) | undefined,
  ): void {
    const manager = this.manager ?? DefaultLoadingManager;
    const fullUrl = this.path + url;

    manager.itemStart(fullUrl);

    const headers: Record<string, string> = { ...this.requestHeader };
    if (this.#mimeType) {
      headers["Accept"] = this.#mimeType;
    }

    const responseType = this.#responseType || "text";

    fetch(fullUrl, { headers })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `FileLoader: fetch failed - ${response.status} ${response.statusText}`,
          );
        }
        return (response as unknown as Record<string, () => Promise<unknown>>)[
          responseType
        ]();
      })
      .then((data) => {
        onLoad?.(data);
        manager.itemEnd(fullUrl);
      })
      .catch((err: unknown) => {
        onError?.(err);
        manager.itemError(fullUrl);
      });
  }
}
