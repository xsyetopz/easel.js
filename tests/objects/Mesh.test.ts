import { describe, expect, it } from "bun:test";
import { Node } from "@/core/Node.js";
import { Geometry } from "@/geometry/Geometry.js";
import { Mesh } from "@/objects/Mesh.js";

describe("Mesh", () => {
  it("has type='Mesh'", () => {
    const mesh = new Mesh();
    expect(mesh.type).toBe("Mesh");
  });

  it("stores geometry and material from constructor", () => {
    const geo = { type: "Geometry" } as unknown as never;
    const mat = { type: "Material" } as unknown as never;
    const mesh = new Mesh(geo, mat);
    expect(mesh.geometry).toBe(geo);
    expect(mesh.material).toBe(mat);
  });

  it("defaults geometry and material to undefined", () => {
    const mesh = new Mesh();
    expect(mesh.geometry).toBeUndefined();
    expect(mesh.material).toBeUndefined();
  });

  it("inherits from Node", () => {
    expect(new Mesh()).toBeInstanceOf(Node);
  });

  it("clone returns a Mesh with same geometry and material", () => {
    const geo = { type: "Geometry" } as unknown as never;
    const mat = { type: "Material" } as unknown as never;
    const mesh = new Mesh(geo, mat);
    mesh.name = "myMesh";
    const c = mesh.clone();
    expect(c).toBeInstanceOf(Mesh);
    expect(c).not.toBe(mesh);
    expect(c.geometry).toBe(geo);
    expect(c.material).toBe(mat);
    expect(c.name).toBe("myMesh");
  });

  it("copy copies geometry, material, and Node properties", () => {
    const src = new Mesh(
      { type: "Geo" } as unknown as never,
      { type: "Mat" } as unknown as never,
    );
    src.name = "src";
    const dest = new Mesh();
    dest.copy(src);
    expect(dest.geometry).toBe(src.geometry);
    expect(dest.material).toBe(src.material);
    expect(dest.name).toBe("src");
  });

  it("invalidates normal caches only when its assigned geometry mutates", () => {
    const first = new Geometry().setNormals([0, 0, 1]);
    const second = new Geometry().setNormals([0, 1, 0]);
    const mesh = new Mesh(first);
    const caches = mesh as unknown as {
      _worldNormalCache?: Float32Array;
      _worldNormalCacheKey?: Float32Array;
      _instWorldNormals?: Float32Array[];
      _instWorldNormalKey?: Float32Array[];
    };

    caches._worldNormalCache = new Float32Array(3);
    caches._worldNormalCacheKey = new Float32Array(9);
    caches._instWorldNormals = [new Float32Array(3)];
    caches._instWorldNormalKey = [new Float32Array(9)];
    const normal = first.getAttribute("normal");
    expect(normal).toBeDefined();
    normal?.setXYZ(0, 1, 0, 0);
    if (normal) normal.needsUpdate = true;
    expect(caches._worldNormalCache).toBeUndefined();
    expect(caches._worldNormalCacheKey).toBeUndefined();

    caches._worldNormalCache = new Float32Array(3);
    caches._worldNormalCacheKey = new Float32Array(9);
    first.rotateX(Math.PI / 2);
    expect(caches._worldNormalCache).toBeUndefined();
    expect(caches._worldNormalCacheKey).toBeUndefined();
    expect(caches._instWorldNormals).toBeUndefined();
    expect(caches._instWorldNormalKey).toBeUndefined();

    mesh.geometry = second;
    caches._worldNormalCache = new Float32Array(3);
    first.setNormals([1, 0, 0]);
    expect(caches._worldNormalCache).toBeDefined();
    second.setNormals([1, 0, 0]);
    expect(caches._worldNormalCache).toBeUndefined();
  });
});
