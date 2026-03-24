export interface Event {
	type: string;
	[key: string]: unknown;
}

export type EventListener = (event: Event) => void;

/** Mixin-compatible event system with addEventListener/removeEventListener/dispatchEvent. */
export class EventDispatcher {
	#listeners: Record<string, EventListener[]> = {};

	addEventListener(type: string, listener: EventListener): this {
		const listeners = this.#listeners;
		if (listeners[type] === undefined) {
			listeners[type] = [];
		}
		if (listeners[type].indexOf(listener) === -1) {
			listeners[type].push(listener);
		}
		return this;
	}

	hasEventListener(type: string, listener: EventListener): boolean {
		const listeners = this.#listeners;
		return (
			listeners[type] !== undefined && listeners[type].indexOf(listener) !== -1
		);
	}

	removeEventListener(type: string, listener: EventListener): this {
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

	dispatchEvent(event: Event): void {
		const listeners = this.#listeners;
		const arr = listeners[event.type];
		if (arr !== undefined) {
			for (const listener of arr.slice()) {
				listener.call(this, event);
			}
		}
	}
}
