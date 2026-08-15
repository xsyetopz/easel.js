/**
 * Owns one example's requestAnimationFrame lifecycle.
 *
 * The helper renders one initial frame immediately, then schedules frames only
 * while running. Pausing cancels the pending callback, reduced motion starts a
 * static frame, and cleanup permanently releases the loop. It deliberately
 * uses the host's public animation APIs rather than patching global functions.
 */
export interface ExampleAnimationController {
  readonly firstFrameRendered: boolean;
  pause(): void;
  resume(): void;
  setReducedMotion(reduced: boolean): void;
  cleanup(): void;
}

type AnimationFrame = (timestamp: number) => void;

function currentTimestamp(): number {
  return typeof globalThis.performance?.now === "function"
    ? globalThis.performance.now()
    : Date.now();
}

export function createExampleAnimationLoop(
  render: AnimationFrame,
): ExampleAnimationController {
  let frameHandle: number | undefined;
  let running = true;
  let disposed = false;
  let firstFrameRendered = false;

  function schedule(): void {
    if (
      disposed ||
      !running ||
      typeof globalThis.requestAnimationFrame !== "function"
    ) {
      return;
    }
    frameHandle = globalThis.requestAnimationFrame(tick);
  }

  function tick(timestamp: number): void {
    if (disposed || !running) return;
    frameHandle = undefined;
    render(timestamp);
    firstFrameRendered = true;
    schedule();
  }

  function pause(): void {
    running = false;
    if (
      frameHandle !== undefined &&
      typeof globalThis.cancelAnimationFrame === "function"
    ) {
      globalThis.cancelAnimationFrame(frameHandle);
    }
    frameHandle = undefined;
  }

  function resume(): void {
    if (disposed || running) return;
    running = true;
    tick(currentTimestamp());
  }

  function setReducedMotion(reduced: boolean): void {
    if (reduced) pause();
    else resume();
  }

  function cleanup(): void {
    if (disposed) return;
    disposed = true;
    pause();
  }

  tick(currentTimestamp());
  return {
    get firstFrameRendered(): boolean {
      return firstFrameRendered;
    },
    pause,
    resume,
    setReducedMotion,
    cleanup,
  };
}
