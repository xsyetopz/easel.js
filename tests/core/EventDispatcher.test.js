import { describe, expect, it, vi } from "vitest";
import { EventDispatcher } from "@/core/EventDispatcher.ts";

describe("EventDispatcher", () => {
	it("adds and dispatches a listener", () => {
		const dispatcher = new EventDispatcher();
		const fn = vi.fn();
		dispatcher.addEventListener("change", fn);
		dispatcher.dispatchEvent({ type: "change" });
		expect(fn).toHaveBeenCalledOnce();
	});

	it("passes event object to listener", () => {
		const dispatcher = new EventDispatcher();
		const fn = vi.fn();
		dispatcher.addEventListener("update", fn);
		dispatcher.dispatchEvent({ type: "update", value: 42 });
		expect(fn).toHaveBeenCalledWith(
			expect.objectContaining({ type: "update", value: 42 }),
		);
	});

	it("does not add duplicate listeners", () => {
		const dispatcher = new EventDispatcher();
		const fn = vi.fn();
		dispatcher.addEventListener("change", fn);
		dispatcher.addEventListener("change", fn);
		dispatcher.dispatchEvent({ type: "change" });
		expect(fn).toHaveBeenCalledOnce();
	});

	it("removes a listener", () => {
		const dispatcher = new EventDispatcher();
		const fn = vi.fn();
		dispatcher.addEventListener("change", fn);
		dispatcher.removeEventListener("change", fn);
		dispatcher.dispatchEvent({ type: "change" });
		expect(fn).not.toHaveBeenCalled();
	});

	it("hasEventListener returns true after add, false after remove", () => {
		const dispatcher = new EventDispatcher();
		const fn = vi.fn();
		dispatcher.addEventListener("x", fn);
		expect(dispatcher.hasEventListener("x", fn)).toBe(true);
		dispatcher.removeEventListener("x", fn);
		expect(dispatcher.hasEventListener("x", fn)).toBe(false);
	});

	it("multiple listeners on same event all fire", () => {
		const dispatcher = new EventDispatcher();
		const a = vi.fn();
		const b = vi.fn();
		dispatcher.addEventListener("click", a);
		dispatcher.addEventListener("click", b);
		dispatcher.dispatchEvent({ type: "click" });
		expect(a).toHaveBeenCalledOnce();
		expect(b).toHaveBeenCalledOnce();
	});

	it("different event types are independent", () => {
		const dispatcher = new EventDispatcher();
		const a = vi.fn();
		const b = vi.fn();
		dispatcher.addEventListener("foo", a);
		dispatcher.addEventListener("bar", b);
		dispatcher.dispatchEvent({ type: "foo" });
		expect(a).toHaveBeenCalledOnce();
		expect(b).not.toHaveBeenCalled();
	});

	it("addEventListener returns this (chainable)", () => {
		const dispatcher = new EventDispatcher();
		const ret = dispatcher.addEventListener("x", vi.fn());
		expect(ret).toBe(dispatcher);
	});
});
