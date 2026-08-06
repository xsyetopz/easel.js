import { describe, expect, it } from "bun:test";
import { TTFFont, TTFLoader } from "@/loaders/TTFLoader.js";

const FIXTURE =
  "AAEAAAAJAIAAAwAQY21hcABIAK0AAACcAAAAPGdseWYLRw+jAAAA2AAAAIRoZWFkAloK8QAAAVwAAAA2aGhlYQZDAZQAAAGUAAAAJGhtdHgINAAAAAABuAAAAAxsb2NhAAAA0AAAAcQAAAAQbWF4cAAEAAAAAAHUAAAABm5hbWUAmgT7AAAB3AAAABxwb3N0/58AMgAAAfgAAAAgAAAAAQADAAEAAAAMAAQAMAAAAAgAAAAAAAAAIAA/AEX//wAAACAAPwBF////4P/D/7wAAQAAAAAAAAAAAAEAAAAAAlgDIAALAAABAQEBAQEBAQEBAQEAAAJYAAD+NAAAAXwAAP6EAAABzAAA/agAAAAAAHgAAADcAAAAeAAAANwAAAB4AAAAAAABAAAAAAH0AyAABwAAAQEBAQEBAQEAAAH0AAD+ogAAAV4AAP4MAAAAAACWAAAB9AAAAJYAAAAAAAEAAAABAAAAAAAAAAAD6AAAA+gAAAAAAAAAAAAAAAAAAAAAAAAAAAJYAyAAAAAAAAAAAQAAAAAAAQAAAyD/OAAAAyADIP84AAAAAQAAAAAAAAAAAAAAAAAAAAMCvAAAArwAAAK8AAAAAAAAAAAAAAAAAEwAAACEAAEAAAADAAAAAAABABIAAwABBAkAAQAKAAAARQBBAFMARQBMAAMAAAAAAAD/nAAyAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

function fixtureBytes(): Uint8Array {
  return Uint8Array.from(Buffer.from(FIXTURE, "base64"));
}

describe("TTFLoader", () => {
  it("decodes cmap, metrics, names, and quadratic glyph outlines", () => {
    const result = new TTFLoader().parse(fixtureBytes());

    expect(result.familyName).toBe("EASEL");
    expect(result.ascender).toBe(1111);
    expect(result.descender).toBe(-278);
    expect(result.boundingBox).toEqual({
      xMin: 0,
      xMax: 600,
      yMin: 0,
      yMax: 800,
    });
    expect(result.glyphs["E"]).toMatchObject({ ha: 972, x_min: 0, x_max: 833 });
    expect(result.glyphs["E"]?.o).toContain("m 0 0 l 833 0");
    expect(result.glyphs[" "]?.o).toBe("");
  });

  it("converts parsed outlines to Shape contours with font-compatible advances", () => {
    const font = new TTFFont(new TTFLoader().parse(fixtureBytes()));
    const shapes = font.generateShapes("E?", 100);

    expect(font.isFont).toBe(true);
    expect(font.type).toBe("Font");
    expect(shapes).toHaveLength(2);
    expect(shapes[0]?.curves.length).toBeGreaterThan(4);
    expect(shapes[0]?.getPoints(12).length).toBeGreaterThan(3);
  });

  it("supports reversed winding and rejects unsupported or truncated data", () => {
    const loader = new TTFLoader();
    const normal = loader.parse(fixtureBytes());
    loader.reversed = true;
    const reversed = loader.parse(fixtureBytes());
    expect(reversed.glyphs["E"]?.o).not.toBe(normal.glyphs["E"]?.o);
    expect(() => new TTFLoader().parse(new Uint8Array(8))).toThrow(
      /TTFLoader: truncated sfnt header/u,
    );
    expect(() => new TTFLoader().parse(new Uint8Array(32))).toThrow();
  });
});
