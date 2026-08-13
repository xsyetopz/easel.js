export const EXAMPLE_ASPECT_RATIO = 16 / 9;

export interface ExampleViewportSize {
  width: number;
  height: number;
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
