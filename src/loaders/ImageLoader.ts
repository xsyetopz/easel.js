import { Loader } from "./Loader.ts";
import type { LoadingManager } from "./LoadingManager.ts";

/** Loads an image through the browser's HTMLImageElement implementation. */
export class ImageLoader extends Loader {
  readonly #aborters = new Set<() => void>();

  /** Constructs an image loader bound to a LoadingManager. */
  constructor(manager: LoadingManager | undefined = void 0) {
    super(manager);
  }

  /** Builds the cache key from the URL and loader configuration. */
  cacheKey(url: string): string {
    return JSON.stringify([
      this.manager.resolveUrl(this.path + url),
      this.#effectiveCrossOrigin(),
    ]);
  }

  /** Starts an image request and reports its lifecycle to the loading manager. */
  override load(
    url: string,
    onLoad?: ((image: HTMLImageElement) => void) | undefined,
    _onProgress?: ((event: ProgressEvent) => void) | undefined,
    onError?: ((err: Event | string | DOMException) => void) | undefined,
  ): void {
    const fullUrl = this.manager.resolveUrl(this.path + url);
    const cacheKey = this.cacheKey(url);
    this.manager.itemStart(fullUrl);

    if (this.cache?.has(cacheKey)) {
      const image = this.cache.get(cacheKey) as HTMLImageElement;
      queueMicrotask(() => {
        onLoad?.(image);
        this.manager.itemEnd(fullUrl);
      });
      return;
    }

    const image = new Image();
    const managerSignal = this.manager.abortController.signal;
    let settled = false;

    const finish = (): boolean => {
      if (settled) return false;
      settled = true;
      image.onload = null;
      image.onerror = null;
      managerSignal.removeEventListener("abort", abort);
      this.#aborters.delete(abort);
      return true;
    };
    const abort = (): void => {
      if (!finish()) return;
      image.src = "";
      const error = new DOMException("Image request aborted.", "AbortError");
      onError?.(error);
      this.manager.itemError(fullUrl);
      this.manager.itemEnd(fullUrl);
    };

    this.#aborters.add(abort);
    managerSignal.addEventListener("abort", abort, { once: true });
    image.onload = (): void => {
      if (!finish()) return;
      this.cache?.set(cacheKey, image);
      onLoad?.(image);
      this.manager.itemEnd(fullUrl);
    };
    image.onerror = (event: string | Event): void => {
      if (!finish()) return;
      onError?.(event);
      this.manager.itemError(fullUrl);
      this.manager.itemEnd(fullUrl);
    };

    const crossOrigin = this.#effectiveCrossOrigin();
    if (crossOrigin && !fullUrl.startsWith("data:")) {
      image.crossOrigin = crossOrigin;
    }
    image.src = fullUrl;
  }

  /** Cancels every active image request owned by this loader. */
  override abort(): this {
    for (const abort of [...this.#aborters]) abort();
    return this;
  }

  #effectiveCrossOrigin(): string {
    return this.withCredentials ? "use-credentials" : this.crossOrigin;
  }
}
