import { describe, expect, it } from "bun:test";
import { Attribute } from "@/geometry/Attribute.js";
import { Geometry } from "@/geometry/Geometry.js";
import { defined } from "../_helpers/defined.js";

describe("Geometry", () => {
  describe("setPositions", () => {
    it("stores position attribute with itemSize=3", () => {
      const g = new Geometry();
      g.setPositions(new Float32Array([1, 2, 3, 4, 5, 6]));
      const attr = defined(g.getAttribute("position"));
      expect(attr).toBeDefined();
      expect(attr.itemSize).toBe(3);
      expect(attr.count).toBe(2);
    });

    it("converts plain array to Float32Array", () => {
      const g = new Geometry();
      g.setPositions([1, 2, 3]);
      expect(defined(g.getAttribute("position")).array).toBeInstanceOf(
        Float32Array,
      );
    });

    it("returns this for chaining", () => {
      const g = new Geometry();
      expect(g.setPositions(new Float32Array(3))).toBe(g);
    });
  });

  describe("setNormals", () => {
    it("stores normal attribute with itemSize=3", () => {
      const g = new Geometry();
      g.setNormals(new Float32Array([0, 1, 0]));
      const attr = defined(g.getAttribute("normal"));
      expect(attr).toBeDefined();
      expect(attr.itemSize).toBe(3);
    });
  });

  describe("setUVs", () => {
    it("stores uv attribute with itemSize=2", () => {
      const g = new Geometry();
      g.setUVs(new Float32Array([0, 0, 1, 1]));
      const attr = defined(g.getAttribute("uv"));
      expect(attr).toBeDefined();
      expect(attr.itemSize).toBe(2);
      expect(attr.count).toBe(2);
    });
  });

  describe("setColors", () => {
    it("stores color attribute with itemSize=3", () => {
      const g = new Geometry();
      g.setColors(new Float32Array([1, 0, 0, 0, 1, 0]));
      const attr = defined(g.getAttribute("color"));
      expect(attr).toBeDefined();
      expect(attr.itemSize).toBe(3);
    });
  });

  describe("setIndex", () => {
    it("stores Uint16Array directly", () => {
      const g = new Geometry();
      const idx = new Uint16Array([0, 1, 2]);
      g.setIndex(idx);
      expect(g.index).toBe(idx);
    });

    it("stores Uint32Array directly", () => {
      const g = new Geometry();
      const idx = new Uint32Array([0, 1, 2]);
      g.setIndex(idx);
      expect(g.index).toBe(idx);
    });

    it("converts plain array to Uint16Array when count <= 65535", () => {
      const g = new Geometry();
      g.setIndex([0, 1, 2, 3, 4, 5]);
      expect(g.index).toBeInstanceOf(Uint16Array);
      expect(Array.from(defined(g.index))).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it("converts large plain array to Uint32Array", () => {
      const g = new Geometry();
      const big = Array.from({ length: 65536 }, (_, i) => i);
      g.setIndex(big);
      expect(g.index).toBeInstanceOf(Uint32Array);
    });

    it("returns this for chaining", () => {
      const g = new Geometry();
      expect(g.setIndex(new Uint16Array([0, 1, 2]))).toBe(g);
    });
  });

  describe("getAttribute / setAttribute", () => {
    it("getAttribute returns undefined for missing key", () => {
      const g = new Geometry();
      expect(g.getAttribute("position")).toBeUndefined();
    });

    it("setAttribute stores and getAttribute retrieves", () => {
      const g = new Geometry();
      const attr = new Attribute(new Float32Array([1, 2, 3]), 3);
      g.setAttribute("custom", attr);
      expect(defined(g.getAttribute("custom"))).toBe(attr);
    });

    it("setAttribute returns this", () => {
      const g = new Geometry();
      const attr = new Attribute(new Float32Array(3), 3);
      expect(g.setAttribute("x", attr)).toBe(g);
    });
  });

  describe("deleteAttribute", () => {
    it("removes an attribute and returns true", () => {
      const g = new Geometry();
      g.setPositions(new Float32Array(3));
      expect(g.deleteAttribute("position")).toBe(true);
      expect(g.getAttribute("position")).toBeUndefined();
    });

    it("returns false for missing key", () => {
      const g = new Geometry();
      expect(g.deleteAttribute("nonexistent")).toBe(false);
    });
  });

  describe("computeVertexNormals", () => {
    it("computes normals for a single triangle in XY plane", () => {
      const g = new Geometry();
      g.setPositions(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]));
      g.setIndex(new Uint16Array([0, 1, 2]));
      g.computeVertexNormals();
      const normal = defined(g.getAttribute("normal"));
      expect(normal).toBeDefined();
      // All verts should have normal pointing in +Z
      for (let i = 0; i < 3; i++) {
        expect(normal.getZ(i)).toBeCloseTo(1, 4);
        expect(normal.getX(i)).toBeCloseTo(0, 4);
        expect(normal.getY(i)).toBeCloseTo(0, 4);
      }
    });

    it("returns this when no position attribute", () => {
      const g = new Geometry();
      expect(g.computeVertexNormals()).toBe(g);
    });
  });

  describe("dispose", () => {
    it("clears attributes and index", () => {
      const g = new Geometry();
      g.setPositions(new Float32Array([1, 2, 3]));
      g.setIndex(new Uint16Array([0]));
      g.dispose();
      expect(g.getAttribute("position")).toBeUndefined();
      expect(g.index).toBeUndefined();
    });
  });

  describe("id and name", () => {
    it("assigns unique ids", () => {
      const a = new Geometry();
      const b = new Geometry();
      expect(b.id).toBeGreaterThan(a.id);
    });

    it("name defaults to empty string", () => {
      const g = new Geometry();
      expect(g.name).toBe("");
    });
  });
});
