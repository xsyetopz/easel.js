import type { Cache } from "./Cache.ts";
import {
  DefaultLoadingManager,
  type LoadingManager,
} from "./LoadingManager.ts";

/** Abstract base for resource loaders with explicit configuration and lifecycle. */
export class Loader {
  readonly #manager: LoadingManager;
  #path = "";
  #resourcePath = "";
  #crossOrigin = "anonymous";
  #withCredentials = false;
  #requestHeader: Record<string, string> = {};
  #cache: Cache<string, unknown> | undefined;

  /** Constructs a resource loader bound to the supplied or default manager. */
  constructor(manager: LoadingManager | undefined = void 0) {
    this.#manager = manager ?? DefaultLoadingManager;
  }

  /** Loading manager that owns this loader's request lifecycle. */
  get manager(): LoadingManager {
    return this.#manager;
  }

  /** Base path prepended to primary asset URLs. */
  get path(): string {
    return this.#path;
  }

  /** Replaces the base path prepended to primary asset URLs. */
  set path(value: string) {
    this.#path = value;
  }

  /** Base path used by loaders for dependent resources. */
  get resourcePath(): string {
    return this.#resourcePath;
  }

  /** Replaces the base path used for dependent resources. */
  set resourcePath(value: string) {
    this.#resourcePath = value;
  }

  /** Cross-origin mode used by element-backed loaders. */
  get crossOrigin(): string {
    return this.#crossOrigin;
  }

  /** Replaces the cross-origin mode used by element-backed loaders. */
  set crossOrigin(value: string) {
    this.#crossOrigin = value;
  }

  /** Whether Fetch requests include cross-origin credentials. */
  get withCredentials(): boolean {
    return this.#withCredentials;
  }

  /** Controls whether Fetch requests include cross-origin credentials. */
  set withCredentials(value: boolean) {
    this.#withCredentials = value;
  }

  /** Readonly view of headers copied into each request. */
  get requestHeader(): Readonly<Record<string, string>> {
    return this.#requestHeader;
  }

  /** Replaces request headers with an independent shallow copy. */
  set requestHeader(value: Readonly<Record<string, string>>) {
    this.#requestHeader = { ...value };
  }

  /** Optional cache shared by this loader and delegated loaders. */
  get cache(): Cache<string, unknown> | undefined {
    return this.#cache;
  }

  /** Replaces or disables this loader's explicit cache. */
  set cache(value: Cache<string, unknown> | undefined) {
    this.#cache = value;
  }

  /** Parses raw data into a runtime value; concrete loaders override this. */
  parse(_data: unknown): unknown {
    return _data;
  }

  /** Starts a resource request; concrete loaders override this operation. */
  load(
    _url: string,
    _onLoad: ((data: unknown) => void) | undefined,
    _onProgress: ((event: ProgressEvent) => void) | undefined,
    _onError: ((err: unknown) => void) | undefined,
  ): void {
    // Abstract operation.
  }

  /** Resolves with the value produced by {@link load}. */
  loadAsync(
    url: string,
    onProgress?: (event: ProgressEvent) => void,
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.load(url, resolve, onProgress, reject);
    });
  }

  /** Cancels active work in subclasses that support cancellation. */
  abort(): this {
    return this;
  }
}
