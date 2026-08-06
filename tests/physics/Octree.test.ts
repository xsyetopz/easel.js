import { describe, expect, it } from "bun:test";
import { Node } from "@/core/Node.js";
import { Geometry } from "@/geometry/Geometry.js";
import { Box3 } from "@/math/Box3.js";
import { Capsule } from "@/math/Capsule.js";
import { Triangle } from "@/math/Triangle.js";
import { Vector3 } from "@/math/Vector3.js";
import { Mesh } from "@/objects/Mesh.js";
import { Octree } from "@/physics/Octree.js";

describe("Octree", () => {
  it("indexes copied boxes and resolves a capsule overlap", () => {
    const octree = new Octree().addBox(
      new Box3(new Vector3(-1, -1, -1), new Vector3(1, 1, 1)),
    );
    const capsule = new Capsule(
      new Vector3(0, 0, 0),
      new Vector3(0, 1, 0),
      0.25,
    );
    const hit = octree.capsuleIntersect(capsule);
    expect(hit).not.toBe(false);
    expect(hit === false ? undefined : hit.depth).toBeGreaterThan(0);
    expect(capsule.start.y).toBeGreaterThan(0.5);
  });

  it("returns no hit for a separated capsule", () => {
    const octree = new Octree().addBox(
      new Box3(new Vector3(-1, -1, -1), new Vector3(1, 1, 1)),
    );
    const capsule = new Capsule(
      new Vector3(0, 3, 0),
      new Vector3(0, 4, 0),
      0.25,
    );
    expect(octree.capsuleIntersect(capsule)).toBe(false);
    expect(octree.findBox(new Vector3(0, 0, 0))).not.toBeUndefined();
  });

  it("keeps a capsule resting on a floor at contact", () => {
    const octree = new Octree().addBox(
      new Box3(new Vector3(-2, -0.5, -2), new Vector3(2, 0, 2)),
    );
    const capsule = new Capsule(
      new Vector3(0, 0.35, 0),
      new Vector3(0, 1.65, 0),
      0.35,
    );
    const hit = octree.capsuleIntersect(capsule);
    expect(hit).not.toBe(false);
    expect(hit === false ? undefined : hit.depth).toBe(0);
    expect(capsule.start.y).toBe(0.35);
  });

  it("indexes copied triangles and resolves capsule penetration", () => {
    const triangle = new Triangle(
      new Vector3(-2, 0, -2),
      new Vector3(2, 0, -2),
      new Vector3(-2, 0, 2),
    );
    const octree = new Octree().addTriangle(triangle).build();
    triangle.a.y = 100;

    expect(octree.triangles).toHaveLength(1);
    expect(octree.triangles[0]?.a.y).toBe(0);
    const capsule = new Capsule(
      new Vector3(0, 0.25, 0),
      new Vector3(0, 1.25, 0),
      0.3,
    );
    const hit = octree.capsuleIntersect(capsule);
    expect(hit).not.toBe(false);
    if (hit === false) return;
    expect(hit.normal.y).toBeCloseTo(1);
    expect(hit.depth).toBeCloseTo(0.05, 6);
    expect(capsule.start.y).toBeCloseTo(0.3, 6);
  });

  it("extracts indexed mesh triangles in world space", () => {
    const geometry = new Geometry().setPositions([
      -1, 0, -1, 1, 0, -1, -1, 0, 1,
    ]);
    geometry.index = [0, 1, 2];
    const mesh = new Mesh(geometry);
    mesh.position.set(3, 2, 4);
    const root = new Node().add(mesh);
    const octree = new Octree().fromGraphNode(root);

    expect(octree.triangles).toHaveLength(1);
    expect(octree.boxes).toHaveLength(1);
    expect(octree.triangles[0]?.a).toMatchObject({ x: 2, y: 2, z: 3 });
    expect(octree.findBox(new Vector3(2.5, 2, 3.5))).not.toBeUndefined();
  });

  it("can retain the legacy AABB-only graph path", () => {
    const geometry = new Geometry().setPositions([
      -1, 0, -1, 1, 0, -1, -1, 0, 1,
    ]);
    const root = new Node().add(new Mesh(geometry));
    const octree = new Octree().fromGraphNode(root, { triangles: false });

    expect(octree.triangles).toHaveLength(0);
    expect(octree.boxes).toHaveLength(1);
  });
});
