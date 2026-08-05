import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { extractUrlBase, resolveUrl } from "@/loaders/LoaderUtils.js";

interface LoaderUtilsLike {
  extractUrlBase(url: string): string;
  resolveURL(url: string, path: string): string;
}

const THREELoaderUtils = (THREE as unknown as { LoaderUtils: LoaderUtilsLike })
  .LoaderUtils;

describe("LoaderUtils", () => {
  it("matches THREE.js base extraction", () => {
    for (const url of ["model.glb", "models/model.glb", "/model.glb", ""]) {
      expect(extractUrlBase(url)).toBe(THREELoaderUtils.extractUrlBase(url));
    }
  });

  it("matches THREE.js for ordinary loader URLs", () => {
    for (const [url, path] of [
      ["model.glb", "assets/"],
      ["/model.glb", "https://example.test/assets/"],
      ["https://cdn.test/model.glb", "assets/"],
      ["//cdn.test/model.glb", "assets/"],
      ["data:text/plain,hello", "assets/"],
      ["blob:https://example.test/id", "assets/"],
    ] as const) {
      expect(resolveUrl(url, path)).toBe(
        THREELoaderUtils.resolveURL(url, path),
      );
    }
  });

  it("recognizes modern absolute URL schemes", () => {
    expect(resolveUrl("file:///tmp/model.glb", "assets/")).toBe(
      "file:///tmp/model.glb",
    );
    expect(resolveUrl("asset:model.glb", "assets/")).toBe("asset:model.glb");
  });

  it("uses the platform URL parser for absolute bases", () => {
    expect(resolveUrl("../model.glb", "https://example.test/a/b/")).toBe(
      "https://example.test/a/model.glb",
    );
    expect(() => resolveUrl("model.glb", "https:")).toThrow(TypeError);
  });

  it("keeps an empty URL empty", () => {
    expect(resolveUrl("", "assets/")).toBe("");
  });
});
