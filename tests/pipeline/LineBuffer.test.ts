import { describe, expect, it } from "bun:test";
import { LineBuffer } from "@/pipeline/LineBuffer.js";

describe("LineBuffer", () => {
  it("grows typed endpoint storage and preserves references until growth", () => {
    const buffer = new LineBuffer(1);
    const screenX = buffer.screenX;
    buffer.append(1, 2, 3, 4, -1, 1, 0, 0, 0, 1, 0, 1);
    expect(buffer.length).toBe(1);
    expect(buffer.screenX).toBe(screenX);
    expect(Array.from(buffer.screenX.slice(0, 2))).toEqual([1, 3]);

    buffer.reset();
    expect(buffer.length).toBe(0);
    expect(buffer.screenX).toBe(screenX);
  });

  it("retains values while expanding capacity", () => {
    const buffer = new LineBuffer(1);
    buffer.append(0, 0, 1, 1, -1, -0.5, 0, 1, 4, 5, 0, 1);
    buffer.append(2, 2, 3, 3, 0, 1, 0.25, 0.75, 6, 7, 0.25, 0.75, 0.25, true);
    expect(buffer.length).toBe(2);
    expect(Array.from(buffer.screenY.slice(0, 4))).toEqual([0, 1, 2, 3]);
    expect(Array.from(buffer.vertexIndex.slice(0, 4))).toEqual([4, 5, 6, 7]);
    expect(Array.from(buffer.sourceT.slice(0, 4))).toEqual([0, 1, 0.25, 0.75]);
    expect(Array.from(buffer.dashPhase.slice(0, 2))).toEqual([0, 0.25]);
    expect(Array.from(buffer.continuesPrevious.slice(0, 2))).toEqual([0, 1]);
  });

  it("rejects non-integral capacities", () => {
    expect(() => new LineBuffer(-1)).toThrow(RangeError);
    expect(() => new LineBuffer(1.5)).toThrow(RangeError);
    expect(() =>
      new LineBuffer().append(0.5, 0, 1, 1, -1, -1, 0, 0, 0, 1, 0, 1),
    ).toThrow(RangeError);
  });
});
