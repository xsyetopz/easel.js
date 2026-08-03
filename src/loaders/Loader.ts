import type { LoadingManager } from "./LoadingManager.ts";

/** Abstract base loader. */
export class Loader {
  #manager: LoadingManager | undefined;
  #path = "";
  #crossOrigin = "";
  #requestHeader: Record<string, string> = {};

  constructor(manager: LoadingManager | undefined = void 0) {
    this.#manager = manager;
  }

  get manager(): LoadingManager | undefined {
    return this.#manager;
  }

  get path(): string {
    return this.#path;
  }

  get crossOrigin(): string {
    return this.#crossOrigin;
  }

  get requestHeader(): Record<string, string> {
    return this.#requestHeader;
  }

  setPath(path: string): this {
    this.#path = path;
    return this;
  }

  setCrossOrigin(crossOrigin: string): this {
    this.#crossOrigin = crossOrigin;
    return this;
  }

  setRequestHeader(requestHeader: Record<string, string>): this {
    this.#requestHeader = requestHeader;
    return this;
  }

  /**
   * Abstract - subclasses override.
   */
  load(
    _url: string,
    _onLoad: ((data: unknown) => void) | undefined,
    _onProgress: ((event: ProgressEvent) => void) | undefined,
    _onError: ((err: unknown) => void) | undefined,
  ): void {
    // Abstract
  }

  /**
   * Promise-based wrapper around load().
   */
  loadAsync(
    url: string,
    onProgress?: (event: ProgressEvent) => void,
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.load(url, resolve, onProgress, reject);
    });
  }
}
