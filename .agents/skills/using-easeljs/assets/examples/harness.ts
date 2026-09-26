// Stub Canvas2D host for running EASEL examples under Bun without a browser.
// Modeled on the repository's tests/examples/example-canvas-harness.js: the
// canvas records the last ImageData upload so checks can count pixels.

export interface StubCanvas {
  readonly element: HTMLCanvasElement;
  /** RGBA bytes from the most recent renderer upload. */
  readonly frame: Uint8ClampedArray;
  /** Event types that currently have at least one listener. */
  readonly listenerTypes: string[];
  /** Delivers a synthetic event to registered listeners. */
  dispatch(event: { type: string } & Record<string, unknown>): void;
}

export function createStubCanvas(
  width = 64,
  height = 48,
  cssWidth = width,
  cssHeight = height,
): StubCanvas {
  let frame = new Uint8ClampedArray(width * height * 4);
  const listeners = new Map<string, Set<(event: unknown) => void>>();
  const canvas = {
    width,
    height,
    isConnected: false,
    style: {},
    addEventListener(type: string, listener: (event: unknown) => void) {
      const set = listeners.get(type) ?? new Set();
      set.add(listener);
      listeners.set(type, set);
    },
    removeEventListener(type: string, listener: (event: unknown) => void) {
      const set = listeners.get(type);
      set?.delete(listener);
      if (set?.size === 0) listeners.delete(type);
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: cssWidth, height: cssHeight };
    },
    getContext(type: string) {
      if (type !== "2d") return null;
      return {
        imageSmoothingEnabled: false,
        putImageData(image: { data: Uint8ClampedArray }) {
          frame = new Uint8ClampedArray(image.data);
        },
      };
    },
    setPointerCapture() {},
    releasePointerCapture() {},
  };
  return {
    element: canvas as unknown as HTMLCanvasElement,
    get frame() {
      return frame;
    },
    get listenerTypes() {
      return [...listeners.keys()];
    },
    dispatch(event) {
      for (const listener of listeners.get(event.type) ?? []) {
        listener(event);
      }
    },
  };
}

/** Counts pixels that differ from the top-left pixel (the clear color). */
export function countDrawnPixels(frame: Uint8ClampedArray): number {
  let count = 0;
  for (let i = 0; i < frame.length; i += 4) {
    if (
      frame[i] !== frame[0] ||
      frame[i + 1] !== frame[1] ||
      frame[i + 2] !== frame[2]
    ) {
      count++;
    }
  }
  return count;
}

/** Returns the packed RGB value of one pixel. */
export function pixelAt(
  frame: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): number {
  const i = (y * width + x) * 4;
  return ((frame[i] ?? 0) << 16) | ((frame[i + 1] ?? 0) << 8) | (frame[i + 2] ?? 0);
}

/** Manual requestAnimationFrame replacement installed on globalThis. */
export function installFrameScheduler(): {
  step(timestamp: number): void;
  readonly pending: number;
  restore(): void;
} {
  const callbacks = new Map<number, FrameRequestCallback>();
  let next = 1;
  const previousRequest = globalThis.requestAnimationFrame;
  const previousCancel = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = (callback) => {
    const handle = next++;
    callbacks.set(handle, callback);
    return handle;
  };
  globalThis.cancelAnimationFrame = (handle) => {
    callbacks.delete(handle);
  };
  return {
    step(timestamp) {
      const due = [...callbacks.values()];
      callbacks.clear();
      for (const callback of due) callback(timestamp);
    },
    get pending() {
      return callbacks.size;
    },
    restore() {
      globalThis.requestAnimationFrame = previousRequest;
      globalThis.cancelAnimationFrame = previousCancel;
    },
  };
}

export function expect(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export function expectThrows(run: () => unknown, pattern: RegExp): string {
  try {
    run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    expect(pattern.test(message), `unexpected error: ${message}`);
    return message;
  }
  throw new Error(`expected an error matching ${pattern}`);
}
