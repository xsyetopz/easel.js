import { describe, expect, it } from "bun:test";
import { Node } from "@/core/Node.js";
import { type Intersection, Raycaster } from "@/core/Raycaster.js";
import { Geometry } from "@/geometry/Geometry.js";
import { Material } from "@/materials/Material.js";
import { Vector3 } from "@/math/Vector3.js";
import { Line } from "@/objects/Line.js";
import { LOD } from "@/objects/LOD.js";
import { Mesh } from "@/objects/Mesh.js";
import { Points } from "@/objects/Points.js";

describe("Raycaster ray setup", () => {
  it("constructs with default ray", () => {
    const rc = new Raycaster();
    expect(rc.ray).toBeDefined();
    expect(rc.near).toBe(0);
    expect(rc.far).toBe(Number.POSITIVE_INFINITY);
    expect(rc.camera).toBeUndefined();
  });

  it("constructs with provided origin and direction", () => {
    const origin = new Vector3(1, 2, 3);
    const direction = new Vector3(0, 0, -1);
    const rc = new Raycaster(origin, direction);
    expect(rc.ray.origin.x).toBeCloseTo(1);
    expect(rc.ray.origin.z).toBeCloseTo(3);
    expect(rc.ray.direction.z).toBeCloseTo(-1);
  });

  it("set() updates origin and direction on ray", () => {
    const rc = new Raycaster();
    const origin = new Vector3(5, 0, 0);
    const direction = new Vector3(1, 0, 0);
    rc.set(origin, direction);
    expect(rc.ray.origin.x).toBeCloseTo(5);
    expect(rc.ray.direction.x).toBeCloseTo(1);
  });

  it("set() returns this (chainable)", () => {
    const rc = new Raycaster();
    const ret = rc.set(new Vector3(), new Vector3(0, 0, -1));
    expect(ret).toBe(rc);
  });
});

describe("Raycaster intersections", () => {
  it("intersectObject returns empty array for object with no geometry", () => {
    const rc = new Raycaster(new Vector3(0, 0, 5), new Vector3(0, 0, -1));
    const obj = {
      visible: true,
      type: "Mesh",
      layers: rc.layers,
      children: [],
      matrixWorld: {
        elements: new Float32Array([
          1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
        ]),
      },
    };
    const result = rc.intersectObject(
      obj as unknown as Parameters<typeof rc.intersectObject>[0],
      false,
    );
    expect(result).toEqual([]);
  });
});

describe("Raycaster object delegation", () => {
  it("delegates geometry traversal to the object's raycast method", () => {
    const raycaster = new Raycaster();
    let calls = 0;
    const object = {
      visible: true,
      layers: raycaster.layers,
      children: [],
      raycast(_caster: Raycaster, intersections: Intersection[]): void {
        calls += 1;
        intersections.push({
          distance: 2,
          point: new Vector3(),
          object,
        });
      },
    };

    const result = raycaster.intersectObject(object);

    expect(calls).toBe(1);
    expect(result).toHaveLength(1);
    expect(result[0]?.object).toBe(object);
  });
});

describe("Raycaster recursive intersections", () => {
  it("recurses into child meshes by default and permits an explicit shallow query", () => {
    const geometry = new Geometry().setPositions([
      -1, -1, 0, 1, -1, 0, 0, 1, 0,
    ]);
    const parent = new Node();
    const child = new Mesh(geometry);
    parent.add(child);
    parent.updateMatrixWorld(false, true, true);
    const raycaster = new Raycaster(
      new Vector3(0, 0, 1),
      new Vector3(0, 0, -1),
    );

    expect(raycaster.intersectObject(parent as never)).toHaveLength(1);
    expect(raycaster.intersectObject(parent as never, false)).toHaveLength(0);
  });

  it("Line intersection threshold", () => {
    const raycaster = new Raycaster(
      new Vector3(0, 0, 0),
      new Vector3(0, 0, -1),
      1,
      100,
    );
    const geometry = new Geometry().setPositions([-2, -10, -5, -2, 10, -5]);
    const line = new Line(geometry);
    line.updateMatrixWorld();

    raycaster.lineThreshold = 1.999;
    expect(raycaster.intersectObject(line)).toHaveLength(0);
    raycaster.lineThreshold = 2.001;
    expect(raycaster.intersectObject(line)).toHaveLength(1);
  });
});

describe("Raycaster point and LOD intersections", () => {
  it("Points intersection threshold", () => {
    const raycaster = new Raycaster(
      new Vector3(0, 0, 0),
      new Vector3(0, 0, -1),
      1,
      100,
    );
    const geometry = new Geometry().setPositions([-2, 0, -5]);
    const points = new Points(geometry);
    points.updateMatrixWorld();

    raycaster.pointsThreshold = 1.999;
    expect(raycaster.intersectObject(points)).toHaveLength(0);
    raycaster.pointsThreshold = 2.001;
    expect(raycaster.intersectObject(points)).toHaveLength(1);
  });

  it("delegates LOD once without traversing its implementation children", () => {
    const level = new Mesh(
      new Geometry().setPositions([-1, -1, 0, 1, -1, 0, 0, 1, 0]),
      new Material(),
    );
    const lod = new LOD().addLevel(level);
    lod.updateMatrixWorld(false, true, true);
    const raycaster = new Raycaster(
      new Vector3(0, 0, 2),
      new Vector3(0, 0, -1),
    );

    const result = raycaster.intersectObject(lod);

    expect(result).toHaveLength(1);
    expect(result[0]?.object).toBe(level);
  });

  it("uses independent line and point thresholds", () => {
    const raycaster = new Raycaster();
    raycaster.lineThreshold = 2;
    expect(raycaster.lineThreshold).toBe(2);
    expect(raycaster.pointsThreshold).toBe(1);
  });
});
