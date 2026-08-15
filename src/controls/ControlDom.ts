/** Minimal browser target shared by the Canvas2D controls. */
export interface ControlDomElement extends EventTarget {
  /** Element width used to normalize pointer deltas. */
  clientWidth?: number;
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
  /** Optional style object used to disable browser gesture handling. */
  style?: { touchAction?: string };
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
  /** Relative horizontal pointer movement. */
  movementX?: number;
  /** Relative vertical pointer movement. */
  movementY?: number;
  /** Wheel delta in client units. */
  deltaY?: number;
  /** Keyboard physical key code. */
  code?: string;
  /** Keyboard logical key value. */
  key?: string;
};

/** Returns a monotonic browser timestamp when available. */
export function now(): number {
  return globalThis.performance?.now() ?? Date.now();
}

/** Prevents the browser default action for a control event. */
export function prevent(event: Event): void {
  event.preventDefault?.();
}
