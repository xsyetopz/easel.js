import { describe, expect, it } from "bun:test";
import { PerspectiveCamera } from "@/cameras/PerspectiveCamera.ts";
import { Material } from "@/materials/Material.ts";
import { LineMaterial } from "@/materials/LineMaterial.ts";
import { Color } from "@/math/Color.ts";
import { Matrix4 } from "@/math/Matrix4.ts";
import { Vector3 } from "@/math/Vector3.ts";
import { Raycaster } from "@/core/Raycaster.ts";
import { Geometry } from "@/geometry/Geometry.ts";
import { Bone } from "@/objects/Bone.ts";
import { Group } from "@/objects/Group.ts";
import { InstancedMesh } from "@/objects/InstancedMesh.ts";
import { LineLoop } from "@/objects/LineLoop.ts";
import { LineSegments } from "@/objects/LineSegments.ts";
import { Line } from "@/objects/Line.ts";
import { LOD } from "@/objects/LOD.ts";
import { Mesh } from "@/objects/Mesh.ts";
import { Points } from "@/objects/Points.ts";
import { Sprite } from "@/objects/Sprite.ts";

function triangleGeometry(): Geometry {
  return new Geometry().setPositions([-1, -1, 0, 1, -1, 0, 0, 1, 0]);
}

describe("scene-object parity", () => {
  it("exposes modern type-test accessors and subclass clones", () => {
    expect(new Mesh().isMesh).toBe(true);
    expect(new Group().isGroup).toBe(true);
    expect(new Bone().isBone).toBe(true);
    expect(new Line().isLine).toBe(true);
    expect(new LineLoop().clone()).toBeInstanceOf(LineLoop);
    expect(new LineSegments().clone()).toBeInstanceOf(LineSegments);
    expect(new Points().isPoints).toBe(true);
    expect(new Sprite().isSprite).toBe(true);
    expect(new LOD().isLOD).toBe(true);
  });

  it("returns mesh ray intersections with face data", () => {
    const mesh = new Mesh(triangleGeometry(), new Material());
    const intersections: ReturnType<Raycaster["intersectObject"]> = [];
    mesh.raycast(
      new Raycaster(new Vector3(0, 0, 2), new Vector3(0, 0, -1)),
      intersections,
    );
    expect(intersections).toHaveLength(1);
    expect(intersections[0]?.distance).toBeCloseTo(2);
    expect(intersections[0]?.face?.a).toBe(0);
  });

  it("computes connected and paired line distances", () => {
    const geometry = new Geometry().setPositions([
      0, 0, 0, 3, 0, 0, 3, 4, 0, 10, 0, 0,
    ]);
    const line = new Line(geometry, new LineMaterial()).computeLineDistances();
    expect(line).toBe(line);
    const lineDistance = geometry.getAttribute("lineDistance");
    expect(lineDistance).toBeDefined();
    if (lineDistance === undefined) {
      throw new Error("Expected line distance attribute");
    }
    expect(Array.from(lineDistance.array)).toEqual([
      0, 3, 7, 15.062257766723633,
    ]);

    const segmentGeometry = new Geometry().setPositions([
      0, 0, 0, 3, 0, 0, 4, 0, 0, 4, 4, 0,
    ]);
    new LineSegments(
      segmentGeometry,
      new LineMaterial(),
    ).computeLineDistances();
    const segmentLineDistance = segmentGeometry.getAttribute("lineDistance");
    expect(segmentLineDistance).toBeDefined();
    if (segmentLineDistance === undefined) {
      throw new Error("Expected segment line distance attribute");
    }
    expect(Array.from(segmentLineDistance.array)).toEqual([0, 3, 3, 7]);
  });

  it("round-trips instance transforms and colors with chainable mutators", () => {
    const mesh = new InstancedMesh(triangleGeometry(), new Material(), 2);
    const matrix = new Matrix4().makeTranslation(2, 0, 0);
    expect(mesh.setMatrixAt(1, matrix)).toBe(mesh);
    const read = new Matrix4();
    expect(mesh.getMatrixAt(1, read)).toBe(read);
    expect(read.elements[12]).toBeCloseTo(2);
    expect(mesh.setColorAt(0, new Color(0.25, 0.5, 0.75))).toBe(mesh);
    const color = new Color();
    expect(mesh.getColorAt(0, color)).toBe(color);
    expect(color.r).toBeCloseTo(0.25);
    expect(mesh.getColorAt(1, color)).toBe(color);
    expect(color.r).toBeCloseTo(1);
    mesh.computeBoundingSphere();
    expect(mesh.boundingSphere).toBeDefined();
  });

  it("raycasts points and sprites on the CPU", () => {
    const points = new Points(
      new Geometry().setPositions([0, 0, 0]),
      new Material(),
    );
    const raycaster = new Raycaster(
      new Vector3(0, 0, 2),
      new Vector3(0, 0, -1),
    );
    const pointHits: ReturnType<Raycaster["intersectObject"]> = [];
    points.raycast(raycaster, pointHits);
    expect(pointHits).toHaveLength(1);

    const camera = new PerspectiveCamera();
    camera.matrixWorld.identity();
    const sprite = new Sprite(new Material());
    const spriteHits: ReturnType<Raycaster["intersectObject"]> = [];
    sprite.raycast(raycaster, spriteHits);
    expect(spriteHits).toHaveLength(0);
    raycaster.camera = camera;
    sprite.raycast(raycaster, spriteHits);
    expect(spriteHits).toHaveLength(1);
  });

  it("LOD delegates raycasting only to the selected level", () => {
    const level = new Mesh(triangleGeometry(), new Material());
    const lod = new LOD().addLevel(level);
    const hits: ReturnType<Raycaster["intersectObject"]> = [];
    lod.raycast(
      new Raycaster(new Vector3(0, 0, 2), new Vector3(0, 0, -1)),
      hits,
    );
    expect(hits).toHaveLength(1);
    expect(hits[0]?.object).toBe(level);
  });
});
