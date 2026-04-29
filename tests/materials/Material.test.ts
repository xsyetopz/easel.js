import { describe, expect, it } from "vitest";
import { Material } from "../../src/materials/Material.ts";

describe("Material", () => {
	it("defaults to opaque depth-tested rendering", () => {
		const material = new Material();
		expect(material.transparent).toBe(false);
		expect(material.depthTest).toBe(true);
		expect(material.depthWrite).toBe(true);
		expect(material.opacity).toBe(0);
	});

	it("transparent constructor option disables depth writes by default", () => {
		const material = new Material({ transparent: true, opacity: 4 });
		expect(material.transparent).toBe(true);
		expect(material.depthTest).toBe(true);
		expect(material.depthWrite).toBe(false);
	});

	it("explicit depthWrite overrides transparent default", () => {
		const material = new Material({ transparent: true, depthWrite: true });
		expect(material.depthWrite).toBe(true);
	});

	it("copy preserves depth flags", () => {
		const source = new Material({
			transparent: true,
			depthTest: false,
			depthWrite: false,
			opacity: 4,
		});
		const copy = new Material().copy(source);
		expect(copy.transparent).toBe(true);
		expect(copy.depthTest).toBe(false);
		expect(copy.depthWrite).toBe(false);
		expect(copy.opacity).toBe(4);
	});
});
