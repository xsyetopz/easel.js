import type {
  ExampleInstance,
  ExampleModule,
  ExampleParams,
} from "../loaders/examples.ts";

export const EXAMPLE_ASPECT_RATIO = 16 / 9;

export interface ExampleViewportSize {
  width: number;
  height: number;
}

export type ExampleRuntimeState = "loading" | "ready" | "unsupported" | "error";

export interface ExampleRuntimeOptions {
  canvas: HTMLCanvasElement;
  container?: HTMLElement | null;
  module: ExampleModule;
  params: ExampleParams;
  onState?: (state: ExampleRuntimeState, error?: unknown) => void;
}

export interface ExampleRuntimeController {
  readonly paused: boolean;
  pause(): void;
  resize(): void;
  resume(): void;
  update(params: ExampleParams): void;
  cleanup(): void;
}

type ExampleViewportContainer = Pick<HTMLElement, "clientWidth">;

function normalizePixelSize(value: number): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? Math.max(1, Math.floor(numericValue))
    : 1;
}

export function getExampleViewportSize(
  container: ExampleViewportContainer | null | undefined,
): ExampleViewportSize {
  const width = normalizePixelSize(container?.clientWidth ?? 0);
  const height = normalizePixelSize(Math.round(width / EXAMPLE_ASPECT_RATIO));
  return { width, height };
}

export function resizeExampleCanvas(
  canvas: HTMLCanvasElement | null | undefined,
  container:
    | ExampleViewportContainer
    | null
    | undefined = canvas?.parentElement,
): boolean {
  if (!canvas || !container) return false;
  const { width, height } = getExampleViewportSize(container);
  if (canvas.width === width && canvas.height === height) return false;
  canvas.width = width;
  canvas.height = height;
  return true;
}

function hasCanvas2DContext(canvas: HTMLCanvasElement): boolean {
  try {
    return canvas.getContext("2d") !== null;
  } catch {
    return false;
  }
}

/**
 * Mounts one registry module into a responsive Canvas2D stage.
 *
 * The controller owns the observer, animation teardown, and reduced-motion
 * media listener so page navigation cannot leave a scene running in the
 * background. Modules that expose `resize`, `update`, `pause`, `resume`, or
 * `setReducedMotion` receive those lifecycle calls; other modules are
 * remounted safely when the canvas dimensions change or a control is changed.
 */
export function mountExampleRuntime({
  canvas,
  container = canvas.parentElement,
  module,
  params,
  onState,
}: ExampleRuntimeOptions): ExampleRuntimeController {
  let instance: ExampleInstance | undefined;
  let disposed = false;
  let paused = false;
  let resizeObserver: ResizeObserver | undefined;
  const resizeFallback = (): void => resize();
  const mediaQuery =
    typeof globalThis.matchMedia === "function"
      ? globalThis.matchMedia("(prefers-reduced-motion: reduce)")
      : undefined;
  const reducedMotion = (): boolean => mediaQuery?.matches === true;

  function report(state: ExampleRuntimeState, error?: unknown): void {
    onState?.(state, error);
  }

  function applyReducedMotion(): void {
    const reduce = reducedMotion();
    instance?.setReducedMotion?.(reduce);
    if (paused && !reduce) instance?.pause?.();
  }

  function mount(): void {
    if (disposed) return;
    report("loading");
    instance?.cleanup?.();
    instance = undefined;
    if (!hasCanvas2DContext(canvas)) {
      report("unsupported");
      return;
    }
    resizeExampleCanvas(canvas, container);
    try {
      instance = module.setup(canvas, params);
      applyReducedMotion();
      report("ready");
    } catch (error) {
      instance = undefined;
      report("error", error);
    }
  }

  function resize(): void {
    if (disposed) return;
    if (!resizeExampleCanvas(canvas, container)) return;
    if (instance?.resize) {
      try {
        instance.resize(canvas.width, canvas.height);
      } catch (error) {
        instance.cleanup?.();
        instance = undefined;
        report("error", error);
      }
      return;
    }
    mount();
  }

  function update(nextParams: ExampleParams): void {
    if (disposed) return;
    Object.assign(params, nextParams);
    if (instance?.update) {
      try {
        instance.update(params);
      } catch (error) {
        report("error", error);
      }
      return;
    }
    mount();
  }

  function onReducedMotionChange(): void {
    applyReducedMotion();
  }

  function pause(): void {
    if (disposed) return;
    paused = true;
    try {
      instance?.pause?.();
    } catch (error) {
      report("error", error);
    }
  }

  function resume(): void {
    if (disposed) return;
    paused = false;
    try {
      instance?.resume?.();
    } catch (error) {
      report("error", error);
    }
  }

  mount();
  if (container && typeof globalThis.ResizeObserver === "function") {
    resizeObserver = new globalThis.ResizeObserver(resize);
    resizeObserver.observe(container);
  } else if (typeof globalThis.addEventListener === "function") {
    globalThis.addEventListener("resize", resizeFallback);
  }
  mediaQuery?.addEventListener?.("change", onReducedMotionChange);

  return {
    get paused(): boolean {
      return paused || reducedMotion();
    },
    pause,
    resize,
    resume,
    update,
    cleanup(): void {
      if (disposed) return;
      disposed = true;
      resizeObserver?.disconnect();
      if (typeof globalThis.removeEventListener === "function") {
        globalThis.removeEventListener("resize", resizeFallback);
      }
      mediaQuery?.removeEventListener?.("change", onReducedMotionChange);
      instance?.cleanup?.();
      instance = undefined;
    },
  };
}
