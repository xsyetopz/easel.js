import { Loader } from "./Loader.ts";

const DEFAULT_OPTIONS: Readonly<ImageBitmapOptions> = Object.freeze({
  premultiplyAlpha: "none",
  colorSpaceConversion: "none",
});

/** Loads an image through Fetch and createImageBitmap. */
export class ImageBitmapLoader extends Loader {
  #options: Readonly<ImageBitmapOptions> = DEFAULT_OPTIONS;
  #optionsKey = JSON.stringify(Object.entries(DEFAULT_OPTIONS).sort());
  readonly #controllers = new Set<AbortController>();

  /** Type-test accessor matching the THREE.js loader surface. */
  get isImageBitmapLoader(): true {
    return true;
  }

  /** Options passed directly to createImageBitmap. */
  get options(): Readonly<ImageBitmapOptions> {
    return this.#options;
  }

  /** Replaces bitmap decoding options with an immutable normalized copy. */
  set options(value: Readonly<ImageBitmapOptions>) {
    const entries = Object.entries({
      ...value,
      colorSpaceConversion: "none",
    }).sort(([left], [right]) => left.localeCompare(right));
    this.#options = Object.freeze(Object.fromEntries(entries));
    this.#optionsKey = JSON.stringify(entries);
  }

  /** Builds the cache key from the URL and loader configuration. */
  cacheKey(url: string): string {
    const headers = Object.entries(this.#requestHeaders()).sort(
      ([left], [right]) => left.localeCompare(right),
    );
    return JSON.stringify([
      this.manager.resolveUrl(this.path + url),
      this.#optionsKey,
      headers,
      this.withCredentials,
    ]);
  }

  /** Starts a bitmap request and reports its lifecycle to the loading manager. */
  override load(
    url: string,
    onLoad?: ((bitmap: ImageBitmap) => void) | undefined,
    _onProgress?: ((event: ProgressEvent) => void) | undefined,
    onError?: ((err: unknown) => void) | undefined,
  ): void {
    const fullUrl = this.manager.resolveUrl(this.path + url);
    const cacheKey = this.cacheKey(url);
    this.manager.itemStart(fullUrl);

    if (this.cache?.has(cacheKey)) {
      const bitmap = this.cache.get(cacheKey) as ImageBitmap;
      queueMicrotask(() => {
        onLoad?.(bitmap);
        this.manager.itemEnd(fullUrl);
      });
      return;
    }

    const controller = new AbortController();
    const managerSignal = this.manager.abortController.signal;
    const abortFromManager = (): void => controller.abort();
    managerSignal.addEventListener("abort", abortFromManager, { once: true });
    this.#controllers.add(controller);

    fetch(fullUrl, {
      headers: this.#requestHeaders(),
      credentials: this.withCredentials ? "include" : "same-origin",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok && response.status !== 0) {
          throw new Error(
            `ImageBitmapLoader: fetch failed - ${response.status} ${response.statusText}`,
          );
        }
        return response.blob();
      })
      .then((blob) => createImageBitmap(blob, this.#options))
      .then((bitmap) => {
        this.cache?.set(cacheKey, bitmap);
        onLoad?.(bitmap);
      })
      .catch((error: unknown) => {
        onError?.(error);
        this.manager.itemError(fullUrl);
      })
      .finally(() => {
        managerSignal.removeEventListener("abort", abortFromManager);
        this.#controllers.delete(controller);
        this.manager.itemEnd(fullUrl);
      });
  }

  /** Aborts every active request owned by this loader. */
  override abort(): this {
    for (const controller of this.#controllers) controller.abort();
    this.#controllers.clear();
    return this;
  }

  #requestHeaders(): Record<string, string> {
    return { Accept: "image/*", ...this.requestHeader };
  }
}
