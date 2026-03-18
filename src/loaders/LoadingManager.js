/**
 * Tracks loading state across multiple assets.
 */
export class LoadingManager {
	/** @type {((event: void) => void) | undefined} */
	#onLoad;

	/** @type {((url: string, loaded: number, total: number) => void) | undefined} */
	#onProgress;

	/** @type {((url: string) => void) | undefined} */
	#onError;

	/** @type {boolean} */
	#isLoading = false;

	/** @type {number} */
	#itemsLoaded = 0;

	/** @type {number} */
	#itemsTotal = 0;

	/**
	 * @param {(() => void) | undefined} [onLoad]
	 * @param {((url: string, loaded: number, total: number) => void) | undefined} [onProgress]
	 * @param {((url: string) => void) | undefined} [onError]
	 */
	constructor(onLoad, onProgress, onError) {
		this.#onLoad = onLoad;
		this.#onProgress = onProgress;
		this.#onError = onError;
	}

	/** @returns {boolean} */
	get isLoading() {
		return this.#isLoading;
	}

	/**
	 * @param {string} _url
	 * @returns {void}
	 */
	itemStart(_url) {
		this.#itemsTotal++;
		this.#isLoading = true;
	}

	/**
	 * @param {string} url
	 * @returns {void}
	 */
	itemEnd(url) {
		this.#itemsLoaded++;
		this.#onProgress?.(url, this.#itemsLoaded, this.#itemsTotal);

		if (this.#itemsLoaded === this.#itemsTotal) {
			this.#isLoading = false;
			this.#onLoad?.();
		}
	}

	/**
	 * @param {string} url
	 * @returns {void}
	 */
	itemError(url) {
		this.#onError?.(url);
	}

	/**
	 * Returns url as-is. Override for path resolution.
	 * @param {string} url
	 * @returns {string}
	 */
	resolveURL(url) {
		return url;
	}
}

export const DefaultLoadingManager = new LoadingManager();
