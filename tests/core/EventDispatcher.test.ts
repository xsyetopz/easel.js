import { describe, expect, it, vi } from "bun:test";
import { type Event, EventDispatcher } from "@/core/EventDispatcher.ts";

describe("EventDispatcher", () => {
  describe("dispatch", () => {
    it("sets target during callback and clears it after dispatch", () => {
      const dispatcher = new EventDispatcher();
      const event: Event = { type: "change" };
      const fn = vi.fn((received: Event) => {
        expect(received.target).toBe(dispatcher);
      });
      dispatcher.addEventListener("change", fn);
      dispatcher.dispatchEvent(event);
      expect(event.target).toBeUndefined();
      expect(fn).toHaveBeenCalledOnce();
    });

    it("restores the outer target after nested dispatch", () => {
      const outer = new EventDispatcher();
      const inner = new EventDispatcher();
      const event: Event = { type: "change" };
      const targets: (EventDispatcher | undefined)[] = [];

      inner.addEventListener("change", (received: Event) => {
        targets.push(received.target);
      });
      outer.addEventListener("change", (received: Event) => {
        targets.push(received.target);
        inner.dispatchEvent(received);
        targets.push(received.target);
      });

      outer.dispatchEvent(event);

      expect(targets).toEqual([outer, inner, outer]);
      expect(event.target).toBeUndefined();
    });

    it("restores target and propagates listener exceptions", () => {
      const dispatcher = new EventDispatcher();
      const event: Event = { type: "change" };
      const error = new Error("listener failed");
      const listener = vi.fn((received: Event) => {
        expect(received.target).toBe(dispatcher);
        throw error;
      });
      dispatcher.addEventListener("change", listener);

      expect(() => dispatcher.dispatchEvent(event)).toThrow(error);
      expect(listener).toHaveBeenCalledOnce();
      expect(event.target).toBeUndefined();
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

    it("leaves events without listeners unchanged", () => {
      const dispatcher = new EventDispatcher();
      const event: Event = { type: "missing", value: 42 };

      dispatcher.dispatchEvent(event);

      expect(event).toEqual({ type: "missing", value: 42 });
      expect(event.target).toBeUndefined();
      expect("target" in event).toBe(false);
    });
  });

  it("handles event types inherited by ordinary objects", () => {
    const dispatcher = new EventDispatcher();
    const fn = vi.fn();

    for (const type of ["constructor", "toString", "__proto__"]) {
      dispatcher.addEventListener(type, fn);
      expect(dispatcher.hasEventListener(type, fn)).toBe(true);
      dispatcher.dispatchEvent({ type });
      dispatcher.removeEventListener(type, fn);
      expect(dispatcher.hasEventListener(type, fn)).toBe(false);
    }

    expect(fn).toHaveBeenCalledTimes(3);
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
