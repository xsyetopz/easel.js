/** Event target whose {@link FakeTarget.fire} dispatches plain-field events. */
export class FakeTarget extends EventTarget {
  /** Dispatches a cancelable event of `type` carrying `fields`. */
  fire(type: string, fields: Record<string, unknown> = {}): Event {
    const event = Object.assign(new Event(type, { cancelable: true }), fields);
    this.dispatchEvent(event);
    return event;
  }
}

/** Fake document used as a control element's `ownerDocument`. */
export class FakeDocument extends FakeTarget {
  pointerLockElement: unknown = undefined;

  exitPointerLock(): void {
    this.pointerLockElement = undefined;
    this.dispatchEvent(new Event("pointerlockchange"));
  }
}

/**
 * Fake canvas-like element accepted by both EASEL and three.js controls.
 *
 * Pointer capture is recorded, pointer lock is granted synchronously through
 * the owning {@link FakeDocument}, and events are dispatched with
 * {@link FakeElement.fire}.
 */
export class FakeElement extends FakeTarget {
  readonly ownerDocument: FakeDocument = new FakeDocument();
  readonly style: { touchAction: string; cursor: string } = {
    touchAction: "",
    cursor: "",
  };
  readonly captured = new Set<number>();
  clientWidth: number;
  clientHeight: number;
  tabIndex = -1;

  constructor(width = 800, height = 600) {
    super();
    this.clientWidth = width;
    this.clientHeight = height;
  }

  getBoundingClientRect(): {
    left: number;
    top: number;
    x: number;
    y: number;
    width: number;
    height: number;
    right: number;
    bottom: number;
  } {
    return {
      left: 0,
      top: 0,
      x: 0,
      y: 0,
      width: this.clientWidth,
      height: this.clientHeight,
      right: this.clientWidth,
      bottom: this.clientHeight,
    };
  }

  getRootNode(): FakeDocument {
    return this.ownerDocument;
  }

  focus(): void {
    /* focus is not observable in tests */
  }

  setPointerCapture(pointerId: number): void {
    this.captured.add(pointerId);
  }

  releasePointerCapture(pointerId: number): void {
    this.captured.delete(pointerId);
  }

  hasPointerCapture(pointerId: number): boolean {
    return this.captured.has(pointerId);
  }

  requestPointerLock(): void {
    this.ownerDocument.pointerLockElement = this;
    this.ownerDocument.dispatchEvent(new Event("pointerlockchange"));
  }
}

/** Pointer event fields for a mouse pointer at client coordinates. */
export function mouse(
  clientX: number,
  clientY: number,
  button = 0,
  pointerId = 1,
): Record<string, unknown> {
  return {
    pointerId,
    pointerType: "mouse",
    button,
    buttons: button === 0 ? 1 : button === 1 ? 4 : 2,
    clientX,
    clientY,
    pageX: clientX,
    pageY: clientY,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    isPrimary: pointerId === 1,
  };
}

/** Pointer event fields for a touch pointer at client coordinates. */
export function touch(
  clientX: number,
  clientY: number,
  pointerId: number,
): Record<string, unknown> {
  return {
    pointerId,
    pointerType: "touch",
    button: 0,
    buttons: 1,
    clientX,
    clientY,
    pageX: clientX,
    pageY: clientY,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    isPrimary: pointerId === 1,
  };
}
