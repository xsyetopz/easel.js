import { describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const assets = {
  "gltf/simple-instancing/SimpleInstancing.gltf":
    "a01695630e6459c945826c7ff8dde74784de8279f60b9b62604980dc7486340e",
  "gltf/simple-instancing/SimpleInstancing.bin":
    "29d38705c2a619f30374e80413be61f2e855dd9ec59c499201000aa53715a73c",
  "pcd/simple.pcd":
    "eaba763d849fd6caf9a0addd39c54596f40abdac463cb1891cec36aa18b44832",
  "stl/slotted_disk.stl":
    "5c0d95ca55352ccf5cca12197a5f9fa17eb2e905d1bb3a45c8ba51c9a22699a4",
  "ply/dolphins.ply":
    "1246b1050ebc1e2e6b9de796a004bd3914e525546d402a5e286fbe6f13940c8e",
  "xyz/helix_201.xyz":
    "489c27c4b619c9a47c15df62ebb7a5474791a7ae85f0c9c3f8323a9504288519",
  "pdb/caffeine.pdb":
    "f55f7c10b7dd5c80e47c9a778583c5546ed9ec877621761a5e610fffa31ff802",
  "vox/chr_knight.vox":
    "455208399cc7f888629bf4715284ffb5608a0157342e1e8135f460788dddf6f4",
  "gcode/Circle_Diamond_Square_Calibration.gcode":
    "5865813fdc225b6b13bd61084ed8433f6e2a0af7f7bbbed0cd1f80be88bb0bdb",
} as const;

describe("example assets", () => {
  for (const [path, expected] of Object.entries(assets)) {
    it(`keeps ${path} pinned`, () => {
      const contents = readFileSync(
        new URL(`../../assets/${path}`, import.meta.url),
      );
      expect(createHash("sha256").update(contents).digest("hex")).toBe(
        expected,
      );
    });
  }

  it("keeps binary transport encodings byte-equivalent", () => {
    for (const path of [
      "gltf/simple-instancing/SimpleInstancing.bin",
      "vox/chr_knight.vox",
    ]) {
      const binary = readFileSync(
        new URL(`../../assets/${path}`, import.meta.url),
      );
      const encoded = readFileSync(
        new URL(`../../assets/${path}.base64`, import.meta.url),
        "utf8",
      );
      expect(
        Uint8Array.from(atob(encoded), (value) => value.charCodeAt(0)),
      ).toEqual(new Uint8Array(binary));
    }
  });
});
