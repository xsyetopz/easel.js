import { Loader } from "./Loader.js";
import { DefaultLoadingManager } from "./LoadingManager.js";

/**
 * Loads files via the fetch API.
 */
export class FileLoader extends Loader {
	/** @type {string} */
	#responseType = "";

	/** @type {string | undefined} */
	#mimeType = undefined;

	/**
	 * @param {*} [manager]
	 */
	constructor(manager = undefined) {
		super(manager);
	}

	/**
	 * @param {string} type
	 * @returns {this}
	 */
	setResponseType(type) {
		this.#responseType = type;
		return this;
	}

	/**
	 * @param {string} type
	 * @returns {this}
	 */
	setMimeType(type) {
		this.#mimeType = type;
		return this;
	}

	/**
	 * @override
	 * @param {string} url
	 * @param {((data: *) => void) | undefined} [onLoad]
	 * @param {((event: ProgressEvent) => void) | undefined} [_onProgress]
	 * @param {((err: *) => void) | undefined} [onError]
	 * @returns {void}
	 */
	load(url, onLoad, _onProgress = undefined, onError = undefined) {
		const manager = this.manager ?? DefaultLoadingManager;
		const fullUrl = this.path + url;

		manager.itemStart(fullUrl);

		const headers = { ...this.requestHeader };
		if (this.#mimeType) {
			headers["Accept"] = this.#mimeType;
		}

		const responseType = this.#responseType || "text";

		fetch(fullUrl, { headers })
			.then((response) => {
				if (!response.ok) {
					throw new Error(
						`FileLoader: fetch failed — ${response.status} ${response.statusText}`,
					);
				}
				return /** @type {Record<string, () => Promise<*>>} */ (
					/** @type {unknown} */ (response)
				)[responseType]();
			})
			.then((data) => {
				onLoad?.(data);
				manager.itemEnd(fullUrl);
			})
			.catch((err) => {
				onError?.(err);
				manager.itemError(fullUrl);
			});
	}
}
