import { describe, expect, it } from "bun:test";
import { PerspectiveCamera } from "@/cameras/PerspectiveCamera.js";
import { Scene } from "@/core/Scene.js";
import { CSS2DRenderer } from "@/renderers/CSS2DRenderer.js";

describe("CSS2DRenderer", () => {
  it("degrades to a DOM-free renderer in non-browser runtimes", () => {
    const renderer = new CSS2DRenderer({ width: 640, height: 360 });
    expect(renderer.domElement).toBeUndefined();
    expect(() =>
      renderer.render(new Scene(), new PerspectiveCamera()),
    ).not.toThrow();
  });

  it("rejects invalid overlay dimensions", () => {
    const renderer = new CSS2DRenderer();
    expect(() => renderer.setSize(0, 100)).toThrow(RangeError);
    expect(() => renderer.setSize(100, Number.NaN)).toThrow(RangeError);
  });
});
