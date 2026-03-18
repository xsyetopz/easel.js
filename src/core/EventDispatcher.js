/**
 * @typedef {{ type: string, [key: string]: * }} Event
 * @typedef {(event: Event) => void} EventListener
 */

export class EventDispatcher {
	/** @type {Record<string, EventListener[]>} */
	#listeners = {};

	/**
	 * @param {string} type
	 * @param {EventListener} listener
	 * @returns {this}
	 */
	addEventListener(type, listener) {
		const listeners = this.#listeners;
		if (listeners[type] === undefined) {
			listeners[type] = [];
		}
		if (listeners[type].indexOf(listener) === -1) {
			listeners[type].push(listener);
		}
		return this;
	}

	/**
	 * @param {string} type
	 * @param {EventListener} listener
	 * @returns {boolean}
	 */
	hasEventListener(type, listener) {
		const listeners = this.#listeners;
		return (
			listeners[type] !== undefined && listeners[type].indexOf(listener) !== -1
		);
	}

	/**
	 * @param {string} type
	 * @param {EventListener} listener
	 * @returns {this}
	 */
	removeEventListener(type, listener) {
		const listeners = this.#listeners;
		const arr = listeners[type];
		if (arr !== undefined) {
			const index = arr.indexOf(listener);
			if (index !== -1) {
				arr.splice(index, 1);
			}
		}
		return this;
	}

	/**
	 * @param {Event} event
	 * @returns {void}
	 */
	dispatchEvent(event) {
		const listeners = this.#listeners;
		const arr = listeners[event.type];
		if (arr !== undefined) {
			for (const listener of arr.slice()) {
				listener.call(this, event);
			}
		}
	}
}
