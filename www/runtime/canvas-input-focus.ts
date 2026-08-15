interface ActivatableControls {
  enabled: boolean;
  dispose(): void;
}

export interface ClickActivatedControls<T extends ActivatableControls> {
  readonly controls: T;
  readonly active: boolean;
  dispose(): void;
}

type PointerLockRequest = () => void | Promise<void>;

/** Captures the pointer and enables controls only after a canvas click. */
export function createClickActivatedControls<T extends ActivatableControls>(
  canvas: HTMLCanvasElement,
  createControls: () => T,
): ClickActivatedControls<T> {
  const previousTabIndex = canvas.tabIndex;
  const ownerDocument = canvas.ownerDocument;
  const requestPointerLock = canvas.requestPointerLock as
    | PointerLockRequest
    | undefined;
  const supportsPointerLock =
    typeof requestPointerLock === "function" &&
    typeof ownerDocument?.exitPointerLock === "function";
  let controls = createControls();
  let active = false;
  let lockPending = false;
  let disposed = false;
  controls.enabled = false;
  canvas.tabIndex = 0;
  canvas.setAttribute("aria-keyshortcuts", "Escape");

  const setActive = (nextActive: boolean): void => {
    active = nextActive;
    controls.enabled = nextActive;
    canvas.setAttribute("data-input-active", String(nextActive));
    if (nextActive) canvas.focus({ preventScroll: true });
    else canvas.blur();
  };
  const replaceControls = (): void => {
    controls.dispose();
    controls = createControls();
    controls.enabled = false;
  };
  const deactivate = (): void => {
    lockPending = false;
    if (active || controls.enabled) replaceControls();
    setActive(false);
  };
  const onPointerLockChange = (): void => {
    if (disposed) return;
    if (ownerDocument.pointerLockElement === canvas) {
      lockPending = false;
      replaceControls();
      setActive(true);
    } else if (active) {
      deactivate();
    }
  };
  const onPointerLockError = (): void => {
    if (disposed || ownerDocument.pointerLockElement === canvas) return;
    deactivate();
  };
  const activate = (): void => {
    if (disposed || active || lockPending) return;
    if (!supportsPointerLock) {
      replaceControls();
      setActive(true);
      return;
    }

    lockPending = true;
    canvas.focus({ preventScroll: true });
    try {
      const request = requestPointerLock.call(canvas);
      if (request && typeof request.then === "function") {
        void request.then(() => {
          if (disposed && ownerDocument.pointerLockElement === canvas)
            ownerDocument.exitPointerLock();
        }, onPointerLockError);
      }
    } catch {
      onPointerLockError();
    }
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (!(active && event.code === "Escape")) return;
    event.preventDefault();
    deactivate();
    if (ownerDocument.pointerLockElement === canvas)
      ownerDocument.exitPointerLock();
  };

  canvas.addEventListener("click", activate);
  ownerDocument?.addEventListener("pointerlockchange", onPointerLockChange);
  ownerDocument?.addEventListener("pointerlockerror", onPointerLockError);
  globalThis.addEventListener("keydown", onKeyDown);
  setActive(false);

  return {
    get controls(): T {
      return controls;
    },
    get active(): boolean {
      return active;
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      canvas.removeEventListener("click", activate);
      ownerDocument?.removeEventListener(
        "pointerlockchange",
        onPointerLockChange,
      );
      ownerDocument?.removeEventListener(
        "pointerlockerror",
        onPointerLockError,
      );
      globalThis.removeEventListener("keydown", onKeyDown);
      lockPending = false;
      active = false;
      controls.enabled = false;
      controls.dispose();
      if (ownerDocument?.pointerLockElement === canvas)
        ownerDocument.exitPointerLock();
      canvas.blur();
      canvas.tabIndex = previousTabIndex;
      canvas.removeAttribute("data-input-active");
      canvas.removeAttribute("aria-keyshortcuts");
    },
  };
}
