import { describe, expect, it } from "bun:test";
import {
  Path,
  parseSVGPath,
  SVGPathParser,
  serializeSVGPath,
  serializeSVGShapePath,
} from "@/index.js";
import { defined } from "../_helpers/defined.ts";

function endpoint(curve: {
  getPoint(t: number): { x: number; y: number } | undefined;
}) {
  const point = defined(curve.getPoint(1));
  return [point.x, point.y];
}

describe("SVG path utilities", () => {
  it("parses absolute and relative line commands into subpaths", () => {
    const path = parseSVGPath("M0 0h10v5l-10 0z m20 0 5 5");
    expect(path.subPaths).toHaveLength(2);
    expect(path.subPaths[0]?.curves).toHaveLength(4);
    expect(path.subPaths[1]?.currentPoint.x).toBe(25);
    expect(path.subPaths[1]?.currentPoint.y).toBe(5);
  });

  it("supports smooth cubic, quadratic, and elliptical arc commands", () => {
    const path = new SVGPathParser().parse(
      "M0 0 C10 0 10 10 20 10 S30 20 40 10 Q50 0 60 10 T80 10 A10 10 0 0 1 100 10",
    );
    expect(path.subPaths).toHaveLength(1);
    expect(path.subPaths[0]?.curves.length).toBe(6);
    const endpoint = path.subPaths[0]?.currentPoint;
    expect(endpoint?.x).toBe(100);
    expect(endpoint?.y).toBeCloseTo(10);
  });

  it("treats extra coordinate pairs after M as absolute and after m as relative lines", () => {
    const absolute = parseSVGPath("M 0 0 10 0 10 10 Z").subPaths[0];
    expect(absolute?.curves.map((curve) => endpoint(curve))).toEqual([
      [10, 0],
      [10, 10],
      [0, 0],
    ]);
    const relative = parseSVGPath("m 5 5 10 0 0 10").subPaths[0];
    expect(relative?.curves.map((curve) => endpoint(curve))).toEqual([
      [15, 5],
      [15, 15],
    ]);
  });

  it("accepts arc flags packed without separators", () => {
    const spaced = parseSVGPath("M0 0A5 5 0 0 1 10 0a5 5 0 1 1 10 0")
      .subPaths[0];
    const packed = parseSVGPath("M0 0A5 5 0 0110 0a5 5 0 1110 0").subPaths[0];
    expect(packed?.curves).toHaveLength(spaced?.curves.length ?? -1);
    expect(packed?.currentPoint.x).toBe(20);
    for (const [index, curve] of (packed?.curves ?? []).entries()) {
      const midpoint = defined(curve.getPoint(0.5));
      const reference = defined(defined(spaced?.curves[index]).getPoint(0.5));
      expect(midpoint.x).toBeCloseTo(reference.x);
      expect(midpoint.y).toBeCloseTo(reference.y);
    }
    expect(() => parseSVGPath("M0 0A1 1 0 0010 0")).not.toThrow();
    expect(() => parseSVGPath("M0 0A1 1 0 00")).toThrow(SyntaxError);
  });

  it("serializes line and Bezier paths as browser-compatible data", () => {
    const path = parseSVGPath("M1 2L3 4Q5 6 7 8C9 10 11 12 13 14");
    const firstPath = path.subPaths[0];
    if (!firstPath) throw new Error("Expected parsed path");
    const data = serializeSVGPath(firstPath);
    expect(data).toContain("M 1 2");
    expect(data).toContain("L 3 4");
    expect(data).toContain("Q 5 6 7 8");
    expect(data).toContain("C 9 10 11 12 13 14");
    expect(serializeSVGShapePath(path)).toBe(data);
  });
});

describe("SVG arc direction", () => {
  it("draws each arc from its start point to its end point, as three.js does", async () => {
    const { JSDOM } = await import("jsdom");
    const { SVGLoader: ThreeSVGLoader } = await import(
      "three/addons/loaders/SVGLoader.js"
    );
    const previousParser = globalThis.DOMParser;
    const window = new JSDOM("").window;
    globalThis.DOMParser = window.DOMParser;
    try {
      for (const d of [
        "M0 0A5 5 0 0 0 10 0",
        "M0 0A5 5 0 0 1 10 0",
        "M0 0A5 5 0 1 0 10 0",
        "M0 0A6 3 30 1 1 10 5",
      ]) {
        const arc = defined(
          parseSVGPath(d).subPaths[0]?.curves.find(
            (curve) => curve.type === "EllipseCurve",
          ),
        );
        const expected = defined(
          new ThreeSVGLoader()
            .parse(
              `<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`,
            )
            .paths[0]?.subPaths[0]?.curves.find(
              (curve) => curve.type === "EllipseCurve",
            ),
        );
        for (const t of [0, 0.5, 1]) {
          const actual = defined(arc.getPoint(t));
          const wanted = expected.getPoint(t);
          expect(actual.x).toBeCloseTo(wanted.x, 9);
          expect(actual.y).toBeCloseTo(wanted.y, 9);
        }
      }
    } finally {
      globalThis.DOMParser = previousParser;
      window.close();
    }
  });
});

describe("SVG arc serialization", () => {
  it("round-trips EllipseCurve arcs through three.js's SVGLoader", async () => {
    const { JSDOM } = await import("jsdom");
    const { SVGLoader: ThreeSVGLoader } = await import(
      "three/addons/loaders/SVGLoader.js"
    );
    const previousParser = globalThis.DOMParser;
    const window = new JSDOM("").window;
    globalThis.DOMParser = window.DOMParser;
    try {
      // (startAngle, endAngle, clockwise): the clockwise 0 -> 3PI/2 arc
      // sweeps only PI/2, so it must not be written with the large-arc flag.
      for (const [startAngle, endAngle, clockwise] of [
        [0, Math.PI * 1.5, true],
        [0, Math.PI * 1.5, false],
        [Math.PI, 0.5, false],
        [Math.PI, 0.5, true],
      ] as const) {
        const path = new Path().absellipse(
          1,
          2,
          5,
          3,
          startAngle,
          endAngle,
          clockwise,
          0.4,
        );
        const d = serializeSVGPath(path);
        const parsed = defined(
          new ThreeSVGLoader()
            .parse(
              `<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`,
            )
            .paths[0]?.subPaths[0]?.curves.find(
              (curve) => curve.type === "EllipseCurve",
            ),
        );
        for (const t of [0, 0.25, 0.5, 0.75, 1]) {
          const actual = defined(defined(path.curves[0]).getPoint(t));
          const wanted = parsed.getPoint(t);
          expect(wanted.x).toBeCloseTo(actual.x, 4);
          expect(wanted.y).toBeCloseTo(actual.y, 4);
        }
      }
    } finally {
      globalThis.DOMParser = previousParser;
      window.close();
    }
  });
});
