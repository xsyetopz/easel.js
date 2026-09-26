interface PointerTarget {
  x: number;
  y: number;
}

/**
 * Writes a pointer position as normalized device coordinates of `canvas`.
 *
 * The three.js originals read `window.innerWidth` because they fill the
 * window; the side-by-side stages are embedded, so both ports measure the
 * canvas instead.
 */
export function pointerToNdc(
  event: Pick<PointerEvent, "clientX" | "clientY">,
  canvas: Pick<HTMLCanvasElement, "getBoundingClientRect">,
  target: PointerTarget,
): PointerTarget {
  const rect = canvas.getBoundingClientRect();
  target.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  target.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  return target;
}
