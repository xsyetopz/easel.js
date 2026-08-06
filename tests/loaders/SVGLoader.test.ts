import { describe, expect, it } from "bun:test";
import { SVGLoader } from "@/loaders/SVGLoader.js";

describe("SVGLoader", () => {
  it("parses path, polyline, and polygon elements without a DOM", () => {
    const result = new SVGLoader().parse(
      `<svg><path d="M0 0 L1 0 L1 1 Z" fill="#f00"/><polyline points="0,0 1,1"/><polygon points="0 0 1 0 0 1"/></svg>`,
    );
    expect(result.paths).toHaveLength(3);
    expect(result.paths[0]?.userData["fill"]).toBe("#f00");
    expect(result.paths[0]?.subPaths).toHaveLength(1);
    expect(result.paths[1]?.subPaths[0]?.curves.length).toBeGreaterThan(0);
  });

  it("parses standard shape elements and retains source metadata", () => {
    const result = new SVGLoader().parse(
      `<svg><rect x="1" y="2" width="4" height="5" rx="1" fill="#0f0"/><circle cx="1" cy="1" r="1"/><ellipse cx="4" cy="5" rx="2" ry="1"/><line x1="0" y1="1" x2="2" y2="3"/><polyline points="0 1"/></svg>`,
    );
    expect(result.paths).toHaveLength(4);
    expect(result.xml).toContain("<rect");
    expect(result.paths[0]?.subPaths[0]?.curves.length).toBeGreaterThan(3);
    expect(result.paths[0]?.userData["element"]).toBe("rect");
    expect(result.paths[0]?.userData["style"]).toMatchObject({ fill: "#0f0" });
  });

  it("inherits presentation styles and applies affine transforms", () => {
    const result = new SVGLoader().parse(
      `<svg fill="#f00" opacity=".5"><g transform="translate(10 20) scale(2)" stroke="#00f" stroke-width="3"><path d="M0 0 L1 0" style="fill:none;stroke-opacity:.25"/></g></svg>`,
    );
    const path = result.paths[0];
    expect(path?.userData["fill"]).toBe("none");
    expect(path?.userData["stroke"]).toBe("#00f");
    expect(path?.userData["opacity"]).toBeCloseTo(0.5);
    expect(path?.userData["strokeOpacity"]).toBeCloseTo(0.25);
    const firstCurve = path?.subPaths[0]?.curves[0] as {
      v1?: { x: number; y: number };
    };
    expect(firstCurve.v1?.x).toBeCloseTo(10);
    expect(firstCurve.v1?.y).toBeCloseTo(20);
  });

  it("supports rotation around an SVG transform pivot", () => {
    const result = new SVGLoader().parse(
      `<svg><path transform="rotate(90 1 1)" d="M2 1 L2 2"/></svg>`,
    );
    const curve = result.paths[0]?.subPaths[0]?.curves[0] as {
      v1?: { x: number; y: number };
      v2?: { x: number; y: number };
    };
    expect(curve.v1?.x).toBeCloseTo(1);
    expect(curve.v1?.y).toBeCloseTo(2);
    expect(curve.v2?.x).toBeCloseTo(0);
    expect(curve.v2?.y).toBeCloseTo(2);
  });

  it("ignores malformed point lists and unsupported elements", () => {
    const result = new SVGLoader().parse(
      `<svg><metadata/><circle r="0"/><polyline points="0 1"/></svg>`,
    );
    expect(result.paths).toHaveLength(0);
  });
});
