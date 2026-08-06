import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import { Timer } from "@/core/Timer.js";
import { Timer as THREETimer } from "three";

describe("Timer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps reads observational until update is called", () => {
    const timer = new Timer();
    vi.advanceTimersByTime(100);
    expect(timer.delta).toBe(0);
    expect(timer.elapsedTime).toBe(0);
  });

  it("advances only through an explicit update", () => {
    const timer = new Timer();
    vi.advanceTimersByTime(100);
    expect(timer.update()).toBe(timer);
    expect(timer.delta).toBeCloseTo(0.1);
    expect(timer.elapsedTime).toBeCloseTo(0.1);
  });

  it("accepts a frame timestamp without sampling the clock again", () => {
    const timer = new Timer();
    timer.update(40);
    expect(timer.delta).toBeCloseTo(0.04);
    timer.update(65);
    expect(timer.delta).toBeCloseTo(0.025);
    expect(timer.elapsedTime).toBeCloseTo(0.065);
  });

  it("applies timeScale to subsequent deltas", () => {
    const timer = new Timer();
    timer.timeScale = 0.5;
    timer.update(100);
    expect(timer.delta).toBeCloseTo(0.05);
    expect(timer.elapsedTime).toBeCloseTo(0.05);
  });

  it("resets the delta baseline without changing elapsed time", () => {
    const timer = new Timer();
    timer.update(100);
    timer.reset(250);
    expect(timer.delta).toBe(0);
    expect(timer.elapsedTime).toBeCloseTo(0.1);
    timer.update(300);
    expect(timer.delta).toBeCloseTo(0.05);
  });

  it("matches locked THREE.js Timer sampling semantics", () => {
    const timer = new Timer();
    const THREEInstance = new THREETimer();
    timer.timeScale = 0.75;
    THREEInstance.setTimescale(0.75);

    for (const timestamp of [16, 42, 100]) {
      timer.update(timestamp);
      THREEInstance.update(timestamp);
      expect(timer.delta).toBeCloseTo(THREEInstance.getDelta());
      expect(timer.elapsedTime).toBeCloseTo(THREEInstance.getElapsed());
    }
  });
});
