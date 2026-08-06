import { describe, expect, it } from "bun:test";
import { Vector3 } from "@/math/Vector3.js";
import {
  AABBShape,
  CircleShape,
  PhysicsWorld,
  RigidBody,
  SphereShape,
} from "@/physics/PhysicsWorld.js";

describe("SphereShape", () => {
  it("validates a positive finite radius and clones independently", () => {
    expect(() => new SphereShape(0)).toThrow(RangeError);
    expect(() => new SphereShape(Number.NaN)).toThrow(RangeError);
    const shape = new SphereShape(0.25);
    expect(shape.type).toBe("sphere");
    expect(shape.clone()).not.toBe(shape);
    expect(shape.clone().radius).toBe(0.25);
  });
});

describe("Sphere collisions", () => {
  it("resolves a sphere against a three-dimensional floor AABB", () => {
    const world = new PhysicsWorld({ gravity: new Vector3() });
    const sphere = new RigidBody({
      position: new Vector3(0, 0.4, 0),
      shape: new SphereShape(0.5),
    });
    const floor = new RigidBody({
      position: new Vector3(0, 0, 0),
      shape: new AABBShape(new Vector3(4, 0.25, 4)),
      mass: 0,
    });
    world.addBody(sphere).addBody(floor).step();

    expect(sphere.position.y).toBeCloseTo(0.75);
    expect(world.contacts).toHaveLength(1);
    expect(world.contacts[0]?.normal.y).toBeLessThan(0);
  });

  it("pushes a sphere out when its center is on an AABB boundary", () => {
    const world = new PhysicsWorld({ gravity: new Vector3() });
    const sphere = new RigidBody({
      position: new Vector3(0, 0, 0),
      shape: new SphereShape(0.5),
    });
    const floor = new RigidBody({
      position: new Vector3(0, -0.25, 0),
      shape: new AABBShape(new Vector3(4, 0.25, 4)),
      mass: 0,
    });
    world.addBody(sphere).addBody(floor).step();

    expect(sphere.position.y).toBeCloseTo(0.5);
  });

  it("resolves sphere-to-sphere overlap in all three axes", () => {
    const world = new PhysicsWorld({ gravity: new Vector3() });
    const first = new RigidBody({
      position: new Vector3(0, 0, 0),
      shape: new SphereShape(1),
    });
    const second = new RigidBody({
      position: new Vector3(1.5, 1, 0),
      shape: new SphereShape(1),
    });
    world.addBody(first).addBody(second).step();

    expect(world.contacts).toHaveLength(1);
    expect(first.position.distanceTo(second.position)).toBeCloseTo(2);
    expect(world.contacts[0]?.normal.x).toBeGreaterThan(0);
    expect(world.contacts[0]?.normal.y).toBeGreaterThan(0);
  });

  it("keeps the AABB-sphere dispatch normal directed from A to B", () => {
    const world = new PhysicsWorld({ gravity: new Vector3() });
    const floor = new RigidBody({
      position: new Vector3(0, 0, 0),
      shape: new AABBShape(new Vector3(4, 0.25, 4)),
      mass: 0,
    });
    const sphere = new RigidBody({
      position: new Vector3(0, 0.4, 0),
      shape: new SphereShape(0.5),
    });
    world.addBody(floor).addBody(sphere).step();

    expect(world.contacts[0]?.bodyA).toBe(floor);
    expect(world.contacts[0]?.bodyB).toBe(sphere);
    expect(world.contacts[0]?.normal.y).toBeGreaterThan(0);
  });

  it("does not dispatch unsupported circle-sphere pairs as AABBs", () => {
    const world = new PhysicsWorld({ gravity: new Vector3() });
    world.addBody(
      new RigidBody({
        shape: new CircleShape(0.5),
        position: new Vector3(),
      }),
    );
    world.addBody(
      new RigidBody({
        shape: new SphereShape(0.5),
        position: new Vector3(),
      }),
    );

    expect(() => world.step()).not.toThrow();
    expect(world.contacts).toHaveLength(0);
  });
});
