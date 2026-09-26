/** Minimal browser target shared by the Canvas2D controls. */
export interface ControlDomElement extends EventTarget {
  /** Element width used to normalize pointer deltas. */
  clientWidth?: number;
  /** Layout width including borders, used by FlyControls to center pointer look. */
  offsetWidth?: number;
  /** Layout height including borders, used by FlyControls to center pointer look. */
  offsetHeight?: number;
  /** Horizontal offset from the offset parent. */
  offsetLeft?: number;
  /** Vertical offset from the offset parent. */
  offsetTop?: number;
  /** Element height used to normalize pointer deltas. */
  clientHeight?: number;
  /** Optional keyboard focus entry point for pointer-driven controls. */
  focus?: () => void;
  /** Optional tab order used to make a canvas keyboard-focusable. */
  tabIndex?: number;
  /** Captures pointer events for an active control gesture. */
  setPointerCapture?: (pointerId: number) => void;
  /** Releases a previously captured pointer. */
  releasePointerCapture?: (pointerId: number) => void;
  /** Requests browser pointer lock for first-person controls. */
  requestPointerLock?: (options?: { unadjustedMovement?: boolean }) => void;
  /** Exits browser pointer lock when this target owns the lock. */
  exitPointerLock?: () => void;
  /** Returns the root node (document or shadow root) that receives global key listeners. */
  getRootNode?: () => EventTarget;
  /** Document-like target used by PointerLockControls when available. */
  ownerDocument?: EventTarget & {
    pointerLockElement?: unknown;
    exitPointerLock?: () => void;
  };
  /** Returns the element's client-space bounds for pointer normalization. */
  getBoundingClientRect?: () => {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  /** Optional style object used to disable browser gesture handling and set the cursor. */
  style?: { touchAction?: string; cursor?: string };
}

/** Browser input fields consumed by the camera controls. */
export type ControlEvent = Event & {
  /** Mouse button index. */
  button?: number;
  /** Active mouse button bitmask. */
  buttons?: number;
  /** Pointer identifier. */
  pointerId?: number;
  /** Client-space horizontal pointer coordinate. */
  clientX?: number;
  /** Client-space vertical pointer coordinate. */
  clientY?: number;
  /** Document-space horizontal pointer coordinate. */
  pageX?: number;
  /** Document-space vertical pointer coordinate. */
  pageY?: number;
  /** Pointer device kind, such as `"mouse"`, `"pen"`, or `"touch"`. */
  pointerType?: string;
  /** Relative horizontal pointer movement. */
  movementX?: number;
  /** Relative vertical pointer movement. */
  movementY?: number;
  /** Horizontal wheel delta in client units. */
  deltaX?: number;
  /** Wheel delta in client units. */
  deltaY?: number;
  /** Whether Control was held. */
  ctrlKey?: boolean;
  /** Whether Meta was held. */
  metaKey?: boolean;
  /** Whether Shift was held. */
  shiftKey?: boolean;
  /** Whether this is the primary pointer of its type. */
  isPrimary?: boolean;
  /** Keyboard physical key code. */
  code?: string;
  /** Keyboard logical key value. */
  key?: string;
  /** Whether Alt was held when the event fired. */
  altKey?: boolean;
};

/** Returns a monotonic browser timestamp when available. */
export function now(): number {
  return globalThis.performance?.now() ?? Date.now();
}

/** Prevents the browser default action for a control event. */
export function prevent(event: Event): void {
  event.preventDefault?.();
}

/**
 * Returns the browser window that receives keyboard listeners, as three.js
 * controls use `window`. Falls back to `globalThis` when it is an event
 * target (workers, Deno, Bun) and to `undefined` when neither exists.
 */
export function controlWindow(): EventTarget | undefined {
  const scope = globalThis as unknown as {
    window?: EventTarget;
    addEventListener?: unknown;
  };
  if (scope.window !== undefined) return scope.window;
  return typeof scope.addEventListener === "function"
    ? (globalThis as unknown as EventTarget)
    : undefined;
}
