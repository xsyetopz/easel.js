import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { Geometry } from "@/geometry/Geometry.js";
import { BoxGeometry } from "@/geometry/primitives/BoxGeometry.js";
import { WireframeGeometry } from "@/geometry/primitives/WireframeGeometry.ts";
import { defined } from "../../_helpers/defined.js";

describe("WireframeGeometry", () => {
  it("produces positions attribute from a BoxGeometry", () => {
    const box = new BoxGeometry();
    const wf = new WireframeGeometry(box);
    const posAttr = defined(wf.getAttribute("position"));
    expect(posAttr).toBeDefined();
    expect(posAttr.itemSize).toBe(3);
  });

  it("produces non-zero edge set from default BoxGeometry", () => {
    const wf = new WireframeGeometry(new BoxGeometry());
    expect(defined(wf.getAttribute("position")).count).toBeGreaterThan(0);
    // each edge = 2 verts: count should be even
    expect(defined(wf.getAttribute("position")).count % 2).toBe(0);
  });

  it("custom BoxGeometry (2,3,4,2,3,4) produces more edges than default", () => {
    const wfDefault = new WireframeGeometry(new BoxGeometry());
    const wfCustom = new WireframeGeometry(new BoxGeometry(2, 3, 4, 2, 3, 4));
    expect(defined(wfCustom.getAttribute("position")).count).toBeGreaterThan(
      defined(wfDefault.getAttribute("position")).count,
    );
  });

  it("THREE WireframeGeometry also produces even vertex count", () => {
    const tWf = new THREE.WireframeGeometry(new THREE.BoxGeometry());
    expect(defined(tWf.getAttribute("position")).count % 2).toBe(0);
  });

  it("returns empty positions when input has no position attribute", () => {
    const empty = new Geometry();
    const wf = new WireframeGeometry(empty);
    expect(defined(wf.getAttribute("position")).array.length).toBe(0);
  });
});
