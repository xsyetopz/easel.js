import type { AudioAnalyzer } from "./AudioAnalyzer.ts";

/** Minimal Canvas2D context surface used by audio drawing helpers. */
export interface CanvasAudioContext {
  /** Canvas backing element dimensions. */
  readonly canvas: { width: number; height: number };
  /** Fill style used for background and bars. */
  fillStyle: string;
  /** Stroke style used for waveform lines. */
  strokeStyle: string;
  /** Waveform line width. */
  lineWidth: number;
  /** Clears a rectangular region. */
  clearRect: (x: number, y: number, width: number, height: number) => void;
  /** Fills a rectangular region. */
  fillRect: (x: number, y: number, width: number, height: number) => void;
  /** Starts a stroked path. */
  beginPath: () => void;
  /** Adds a point to the active path. */
  lineTo: (x: number, y: number) => void;
  /** Moves the active path without drawing. */
  moveTo: (x: number, y: number) => void;
  /** Strokes the active path. */
  stroke: () => void;
}

/** Options shared by frequency-bar and waveform drawing helpers. */
export interface CanvasAudioVisualizerOptions {
  /** Horizontal drawing origin in canvas pixels. */
  x?: number;
  /** Vertical drawing origin in canvas pixels. */
  y?: number;
  /** Drawing width; defaults to the full canvas width. */
  width?: number;
  /** Drawing height; defaults to the full canvas height. */
  height?: number;
  /** Background fill color; omitted to preserve existing pixels. */
  background?: string;
  /** Foreground bar or waveform color. */
  foreground?: string;
  /** Number of frequency bars; defaults to one per data sample. */
  bars?: number;
  /** Pixel gap between frequency bars. */
  gap?: number;
  /** Waveform stroke width. */
  lineWidth?: number;
}

/** Draws normalized frequency magnitudes as Canvas2D bars. */
export function drawFrequencyBars(
  context: CanvasAudioContext,
  data: ArrayLike<number>,
  options: CanvasAudioVisualizerOptions = {},
): void {
  const x = Math.max(0, options.x ?? 0);
  const y = Math.max(0, options.y ?? 0);
  const width = Math.max(0, options.width ?? context.canvas.width - x);
  const height = Math.max(0, options.height ?? context.canvas.height - y);
  clearCanvas(context, options.background, x, y, width, height);
  if (data.length === 0 || width === 0 || height === 0) return;
  context.fillStyle = options.foreground ?? "#ffe600";
  const count = Math.max(
    1,
    Math.min(data.length, Math.floor(options.bars ?? data.length)),
  );
  const gap = Math.max(0, options.gap ?? 1);
  const barWidth = Math.max(1, (width - gap * (count - 1)) / count);
  for (let index = 0; index < count; index++) {
    const sourceIndex = Math.min(
      data.length - 1,
      Math.floor((index / count) * data.length),
    );
    const magnitude = Math.max(0, Math.min(255, data[sourceIndex] ?? 0)) / 255;
    const barHeight = magnitude * height;
    context.fillRect(
      x + index * (barWidth + gap),
      y + height - barHeight,
      barWidth,
      barHeight,
    );
  }
}

/** Draws byte time-domain samples as a centered Canvas2D waveform. */
export function drawTimeDomainWaveform(
  context: CanvasAudioContext,
  data: ArrayLike<number>,
  options: CanvasAudioVisualizerOptions = {},
): void {
  const x = Math.max(0, options.x ?? 0);
  const y = Math.max(0, options.y ?? 0);
  const width = Math.max(0, options.width ?? context.canvas.width - x);
  const height = Math.max(0, options.height ?? context.canvas.height - y);
  clearCanvas(context, options.background, x, y, width, height);
  if (data.length === 0 || width === 0 || height === 0) return;
  context.strokeStyle = options.foreground ?? "#59c5d6";
  context.lineWidth = Math.max(1, options.lineWidth ?? 2);
  context.beginPath();
  for (let index = 0; index < data.length; index++) {
    const pointX = x + (index / Math.max(1, data.length - 1)) * width;
    const sample = Math.max(0, Math.min(255, data[index] ?? 128)) / 255;
    const pointY = y + sample * height;
    if (index === 0) context.moveTo(pointX, pointY);
    else context.lineTo(pointX, pointY);
  }
  context.stroke();
}

/** Draws an analyzer's latest frequency or time-domain frame. */
export function drawAudioAnalyzer(
  context: CanvasAudioContext,
  analyzer: AudioAnalyzer,
  mode: "frequency" | "time" = "frequency",
  options: CanvasAudioVisualizerOptions = {},
): void {
  if (mode === "time") {
    drawTimeDomainWaveform(context, analyzer.getTimeDomainData(), options);
  } else {
    drawFrequencyBars(context, analyzer.getFrequencyData(), options);
  }
}

function clearCanvas(
  context: CanvasAudioContext,
  background: string | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  context.clearRect(x, y, width, height);
  if (background === undefined) return;
  context.fillStyle = background;
  context.fillRect(x, y, width, height);
}
