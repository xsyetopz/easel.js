/**
 * Small DOM-like canvas used by example tests.
 *
 * It captures the renderer's ImageData uploads and implements the event and
 * geometry methods used by pointer, keyboard, and control examples.
 */
export function createExampleCanvas(width = 640, height = 360) {
  let frame = new Uint8ClampedArray(width * height * 4);
  const listeners = new Map();
  const documentListeners = new Map();
  let pointerLockElement;
  const dispatchDocumentEvent = (type) => {
    for (const listener of documentListeners.get(type) ?? [])
      listener({ type });
  };
  const ownerDocument = {
    get pointerLockElement() {
      return pointerLockElement;
    },
    addEventListener(type, listener) {
      const handlers = documentListeners.get(type) ?? new Set();
      handlers.add(listener);
      documentListeners.set(type, handlers);
    },
    removeEventListener(type, listener) {
      const handlers = documentListeners.get(type);
      handlers?.delete(listener);
      if (handlers?.size === 0) documentListeners.delete(type);
    },
    exitPointerLock() {
      if (!pointerLockElement) return;
      pointerLockElement = undefined;
      dispatchDocumentEvent("pointerlockchange");
    },
  };
  const canvas = {
    ownerDocument,
    width,
    height,
    dataset: {},
    tabIndex: 0,
    focused: false,
    parentElement: { clientWidth: width },
    setAttribute(name, value) {
      canvas[name] = String(value);
    },
    removeAttribute(name) {
      delete canvas[name];
    },
    focus() {
      canvas.focused = true;
    },
    blur() {
      canvas.focused = false;
    },
    addEventListener(type, listener) {
      const handlers = listeners.get(type) ?? new Set();
      handlers.add(listener);
      listeners.set(type, handlers);
    },
    removeEventListener(type, listener) {
      const handlers = listeners.get(type);
      handlers?.delete(listener);
      if (handlers?.size === 0) listeners.delete(type);
    },
    dispatchEvent(event) {
      const handlers = listeners.get(event.type);
      for (const listener of handlers ?? []) listener(event);
      return true;
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: canvas.width, height: canvas.height };
    },
    getContext(type) {
      if (type !== "2d") return null;
      return {
        imageSmoothingEnabled: false,
        putImageData(image) {
          frame = new Uint8ClampedArray(image.data);
        },
      };
    },
    setPointerCapture() {},
    releasePointerCapture() {},
    requestPointerLock() {
      pointerLockElement = canvas;
      dispatchDocumentEvent("pointerlockchange");
    },
    get frame() {
      return frame;
    },
    get listenerTypes() {
      return [...listeners.keys()];
    },
  };
  return canvas;
}

export function countVisiblePixels(canvas) {
  const data = canvas.frame;
  if (data.length < 4) return 0;
  const red = data[0];
  const green = data[1];
  const blue = data[2];
  const alpha = data[3];
  let count = 0;
  for (let offset = 0; offset < data.length; offset += 4) {
    if (
      data[offset] !== red ||
      data[offset + 1] !== green ||
      data[offset + 2] !== blue ||
      data[offset + 3] !== alpha
    ) {
      count += 1;
    }
  }
  return count;
}

export function createAnimationScheduler() {
  const callbacks = new Map();
  let nextHandle = 1;
  return {
    request(callback) {
      const handle = nextHandle++;
      callbacks.set(handle, callback);
      return handle;
    },
    cancel(handle) {
      callbacks.delete(handle);
    },
    step(timestamp = 16) {
      const pending = [...callbacks.values()];
      callbacks.clear();
      for (const callback of pending) callback(timestamp);
    },
    get size() {
      return callbacks.size;
    },
  };
}

export function installGlobalEventHarness() {
  const previousAdd = globalThis.addEventListener;
  const previousRemove = globalThis.removeEventListener;
  const listeners = new Map();
  globalThis.addEventListener = (type, listener) => {
    const handlers = listeners.get(type) ?? new Set();
    handlers.add(listener);
    listeners.set(type, handlers);
  };
  globalThis.removeEventListener = (type, listener) => {
    const handlers = listeners.get(type);
    handlers?.delete(listener);
    if (handlers?.size === 0) listeners.delete(type);
  };
  return {
    dispatch(event) {
      for (const listener of listeners.get(event.type) ?? []) listener(event);
    },
    cleanup() {
      if (previousAdd === undefined) delete globalThis.addEventListener;
      else globalThis.addEventListener = previousAdd;
      if (previousRemove === undefined) delete globalThis.removeEventListener;
      else globalThis.removeEventListener = previousRemove;
    },
  };
}

export function interactionEvent(type, x = 320, y = 180) {
  return {
    type,
    clientX: x,
    clientY: y,
    button: 0,
    buttons: 1,
    pointerId: 1,
    deltaX: 0,
    deltaY: -1,
    key: "ArrowUp",
    code: "ArrowUp",
    preventDefault() {},
    stopPropagation() {},
  };
}
