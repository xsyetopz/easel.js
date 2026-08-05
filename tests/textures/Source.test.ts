import { describe, expect, it } from "bun:test";
import { Vector2 } from "@/math/Vector2.js";
import { Source } from "@/textures/Source.js";

describe("Source", () => {
  it("reports dimensions and versioned updates", () => {
    const source = new Source({
      data: new Uint8ClampedArray(8),
      width: 2,
      height: 1,
    });
    const size = source.sizeInto(new Vector2());
    expect(size.x).toBe(2);
    expect(size.y).toBe(1);
    expect(source.version).toBe(0);
    source.needsUpdate = true;
    expect(source.version).toBe(1);
  });

  it("serializes raw pixel payloads and deduplicates metadata", () => {
    const source = new Source({
      data: new Uint8ClampedArray([10, 20, 30, 255]),
      width: 1,
      height: 1,
    });
    const meta = { images: {} };
    const json = source.toJSON(meta);
    expect(json.url).toEqual({
      data: [10, 20, 30, 255],
      width: 1,
      height: 1,
      type: "Uint8ClampedArray",
    });
    expect(source.toJSON(meta)).toBe(json);
  });
});
