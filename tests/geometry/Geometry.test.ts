import { describe, expect, it } from "bun:test";
import { Side } from "@/core/Constants.js";
import { Attribute } from "@/geometry/Attribute.js";
import {
  Geometry,
  registerGeometryCacheInvalidator,
  unregisterGeometryCacheInvalidator,
} from "@/geometry/Geometry.js";
import { LineMaterial } from "@/materials/LineMaterial.js";
import { Matrix4 } from "@/math/Matrix4.js";
import { Quaternion } from "@/math/Quaternion.js";
import { Vector3 } from "@/math/Vector3.js";
import { Line } from "@/objects/Line.js";
import { SceneTraversal } from "@/pipeline/SceneTraversal.js";
import { defined } from "../_helpers/defined.ts";
import {
  makeTraversalCamera,
  makeTraversalScene,
} from "../_helpers/scene-traversal.ts";

function traverseMesh(
  geometry: Geometry,
): ReturnType<SceneTraversal["traverse"]> {
  const node = {
    type: "Mesh",
    visible: true,
    children: [],
    matrixWorld: new Matrix4(),
    geometry,
    material: { side: Side.Double, shading: 0 },
  };
  return new SceneTraversal().traverse(
    makeTraversalScene(node),
    makeTraversalCamera(),
    100,
    100,
  );
}

function makeTwoTriangleGeometry(indexed: boolean): Geometry {
  const geometry = new Geometry().setPositions([
    -0.9, 0.9, 0, -0.9, 0.1, 0, -0.1, 0.5, 0, 0.1, 0.1, 0, 0.9, 0.1, 0, 0.9,
    0.9, 0,
  ]);
  if (indexed) geometry.index = [0, 1, 2, 3, 4, 5];
  return geometry;
}

