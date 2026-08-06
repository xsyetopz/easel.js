import { describe, expect, it } from "bun:test";
import { PCDLoader } from "@/loaders/PCDLoader.js";

describe("PCDLoader", () => {
  it("parses ASCII XYZRGB point clouds", () => {
    const geometry = new PCDLoader().parse(`VERSION .7
FIELDS x y z rgb
SIZE 4 4 4 4
TYPE F F F F
COUNT 1 1 1 1
WIDTH 2
HEIGHT 1
POINTS 2
DATA ascii
0 1 2 16711680
3 4 5 65280`);
    expect(geometry.getAttribute("position")?.count).toBe(2);
    expect(geometry.getAttribute("color")?.getX(0)).toBeCloseTo(1);
    expect(geometry.getAttribute("color")?.getY(1)).toBeCloseTo(1);
  });
});
