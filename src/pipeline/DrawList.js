export class DrawList {
	/** @type {import('./DrawCall.js').DrawCall[]} */
	#calls = [];

	/**
	 * Lights collected during scene traversal.
	 * @type {Array<Record<string, unknown>>}
	 */
	lights = [];

	/** @returns {import('./DrawCall.js').DrawCall[]} */
	get calls() {
		return this.#calls;
	}

	/** @returns {number} */
	get length() {
		return this.#calls.length;
	}

	/**
	 * @param {import('./DrawCall.js').DrawCall} drawCall
	 * @returns {void}
	 */
	add(drawCall) {
		this.#calls.push(drawCall);
	}

	/** @returns {void} */
	clear() {
		this.#calls.length = 0;
	}

	/** @returns {Iterator<import('./DrawCall.js').DrawCall>} */
	[Symbol.iterator]() {
		return this.#calls[Symbol.iterator]();
	}
}
