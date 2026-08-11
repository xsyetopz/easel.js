import { describe, expect, it } from "bun:test";
import {
  Geometry,
  registerGeometryCacheInvalidator,
} from "@/geometry/Geometry.js";
import { defined } from "../_helpers/defined.ts";

describe("Geometry.setFromPoints", () => {
  it("stores Vector2-like points with zero z values", () => {
    const geometry = new Geometry();
    expect(
      geometry.setFromPoints([
        { x: 1, y: 2 },
        { x: -3, y: 4 },
      ]),
    ).toBe(geometry);

    const position = defined(geometry.getAttribute("position"));
    expect(position.itemSize).toBe(3);
    expect(Array.from(position.array)).toEqual([1, 2, 0, -3, 4, 0]);
  });

  it("stores Vector3-like points and replaces prior position data", () => {
    const geometry = new Geometry().setPositions([9, 9, 9]);
    geometry.setFromPoints([{ x: 1, y: 2, z: 3 }]);

    expect(
      Array.from(defined(geometry.getAttribute("position")).array),
    ).toEqual([1, 2, 3]);
  });

  it("invalidates prepared bounds and dependent caches", () => {
    const geometry = new Geometry()
      .setPositions([0, 0, 0])
      .computeBoundingBox()
      .computeBoundingSphere();
    const cacheOwner = geometry as unknown as {
      _sequentialIndices?: Uint32Array;
    };
    cacheOwner._sequentialIndices = new Uint32Array([0]);
    let invalidations = 0;
    registerGeometryCacheInvalidator(geometry, (): void => {
      invalidations++;
    });

    geometry.setFromPoints([{ x: 5, y: 6, z: 7 }]);

    expect(geometry.boundingBox).toBeUndefined();
    expect(geometry.boundingSphere).toBeUndefined();
    expect(cacheOwner._sequentialIndices).toBeUndefined();
    expect(invalidations).toBe(1);
  });
});
