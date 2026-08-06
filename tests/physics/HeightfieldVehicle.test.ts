import { describe, expect, it } from "bun:test";
import {
  AABBShape,
  HeightfieldShape,
  PhysicsWorld,
  RigidBody,
  SphereShape,
  Vector3,
  VehicleController,
} from "@/index.js";

describe("HeightfieldShape", () => {
  it("samples a centered bilinear field and clones its data", () => {
    const shape = new HeightfieldShape({
      width: 2,
      depth: 2,
      sizeX: 2,
      sizeZ: 2,
      heights: [0, 2, 2, 4],
    });
    expect(shape.getHeightAt(-1, -1)).toBe(0);
    expect(shape.getHeightAt(0, 0)).toBeCloseTo(2);
    expect(shape.getHeightAt(2, 0)).toBeUndefined();
    const clone = shape.clone();
    expect(clone).not.toBe(shape);
    expect(clone.heights).not.toBe(shape.heights);
    expect(clone.getNormalAt(0, 0).y).toBeGreaterThan(0);
  });

  it("resolves a sphere against a static heightfield", () => {
    const world = new PhysicsWorld({ gravity: new Vector3(0, -9.81, 0) });
    const field = new RigidBody({
      shape: new HeightfieldShape({
        width: 3,
        depth: 3,
        sizeX: 4,
        sizeZ: 4,
        heights: [0, 0, 0, 0, 0.5, 0, 0, 0, 0],
      }),
      mass: 0,
    });
    const sphere = new RigidBody({
      position: new Vector3(0, 0.25, 0),
      shape: new SphereShape(0.5),
    });
    world.addBody(field).addBody(sphere);
    world.step();
    expect(sphere.position.y).toBeGreaterThan(0.9);
    expect(world.contacts).toHaveLength(1);
  });
});

describe("VehicleController", () => {
  it("drives a chassis, exposes wheel state, and brakes deterministically", () => {
    const world = new PhysicsWorld({ gravity: new Vector3(0, -9.81, 0) });
    const ground = new RigidBody({
      position: new Vector3(0, -0.25, 0),
      shape: new AABBShape(new Vector3(10, 0.25, 10)),
      mass: 0,
    });
    const chassis = new RigidBody({
      position: new Vector3(0, 1, 0),
      shape: new AABBShape(new Vector3(1, 0.5, 2)),
      mass: 10,
    });
    world.addBody(ground).addBody(chassis);
    const controller = new VehicleController({ chassis, world });
    const wheel = controller.addWheel(new Vector3(-1, -0.25, -1.5));
    controller.addWheel(new Vector3(1, -0.25, -1.5));
    controller.setWheelSteering(wheel, 0.2).setInput({ forward: 1 });
    controller.update(1 / 60);
    expect(chassis.velocity.z).toBeLessThan(0);
    expect(controller.wheelSuspensionLength(wheel)).toBeGreaterThanOrEqual(0);
    expect(controller.wheelWorldPosition(wheel).x).toBeCloseTo(-1);
    const speed = Math.abs(chassis.velocity.z);
    controller.update(1 / 60, { brake: 1 });
    expect(Math.abs(chassis.velocity.z)).toBeLessThan(speed);
    controller.reset();
    expect(chassis.velocity.length).toBe(0);
    controller.dispose();
    expect(controller.wheels).toHaveLength(0);
  });
});
