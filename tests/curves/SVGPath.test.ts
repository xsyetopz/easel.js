import { describe, expect, it } from "bun:test";
import {
  parseSVGPath,
  SVGPathParser,
  serializeSVGPath,
  serializeSVGShapePath,
} from "@/index.js";

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
