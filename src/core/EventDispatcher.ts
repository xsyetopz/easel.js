/** Event payload dispatched to registered listeners. */
export interface Event {
  /** Event name used to select listeners. */
  type: string;
  /** Additional event-specific payload fields. */
  [key: string]: unknown;
}

/** Callback invoked with a dispatched event payload. */
export type EventListener = (event: Event) => void;

/** Event listener registry with add, remove, query, and dispatch operations. */
export class EventDispatcher {
  #listeners: Record<string, EventListener[]> = {};

  /** Registers `listener` for `type` unless it is already registered. */
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

  /** Returns whether `listener` is registered for `type`. */
  hasEventListener(type: string, listener: EventListener): boolean {
    const listeners = this.#listeners;
    return (
      listeners[type] !== undefined && listeners[type].indexOf(listener) !== -1
    );
  }

  /** Removes `listener` from `type` and returns this dispatcher. */
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

  /** Invokes a snapshot of listeners registered for `event.type`. */
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