describe("Geometry", () => {
  describe("setPositions", () => {
    it("stores position attribute with itemSize=3", () => {
      const g = new Geometry();
      g.setPositions(new Float32Array([1, 2, 3, 4, 5, 6]));
      const attr = defined(g.getAttribute("position"));
      expect(attr).toBeDefined();
      expect(attr.itemSize).toBe(3);
      expect(attr.count).toBe(2);
    });

    it("converts plain array to Float32Array", () => {
      const g = new Geometry();
      g.setPositions([1, 2, 3]);
      expect(defined(g.getAttribute("position")).array).toBeInstanceOf(
        Float32Array,
      );
    });

    it("returns this for chaining", () => {
      const g = new Geometry();
      expect(g.setPositions(new Float32Array(3))).toBe(g);
    });
  });

  describe("setNormals", () => {
    it("stores normal attribute with itemSize=3", () => {
      const g = new Geometry();
      g.setNormals(new Float32Array([0, 1, 0]));
      const attr = defined(g.getAttribute("normal"));
      expect(attr).toBeDefined();
      expect(attr.itemSize).toBe(3);
    });

    it("marks generated normals for the next renderer preparation", () => {
      const g = new Geometry().setPositions([0, 0, 0, 1, 0, 0, 0, 1, 0]);
      g.index = [0, 1, 2];
      g.computeVertexNormals();
      expect(defined(g.getAttribute("normal")).needsUpdate).toBe(true);
    });
  });

  describe("setUVs", () => {
    it("stores uv attribute with itemSize=2", () => {
      const g = new Geometry();
      g.setUVs(new Float32Array([0, 0, 1, 1]));
      const attr = defined(g.getAttribute("uv"));
      expect(attr).toBeDefined();
      expect(attr.itemSize).toBe(2);
      expect(attr.count).toBe(2);
    });
  });

  describe("setColors", () => {
    it("stores color attribute with itemSize=3", () => {
      const g = new Geometry();
      g.setColors(new Float32Array([1, 0, 0, 0, 1, 0]));
      const attr = defined(g.getAttribute("color"));
      expect(attr).toBeDefined();
      expect(attr.itemSize).toBe(3);
    });
  });

  describe("index accessor", () => {
    it("stores Uint16Array directly", () => {
      const g = new Geometry();
      const idx = new Uint16Array([0, 1, 2]);
      g.index = idx;
      expect(g.index).toBe(idx);
    });

    it("stores Uint32Array directly", () => {
      const g = new Geometry();
      const idx = new Uint32Array([0, 1, 2]);
      g.index = idx;
      expect(g.index).toBe(idx);
    });

    it("converts plain array to Uint16Array when count <= 65535", () => {
      const g = new Geometry();
      g.index = [0, 1, 2, 3, 4, 5];
      expect(g.index).toBeInstanceOf(Uint16Array);
      expect(
        Array.from(
          defined(g.index instanceof Uint16Array ? g.index : undefined),
        ),
      ).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it("converts large plain array to Uint32Array", () => {
      const g = new Geometry();
      const big = Array.from({ length: 65536 }, (_, i) => i);
      g.index = big;
      expect(g.index).toBeInstanceOf(Uint32Array);
    });

    it("accepts typed indices through the property setter", () => {
      const g = new Geometry();
      const index = new Uint16Array([0, 1, 2]);
      g.index = index;
      expect(g.index).toBe(index);
    });

    it("clears an existing index when passed undefined", () => {
      const g = new Geometry();
      g.index = new Uint16Array([0, 1, 2]);
      g.index = undefined;
      expect(g.index).toBeUndefined();
    });
  });

  describe("draw range", () => {
    it("defaults to the full sequential or indexed range", () => {
      const g = new Geometry();
      expect(g.drawRange).toEqual({
        start: 0,
        count: Number.POSITIVE_INFINITY,
      });
    });

    it("sets a range and returns this for chaining", () => {
      const g = new Geometry();
      expect(g.setDrawRange(3, 6)).toBe(g);
      expect(g.drawRange).toEqual({ start: 3, count: 6 });
    });

    it("copies draw range values without sharing the range object", () => {
      const source = new Geometry().setDrawRange(2, 4);
      const clone = source.clone();
      expect(clone.drawRange).toEqual({ start: 2, count: 4 });
      expect(clone.drawRange).not.toBe(source.drawRange);

      clone.drawRange.start = 0;
      expect(source.drawRange.start).toBe(2);
    });

    it("limits indexed mesh assembly to the selected index interval", () => {
      const geometry = makeTwoTriangleGeometry(true).setDrawRange(3, 3);
      const drawCall = defined(traverseMesh(geometry).calls[0]);

      expect(Array.from(drawCall.faceIndices)).toEqual([3, 4, 5]);
      expect((drawCall.triangles as { length: number }).length).toBe(1);
    });

    it("limits non-indexed mesh assembly to the selected vertex interval", () => {
      const geometry = makeTwoTriangleGeometry(false).setDrawRange(3, 3);
      const drawCall = defined(traverseMesh(geometry).calls[0]);

      expect(Array.from(drawCall.faceIndices)).toEqual([3, 4, 5]);
      expect((drawCall.triangles as { length: number }).length).toBe(1);
    });

    it("limits line assembly without changing source vertex indices", () => {
      const geometry = new Geometry()
        .setPositions([-0.9, 0, 0, -0.3, 0, 0, 0.3, 0, 0, 0.9, 0, 0])
        .setDrawRange(1, 2);
      const line = new Line(geometry, new LineMaterial());
      const drawCall = defined(
        new SceneTraversal().traverse(
          makeTraversalScene(line),
          makeTraversalCamera(),
          100,
          100,
        ).calls[0],
      );

      expect(Array.from(drawCall.faceIndices)).toEqual([1, 2]);
      expect(drawCall.lines?.length).toBe(1);
      expect(Array.from(drawCall.lines?.vertexIndex.slice(0, 2) ?? [])).toEqual(
        [1, 2],
      );
    });
  });

  describe("getAttribute / setAttribute", () => {
    it("getAttribute returns undefined for missing key", () => {
      const g = new Geometry();
      expect(g.getAttribute("position")).toBeUndefined();
    });

    it("setAttribute stores and getAttribute retrieves", () => {
      const g = new Geometry();
      const attr = new Attribute(new Float32Array([1, 2, 3]), 3);
      g.setAttribute("custom", attr);
      expect(defined(g.getAttribute("custom"))).toBe(attr);
    });

    it("setAttribute returns this", () => {
      const g = new Geometry();
      const attr = new Attribute(new Float32Array(3), 3);
      expect(g.setAttribute("x", attr)).toBe(g);
    });
  });

  describe("deleteAttribute", () => {
    it("removes an attribute and returns true", () => {
      const g = new Geometry();
      g.setPositions(new Float32Array(3));
      expect(g.deleteAttribute("position")).toBe(true);
      expect(g.getAttribute("position")).toBeUndefined();
    });

    it("returns false for missing key", () => {
      const g = new Geometry();
      expect(g.deleteAttribute("nonexistent")).toBe(false);
    });
  });

  describe("computeBoundingBox", () => {
    it("computes exact XYZ bounds", () => {
      const g = new Geometry().setPositions([-2, 5, 1, 3, -4, 7, 1, 2, -6]);

      expect(g.computeBoundingBox()).toBe(g);
      const box = defined(g.boundingBox);
      expect(box.min.equals(new Vector3(-2, -4, -6))).toBe(true);
      expect(box.max.equals(new Vector3(3, 5, 7))).toBe(true);
    });

    it("stores an empty box when positions are absent", () => {
      const g = new Geometry();
      g.computeBoundingBox();
      expect(defined(g.boundingBox).isEmpty).toBe(true);
    });
  });

  describe("translate and center", () => {
    it("mutates position storage and updates prepared bounds", () => {
      const g = new Geometry().setPositions([0, 1, 2, 4, 5, 6]);
      g.computeBoundingBox().computeBoundingSphere();
      const position = defined(g.getAttribute("position"));

      expect(g.translate(2, -1, 3)).toBe(g);
      expect(Array.from(position.array)).toEqual([2, 0, 5, 6, 4, 9]);
      expect(position.needsUpdate).toBe(true);
      expect(defined(g.boundingBox).min.equals(new Vector3(2, 0, 5))).toBe(
        true,
      );
      expect(defined(g.boundingBox).max.equals(new Vector3(6, 4, 9))).toBe(
        true,
      );
      expect(
        defined(g.boundingSphere).centre.equals(new Vector3(4, 2, 7)),
      ).toBe(true);
    });

    it("centers the geometry around the origin", () => {
      const g = new Geometry().setPositions([-1, -2, -3, 3, 4, 5]);
      expect(g.center()).toBe(g);

      const position = defined(g.getAttribute("position"));
      expect(Array.from(position.array)).toEqual([-2, -3, -4, 2, 3, 4]);
      expect(defined(g.boundingBox).centre.equals(new Vector3())).toBe(true);
    });
  });

  describe("bounded transforms", () => {
    it("transforms positions, normals, and prepared bounds in one mutation", () => {
      const geometry = new Geometry()
        .setPositions([1, 0, 0])
        .setNormals([1, 0, 0])
        .computeBoundingBox()
        .computeBoundingSphere();

      expect(geometry.rotateZ(Math.PI / 2)).toBe(geometry);
      const position = defined(geometry.getAttribute("position"));
      const normal = defined(geometry.getAttribute("normal"));
      expect(position.getX(0)).toBeCloseTo(0);
      expect(position.getY(0)).toBeCloseTo(1);
      expect(normal.getX(0)).toBeCloseTo(0);
      expect(normal.getY(0)).toBeCloseTo(1);
      expect(position.needsUpdate).toBe(true);
      expect(normal.needsUpdate).toBe(true);
      expect(geometry.boundingBox?.min.x).toBeCloseTo(0);
      expect(geometry.boundingBox?.min.y).toBeCloseTo(1);
      expect(geometry.boundingSphere?.centre.x).toBeCloseTo(0);
      expect(geometry.boundingSphere?.centre.y).toBeCloseTo(1);
    });

    it("uses the inverse-transpose normal matrix for non-uniform scale", () => {
      const geometry = new Geometry()
        .setPositions([1, 1, 0])
        .setNormals([Math.SQRT1_2, Math.SQRT1_2, 0]);
      geometry.scale(2, 1, 1);

      const normal = defined(geometry.getAttribute("normal"));
      expect(normal.getX(0)).toBeCloseTo(1 / Math.sqrt(5));
      expect(normal.getY(0)).toBeCloseTo(2 / Math.sqrt(5));
    });

    it("handles zero scale without an exception or invalid normals", () => {
      const geometry = new Geometry()
        .setPositions([1, 1, 1])
        .setNormals([Math.SQRT1_2, Math.SQRT1_2, 0]);
      geometry.scale(0, 1, 1);

      const normal = defined(geometry.getAttribute("normal"));
      expect(normal.getX(0)).toBe(0);
      expect(normal.getY(0)).toBe(0);
      expect(normal.getZ(0)).toBe(0);
    });

    it("supports direct matrices and quaternions without persistent work", () => {
      const geometry = new Geometry().setPositions([1, 0, 0]);
      geometry.applyMatrix4(new Matrix4().makeRotationY(Math.PI / 2));
      expect(defined(geometry.getAttribute("position")).getZ(0)).toBeCloseTo(
        -1,
      );

      geometry.applyQuaternion(
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -Math.PI / 2),
      );
      expect(defined(geometry.getAttribute("position")).getX(0)).toBeCloseTo(1);
      expect(geometry.rotateX(0).rotateY(0)).toBe(geometry);
    });
  });

  describe("geometry cache invalidation", () => {
    it("publishes attribute updates to normal and UV cache owners", () => {
      const geometry = new Geometry()
        .setNormals([0, 0, 1])
        .setUVs([0, 0, 1, 0, 0, 1]);
      const cacheOwner = geometry as unknown as {
        _uvCache?: Float32Array;
      };
      cacheOwner._uvCache = new Float32Array(6);
      let invalidations = 0;
      registerGeometryCacheInvalidator(geometry, () => {
        invalidations++;
      });

      const uv = defined(geometry.getAttribute("uv"));
      uv.setXY(0, 1, 0.5);
      uv.needsUpdate = true;

      expect(cacheOwner._uvCache).toBeUndefined();
      expect(invalidations).toBe(1);
    });

    it("deduplicates and unregisters mutation callbacks", () => {
      const g = new Geometry();
      let invalidations = 0;
      const invalidator = () => {
        invalidations++;
      };

      registerGeometryCacheInvalidator(g, invalidator);
      registerGeometryCacheInvalidator(g, invalidator);
      g.setNormals([0, 0, 1]);
      expect(invalidations).toBe(1);

      unregisterGeometryCacheInvalidator(g, invalidator);
      g.setNormals([0, 1, 0]);
      expect(invalidations).toBe(1);
    });
  });

  describe("copy, clone, and toNonIndexed", () => {
    it("deep-copies typed attributes, indices, and prepared bounds", () => {
      const source = new Geometry();
      source.name = "source";
      source.parameters = { detail: 2 };
      source.setPositions([0, 0, 0, 1, 0, 0, 0, 1, 0]);
      source.setAttribute(
        "weights",
        new Attribute(new Uint16Array([1, 2, 3]), 1, true),
      );
      source.index = new Uint32Array([0, 1, 2]);
      source.computeBoundingBox().computeBoundingSphere();

      const clone = source.clone();
      expect(clone.id).not.toBe(source.id);
      expect(clone.name).toBe("source");
      expect(clone.parameters).not.toBe(source.parameters);
      expect(clone.index).not.toBe(source.index);
      expect(clone.index).toBeInstanceOf(Uint32Array);
      expect(clone.boundingBox).not.toBe(source.boundingBox);
      expect(clone.boundingSphere).not.toBe(source.boundingSphere);

      const clonePositions = defined(clone.getAttribute("position"));
      const sourcePositions = defined(source.getAttribute("position"));
      expect(clonePositions.array).not.toBe(sourcePositions.array);
      clonePositions.setX(0, 9);
      expect(sourcePositions.getX(0)).toBe(0);

      const copied = new Geometry().copy(source);
      expect(copied.id).not.toBe(source.id);
      expect(copied.getAttribute("weights")?.array).not.toBe(
        source.getAttribute("weights")?.array,
      );
    });

    it("expands indexed attributes while preserving their constructors", () => {
      const source = new Geometry().setPositions([
        0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0,
      ]);
      source.setAttribute(
        "uv",
        new Attribute(
          new Uint16Array([0, 0, 65535, 0, 65535, 65535, 0, 65535]),
          2,
        ),
      );
      source.index = [0, 1, 2, 2, 3, 0];

      const nonIndexed = source.toNonIndexed();
      expect(nonIndexed.id).not.toBe(source.id);
      expect(nonIndexed.index).toBeUndefined();
      expect(
        Array.from(defined(nonIndexed.getAttribute("position")).array),
      ).toEqual([0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0]);
      expect(defined(nonIndexed.getAttribute("uv")).array).toBeInstanceOf(
        Uint16Array,
      );
      expect(Array.from(defined(nonIndexed.getAttribute("uv")).array)).toEqual([
        0, 0, 65535, 0, 65535, 65535, 65535, 65535, 0, 65535, 0, 0,
      ]);
      expect(defined(source.getAttribute("position")).array.length).toBe(12);
    });

    it("clones an already sequential geometry without sharing buffers", () => {
      const source = new Geometry().setPositions([0, 0, 0]);
      const result = source.toNonIndexed();
      expect(result).not.toBe(source);
      expect(result.index).toBeUndefined();
      expect(result.getAttribute("position")?.array).not.toBe(
        source.getAttribute("position")?.array,
      );
    });
  });

  describe("computeVertexNormals", () => {
    it("computes normals for a single triangle in XY plane", () => {
      const g = new Geometry();
      g.setPositions(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]));
      g.index = new Uint16Array([0, 1, 2]);
      g.computeVertexNormals();
      const normal = defined(g.getAttribute("normal"));
      expect(normal).toBeDefined();
      // All verts should have normal pointing in +Z
      for (let i = 0; i < 3; i++) {
        expect(normal.getZ(i)).toBeCloseTo(1, 4);
        expect(normal.getX(i)).toBeCloseTo(0, 4);
        expect(normal.getY(i)).toBeCloseTo(0, 4);
      }
    });

    describe("computeTangents", () => {
      it("computes orthogonal unit tangents and handedness from UVs", () => {
        const g = new Geometry()
          .setPositions([0, 0, 0, 1, 0, 0, 0, 1, 0])
          .setNormals([0, 0, 1, 0, 0, 1, 0, 0, 1])
          .setUVs([0, 0, 1, 0, 0, 1]);
        g.index = [0, 1, 2];

        expect(g.computeTangents()).toBe(g);
        const tangent = defined(g.getAttribute("tangent"));
        expect(tangent.itemSize).toBe(4);
        for (let index = 0; index < tangent.count; index++) {
          expect(tangent.getX(index)).toBeCloseTo(1, 6);
          expect(tangent.getY(index)).toBeCloseTo(0, 6);
          expect(tangent.getZ(index)).toBeCloseTo(0, 6);
          expect(tangent.getW(index)).toBe(1);
        }
        expect(tangent.needsUpdate).toBe(true);
      });

      it("keeps degenerate UV triangles finite", () => {
        const g = new Geometry()
          .setPositions([0, 0, 0, 1, 0, 0, 0, 1, 0])
          .setNormals([0, 0, 1, 0, 0, 1, 0, 0, 1])
          .setUVs([0, 0, 0, 0, 0, 0]);
        g.index = [0, 1, 2];
        g.computeTangents();

        const tangent = defined(g.getAttribute("tangent"));
        expect(Array.from(tangent.array).every(Number.isFinite)).toBe(true);
      });

      it("does not create tangents without required channels", () => {
        const g = new Geometry().setPositions([0, 0, 0, 1, 0, 0, 0, 1, 0]);
        expect(g.computeTangents()).toBe(g);
        expect(g.getAttribute("tangent")).toBeUndefined();
      });
    });

    it("returns this when no position attribute", () => {
      const g = new Geometry();
      expect(g.computeVertexNormals()).toBe(g);
    });
  });

  describe("dispose", () => {
    it("clears attributes and index", () => {
      const g = new Geometry();
      g.setPositions(new Float32Array([1, 2, 3]));
      g.index = new Uint16Array([0]);
      g.dispose();
      expect(g.getAttribute("position")).toBeUndefined();
      expect(g.index).toBeUndefined();
    });
  });

  describe("id and name", () => {
    it("assigns unique ids", () => {
      const a = new Geometry();
      const b = new Geometry();
      expect(b.id).toBeGreaterThan(a.id);
    });

    it("name defaults to empty string", () => {
      const g = new Geometry();
      expect(g.name).toBe("");
    });
  });
});
