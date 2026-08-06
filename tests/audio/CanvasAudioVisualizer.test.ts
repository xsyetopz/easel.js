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
    clearRect() {},
    fillRect(_x, _y, _width, _height) {
      this.fills += 1;
    },
    beginPath() {},
    lineTo() {},
    moveTo() {},
    stroke() {
      this.strokes += 1;
    },
  };
}

describe("Canvas audio visualizer", () => {
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
