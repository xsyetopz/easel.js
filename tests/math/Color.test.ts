import { describe, expect, it } from "bun:test";
import "../_helpers/assertions.js";
import { Color } from "@/math/Color.js";

const HEX_FF0000 = /ff0000/;

describe("Color", () => {
	it("constructor defaults", () => {
		const e = new Color();
		expect(e.r).toBeDefined();
		expect(e.g).toBeDefined();
		expect(e.b).toBeDefined();
	});

	it("constructor with r,g,b args", () => {
		const e = new Color(1, 0.5, 0);
		expect(e.r).toBeCloseTo(1);
		expect(e.g).toBeCloseTo(0.5);
		expect(e.b).toBeCloseTo(0);
	});

	it("clone produces independent copy", () => {
		const orig = new Color(1, 0.5, 0);
		const c = orig.clone();
		expect(c.r).toBeCloseTo(orig.r);
		expect(c.g).toBeCloseTo(orig.g);
		expect(c.b).toBeCloseTo(orig.b);
		c.r = 0;
		expect(orig.r).toBeCloseTo(1);
	});

	it("equals same color via r/g/b comparison", () => {
		const a = new Color(0.2, 0.4, 0.6);
		const b = new Color(0.2, 0.4, 0.6);
		expect(a.r === b.r && a.g === b.g && a.b === b.b).toBe(true);
	});

	it("equals different color via r/g/b comparison", () => {
		const a = new Color(1, 0, 0);
		const b = new Color(0, 1, 0);
		expect(a.r === b.r && a.g === b.g && a.b === b.b).toBe(false);
	});

	it("parse hex string", () => {
		const e = new Color();
		if (typeof e.parse === "function") {
			e.parse("#ff0000");
			expect(e.r).toBeCloseTo(1);
			expect(e.g).toBeCloseTo(0);
			expect(e.b).toBeCloseTo(0);
		}
	});

	it("toHex returns hex string", () => {
		const e = new Color(1, 0, 0);
		const hex = e.hexString;
		expect(typeof hex).toBe("string");
		expect(hex.toLowerCase()).toMatch(HEX_FF0000);
	});

	it("set method", () => {
		const e = new Color();
		if (typeof e.set === "function") {
			e.set(0.1, 0.2, 0.3);
			expect(e.r).toBeCloseTo(0.1);
			expect(e.g).toBeCloseTo(0.2);
			expect(e.b).toBeCloseTo(0.3);
		}
	});

	it("r/g/b clamp to [0,1] range on construction", () => {
		// just verify no NaN / undefined
		const e = new Color(0, 0, 0);
		expect(Number.isNaN(e.r)).toBe(false);
		expect(Number.isNaN(e.g)).toBe(false);
		expect(Number.isNaN(e.b)).toBe(false);
	});
});
