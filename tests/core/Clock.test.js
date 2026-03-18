import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Clock } from "@/core/Clock.js";

describe("Clock", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("starts with elapsedTime 0 before first delta access", () => {
		const clock = new Clock(false);
		clock.start();
		expect(clock.elapsedTime).toBe(0);
	});

	it("delta returns 0 on autoStart first call", () => {
		const clock = new Clock(true);
		const d = clock.delta;
		expect(d).toBe(0);
	});

	it("accumulates elapsed time across delta calls", () => {
		const clock = new Clock(false);
		clock.start();
		// access once to initialise oldTime
		clock.delta;
		vi.advanceTimersByTime(100);
		const d = clock.delta;
		expect(d).toBeCloseTo(0.1, 2);
		expect(clock.elapsedTime).toBeCloseTo(0.1, 2);
	});

	it("stop freezes the clock", () => {
		const clock = new Clock(false);
		clock.start();
		clock.delta; // init
		vi.advanceTimersByTime(50);
		clock.stop();
		vi.advanceTimersByTime(200);
		const elapsed = clock.elapsedTime;
		vi.advanceTimersByTime(200);
		expect(clock.elapsedTime).toBe(elapsed);
	});

	it("start resets elapsed time", () => {
		const clock = new Clock(false);
		clock.start();
		clock.delta;
		vi.advanceTimersByTime(100);
		clock.delta; // accumulate ~0.1s
		clock.start();
		expect(clock.elapsedTime).toBe(0);
	});
});
