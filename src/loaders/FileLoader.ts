import { Loader } from "./Loader.ts";

/** Response types supported by the Fetch-backed file loader. */
export type FileResponseType =
  | ""
  | "arraybuffer"
  | "blob"
  | "document"
  | "json"
  | "text";

/** Loads files through Fetch with explicit caching, progress, and cancellation. */
export class FileLoader extends Loader {
  #responseType: FileResponseType = "";
  #mimeType: string = "";
  readonly #controllers = new Set<AbortController>();

  /** Response conversion applied after a successful request. */
  get responseType(): FileResponseType {
    return this.#responseType;
  }

  /** Selects the Fetch response conversion used by this loader. */
  set responseType(value: FileResponseType) {
    this.#responseType = value;
  }

  /** Expected MIME type used for document parsing and the Accept header. */
  get mimeType(): string {
    return this.#mimeType;
  }

  /** Sets the MIME type used for document parsing and the Accept header. */
  set mimeType(value: string) {
    this.#mimeType = value;
  }

  /** Builds the cache key from the URL and loader configuration. */
  cacheKey(url: string): string {
    const headers = Object.entries(this.#requestHeaders()).sort(
      ([left], [right]) => left.localeCompare(right),
    );
    return JSON.stringify([
      this.manager.resolveUrl(this.path + url),
      this.#responseType || "text",
      headers,
      this.withCredentials,
    ]);
  }

  /** Starts a request and reports its lifecycle to the loading manager. */
  override load(
    url: string,
    onLoad?: ((data: unknown) => void) | undefined,
    onProgress?: ((event: ProgressEvent) => void) | undefined,
    onError?: ((err: unknown) => void) | undefined,
  ): void {
    const fullUrl = this.manager.resolveUrl(this.path + url);
    const cacheKey = this.cacheKey(url);
    this.manager.itemStart(fullUrl);

    if (this.cache?.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      queueMicrotask(() => {
        onLoad?.(cached);
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
      .then((response) => this.#validateResponse(response))
      .then((response) => this.#withProgress(response, onProgress))
      .then((response) => this.#readResponse(response))
      .then((data) => {
        this.cache?.set(cacheKey, data);
        onLoad?.(data);
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
    const headers = { ...this.requestHeader } as Record<string, string> & {
      Accept?: string;
    };
    if (this.#mimeType) headers.Accept = this.#mimeType;
    return headers;
  }

  #validateResponse(response: Response): Response {
    if (!response.ok && response.status !== 0) {
      throw new Error(
        `FileLoader: fetch failed - ${response.status} ${response.statusText}`,
      );
    }
    return response;
  }

  #withProgress(
    response: Response,
    onProgress: ((event: ProgressEvent) => void) | undefined,
  ): Response {
    if (!(onProgress && response.body)) return response;
    const total = Number(
      response.headers.get("X-File-Size") ??
        response.headers.get("Content-Length") ??
        0,
    );
    const reader = response.body.getReader();
    let loaded = 0;
    const stream = new ReadableStream<Uint8Array>({
      async pull(
        controller: ReadableStreamDefaultController<Uint8Array>,
      ): Promise<void> {
        const result = await reader.read();
        if (result.done) {
          controller.close();
          return;
        }
        loaded += result.value.byteLength;
        onProgress(createProgressEvent(loaded, total));
        controller.enqueue(result.value);
      },
      cancel(reason: unknown): Promise<void> {
        return reader.cancel(reason);
      },
    });
    return new Response(stream, {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
    });
  }

  #readResponse(response: Response): Promise<unknown> {
    switch (this.#responseType) {
      case "arraybuffer":
        return response.arrayBuffer();
      case "blob":
        return response.blob();
      case "document":
        return response.text().then((text) => {
          if (typeof DOMParser === "undefined") {
            throw new Error("FileLoader document responses require DOMParser.");
          }
          return new DOMParser().parseFromString(
            text,
            documentMimeType(this.#mimeType),
          );
        });
      case "json":
        return response.json();
      default:
        return response.text();
    }
  }
}

function documentMimeType(value: string): DOMParserSupportedType {
  switch (value) {
    case "application/xhtml+xml":
    case "application/xml":
    case "image/svg+xml":
    case "text/html":
    case "text/xml":
      return value;
    default:
      return "text/html";
  }
}

function createProgressEvent(loaded: number, total: number): ProgressEvent {
  const lengthComputable = total > 0;
  if (typeof ProgressEvent !== "undefined") {
    return new ProgressEvent("progress", {
      lengthComputable,
      loaded,
      total,
    });
  }
  return {
    lengthComputable,
    loaded,
    total,
    type: "progress",
  } as ProgressEvent;
}
