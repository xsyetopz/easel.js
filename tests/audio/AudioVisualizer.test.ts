import { describe, expect, test } from "bun:test";
import {
  type CanvasAudioContext,
  drawFrequencyBars,
  drawTimeDomainWaveform,
} from "@/index.ts";

function context(): CanvasAudioContext & { fills: number; strokes: number } {
  return {
    canvas: { width: 100, height: 50 },
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    fills: 0,
    strokes: 0,
    clearRect(): void {
      // Intentionally unused by these assertions.
    },
    fillRect(_x: number, _y: number, _width: number, _height: number): void {
      this.fills += 1;
    },
    beginPath(): void {
      // Intentionally unused by these assertions.
    },
    lineTo(_x: number, _y: number): void {
      // Intentionally unused by these assertions.
    },
    moveTo(_x: number, _y: number): void {
      // Intentionally unused by these assertions.
    },
    stroke(): void {
      this.strokes += 1;
    },
  };
}

describe("Audio visualizer", () => {
  test("draws one bar per requested sample and clears the frame", () => {
    const target = context();
    drawFrequencyBars(target, new Uint8Array([0, 128, 255]), {
      background: "#101722",
      bars: 3,
    });
    expect(target.fills).toBe(4);
    expect(target.fillStyle).toBe("#ffe600");
  });

  test("draws a centered time-domain waveform", () => {
    const target = context();
    drawTimeDomainWaveform(target, new Uint8Array([0, 128, 255]), {
      foreground: "#59c5d6",
    });
    expect(target.strokes).toBe(1);
    expect(target.strokeStyle).toBe("#59c5d6");
    expect(target.lineWidth).toBe(2);
  });
});
