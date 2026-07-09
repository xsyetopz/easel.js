import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { Geometry } from "@/geometry/Geometry.js";
import { BoxGeometry } from "@/geometry/primitives/BoxGeometry.js";
import { EdgesGeometry } from "@/geometry/primitives/EdgesGeometry.js";
import { defined } from "../../_helpers/defined.js";

describe("EdgesGeometry", () => {
	it("produces positions attribute from a BoxGeometry", () => {
		const box = new BoxGeometry();
		const edges = new EdgesGeometry(box);
		const posAttr = defined(edges.getAttribute("position"));
		expect(posAttr).toBeDefined();
		expect(posAttr.itemSize).toBe(3);
	});

	it("produces non-zero edge set from default BoxGeometry", () => {
		const edges = new EdgesGeometry(new BoxGeometry());
		// each edge = 2 verts x 3 floats = 6 floats per edge
		const edgeCount = defined(edges.getAttribute("position")).array.length / 6;
		expect(edgeCount).toBeGreaterThan(0);
	});

	it("custom BoxGeometry (2,3,4,2,3,4) produces more edges than default", () => {
		const eDefault = defined(
			new EdgesGeometry(new BoxGeometry()).getAttribute("position"),
		).array.length;
		const eCustom = defined(
			new EdgesGeometry(new BoxGeometry(2, 3, 4, 2, 3, 4)).getAttribute(
				"position",
			),
		).array.length;
		expect(eCustom).toBeGreaterThan(eDefault);
	});

	it("THREE EdgesGeometry also produces non-zero edges", () => {
		const tEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry());
		expect(defined(tEdges.getAttribute("position")).count).toBeGreaterThan(0);
	});

	it("returns empty positions when input has no position attribute", () => {
		const empty = new Geometry();
		const edges = new EdgesGeometry(empty);
		expect(defined(edges.getAttribute("position")).array.length).toBe(0);
	});
});
