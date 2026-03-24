/** Tracks loading state across multiple assets. */
export class LoadingManager {
	#onLoad: (() => void) | undefined;
	#onProgress:
		| ((url: string, loaded: number, total: number) => void)
		| undefined;
	#onError: ((url: string) => void) | undefined;
	#isLoading = false;
	#itemsLoaded = 0;
	#itemsTotal = 0;

	constructor(
		onLoad?: () => void,
		onProgress?: (url: string, loaded: number, total: number) => void,
		onError?: (url: string) => void,
	) {
		this.#onLoad = onLoad;
		this.#onProgress = onProgress;
		this.#onError = onError;
	}

	get isLoading(): boolean {
		return this.#isLoading;
	}

	itemStart(_url: string): void {
		this.#itemsTotal++;
		this.#isLoading = true;
	}

	itemEnd(url: string): void {
		this.#itemsLoaded++;
		this.#onProgress?.(url, this.#itemsLoaded, this.#itemsTotal);

		if (this.#itemsLoaded === this.#itemsTotal) {
			this.#isLoading = false;
			this.#onLoad?.();
		}
	}

	itemError(url: string): void {
		this.#onError?.(url);
	}

	/**
	 * Returns url as-is. Override for path resolution.
	 */
	resolveURL(url: string): string {
		return url;
	}
}

/** Shared default LoadingManager instance. */
export const DefaultLoadingManager = new LoadingManager();
