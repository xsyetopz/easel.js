import { describe, expect, it } from "bun:test";
import type { DrawCall } from "@/pipeline/DrawCall.js";
import { DrawList } from "@/pipeline/DrawList.js";
import { makeDrawCall } from "../_helpers/draw-calls.js";

describe("DrawList", () => {
  it("starts empty", () => {
    const list = new DrawList();
    expect(list.length).toBe(0);
  });

  it("add increases length", () => {
    const list = new DrawList();
    list.add(makeDrawCall(1));
    expect(list.length).toBe(1);
  });

  it("add stores draw calls accessible via calls", () => {
    const list = new DrawList();
    const dc = makeDrawCall(42);
    list.add(dc);
    expect(list.calls[0]).toBe(dc);
  });

  it("clear resets length to 0", () => {
    const list = new DrawList();
    list.add(makeDrawCall(1));
    list.add(makeDrawCall(2));
    list.clear();
    expect(list.length).toBe(0);
  });

  it("is iterable via for...of", () => {
    const list = new DrawList();
    list.add(makeDrawCall(1));
    list.add(makeDrawCall(2));
    const collected: DrawCall[] = [];
    for (const dc of list) collected.push(dc);
    expect(collected.length).toBe(2);
  });

  it("multiple adds maintain insertion order", () => {
    const list = new DrawList();
    const a = makeDrawCall("a");
    const b = makeDrawCall("b");
    const c = makeDrawCall("c");
    list.add(a);
    list.add(b);
    list.add(c);
    expect(list.calls[0]).toBe(a);
    expect(list.calls[2]).toBe(c);
  });
});
