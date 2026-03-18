/**
 * Abstract base loader.
 */
export class Loader {
	/** @type {*} */
	#manager;

	/** @type {string} */
	#path = "";

	/** @type {string} */
	#crossOrigin = "anonymous";

	/** @type {Record<string, string>} */
	#requestHeader = {};

	/**
	 * @param {*} [manager] - LoadingManager instance
	 */
	constructor(manager = undefined) {
		this.#manager = manager;
	}

	/** @returns {*} */
	get manager() {
		return this.#manager;
	}

	/** @returns {string} */
	get path() {
		return this.#path;
	}

	/** @returns {string} */
	get crossOrigin() {
		return this.#crossOrigin;
	}

	/** @returns {Record<string, string>} */
	get requestHeader() {
		return this.#requestHeader;
	}

	/**
	 * @param {string} path
	 * @returns {this}
	 */
	setPath(path) {
		this.#path = path;
		return this;
	}

	/**
	 * @param {string} crossOrigin
	 * @returns {this}
	 */
	setCrossOrigin(crossOrigin) {
		this.#crossOrigin = crossOrigin;
		return this;
	}

	/**
	 * @param {Record<string, string>} requestHeader
	 * @returns {this}
	 */
	setRequestHeader(requestHeader) {
		this.#requestHeader = requestHeader;
		return this;
	}

	/**
	 * Abstract — subclasses override.
	 * @param {string} _url
	 * @param {((data: *) => void) | undefined} _onLoad
	 * @param {((event: ProgressEvent) => void) | undefined} _onProgress
	 * @param {((err: *) => void) | undefined} _onError
	 * @returns {void}
	 */
	load(_url, _onLoad, _onProgress, _onError) {
		// Abstract
	}

	/**
	 * Promise-based wrapper around load().
	 * @param {string} url
	 * @param {((event: ProgressEvent) => void) | undefined} [onProgress]
	 * @returns {Promise<*>}
	 */
	loadAsync(url, onProgress) {
		return new Promise((resolve, reject) => {
			this.load(url, resolve, onProgress, reject);
		});
	}
}
