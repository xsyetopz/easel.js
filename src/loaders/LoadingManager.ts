/** Loader interface selected by LoadingManager URL-pattern handlers. */
export interface LoaderHandler {
  /** Starts loading through the registered handler. */
  load(...args: unknown[]): unknown;
}

/** Tracks loading state and cancellation across multiple assets. */
export class LoadingManager {
  #onStart: ((url: string, loaded: number, total: number) => void) | undefined;
  #onLoad: (() => void) | undefined;
  #onProgress:
    | ((url: string, loaded: number, total: number) => void)
    | undefined;
  #onError: ((url: string) => void) | undefined;
  #isLoading = false;
  #itemsLoaded = 0;
  #itemsTotal = 0;
  #urlModifier: ((url: string) => string) | undefined;
  #handlers: Array<{ pattern: RegExp; loader: LoaderHandler }> = [];
  #abortController: AbortController | undefined;

  /** Constructs a loading manager with optional lifecycle callbacks. */
  constructor(
    onLoad?: () => void,
    onProgress?: (url: string, loaded: number, total: number) => void,
    onError?: (url: string) => void,
  ) {
    this.#onLoad = onLoad;
    this.#onProgress = onProgress;
    this.#onError = onError;
  }

  /** Whether at least one tracked item has not finished. */
  get isLoading(): boolean {
    return this.#isLoading;
  }

  /** Callback invoked when a new loading batch starts. */
  get onStart():
    | ((url: string, loaded: number, total: number) => void)
    | undefined {
    return this.#onStart;
  }

  /** Replaces the loading-batch start callback. */
  set onStart(value:
    | ((url: string, loaded: number, total: number) => void)
    | undefined,) {
    this.#onStart = value;
  }

  /** Callback invoked when every item in the current batch finishes. */
  get onLoad(): (() => void) | undefined {
    return this.#onLoad;
  }

  /** Replaces the loading-batch completion callback. */
  set onLoad(value: (() => void) | undefined) {
    this.#onLoad = value;
  }

  /** Callback invoked after an individual item finishes. */
  get onProgress():
    | ((url: string, loaded: number, total: number) => void)
    | undefined {
    return this.#onProgress;
  }

  /** Replaces the individual-item progress callback. */
  set onProgress(value:
    | ((url: string, loaded: number, total: number) => void)
    | undefined,) {
    this.#onProgress = value;
  }

  /** Callback invoked when an individual item fails. */
  get onError(): ((url: string) => void) | undefined {
    return this.#onError;
  }

  /** Replaces the individual-item error callback. */
  set onError(value: ((url: string) => void) | undefined) {
    this.#onError = value;
  }

  /** Optional function applied to every resource URL. */
  get urlModifier(): ((url: string) => string) | undefined {
    return this.#urlModifier;
  }

  /** Replaces or clears the resource URL modifier. */
  set urlModifier(value: ((url: string) => string) | undefined) {
    this.#urlModifier = value;
  }

  /** Lazily-created controller shared by requests owned by this manager. */
  get abortController(): AbortController {
    if (!this.#abortController || this.#abortController.signal.aborted) {
      this.#abortController = new AbortController();
    }
    return this.#abortController;
  }

  /** Registers a new item and starts a batch when previously idle. */
  itemStart(_url: string): void {
    if (!this.#isLoading) {
      this.#onStart?.(_url, this.#itemsLoaded, this.#itemsTotal + 1);
    }
    this.#itemsTotal++;
    this.#isLoading = true;
  }

  /** Completes an item and emits progress and batch completion callbacks. */
  itemEnd(url: string): void {
    this.#itemsLoaded++;
    this.#onProgress?.(url, this.#itemsLoaded, this.#itemsTotal);

    if (this.#itemsLoaded === this.#itemsTotal) {
      this.#isLoading = false;
      this.#onLoad?.();
    }
  }

  /** Reports an item failure without changing completion counters. */
  itemError(url: string): void {
    this.#onError?.(url);
  }

  /** Normalizes and optionally rewrites a resource URL. */
  resolveUrl(url: string): string {
    const normalized = url.normalize("NFC");
    return this.#urlModifier?.(normalized) ?? normalized;
  }

  /** Registers a loader selected by a regular-expression match. */
  registerHandler(pattern: RegExp, loader: LoaderHandler): this {
    this.#handlers.push({ pattern, loader });
    return this;
  }

  /** Returns the first registered loader matching a file name. */
  handlerFor(file: string): LoaderHandler | undefined {
    for (const { pattern, loader } of this.#handlers) {
      if (pattern.global) pattern.lastIndex = 0;
      if (pattern.test(file)) return loader;
    }
    return void 0 as LoaderHandler | undefined;
  }

  /** Removes an exact registered regular-expression object. */
  unregisterHandler(pattern: RegExp): boolean {
    const index = this.#handlers.findIndex(
      (entry) => entry.pattern === pattern,
    );
    if (index === -1) return false;
    this.#handlers.splice(index, 1);
    return true;
  }

  /** Aborts current requests; later requests receive a fresh signal. */
  abort(): this {
    this.#abortController?.abort();
    this.#abortController = undefined;
    return this;
  }
}

/** Default manager used when a loader is constructed without an explicit manager. */
export const DefaultLoadingManager: LoadingManager = new LoadingManager();
