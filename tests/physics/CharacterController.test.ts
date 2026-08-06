import { describe, expect, it } from "bun:test";
import { Box3 } from "@/math/Box3.js";
import { Capsule } from "@/math/Capsule.js";
import { Triangle } from "@/math/Triangle.js";
import { Vector3 } from "@/math/Vector3.js";
import { CharacterController } from "@/physics/CharacterController.js";
import { Octree } from "@/physics/Octree.js";

function floorOctree(): Octree {
  return new Octree().addBox(
    new Box3(new Vector3(-10, -0.5, -10), new Vector3(10, 0, 10)),
  );
}

function restingCapsule(): Capsule {
  return new Capsule(new Vector3(0, 0.35, 0), new Vector3(0, 1.65, 0), 0.35);
}

describe("CharacterController", () => {
  it("keeps a grounded capsule stable with fixed-step gravity", () => {
    const controller = new CharacterController({
      octree: floorOctree(),
      capsule: restingCapsule(),
      gravity: new Vector3(0, -10, 0),
      fixedTimeStep: 0.1,
    });

    expect(controller.grounded).toBe(true);
    expect(controller.update(0.05)).toBe(0);
    expect(controller.update(0.05)).toBe(1);
    expect(controller.position.y).toBeCloseTo(1);
    expect(controller.velocity.y).toBeCloseTo(0);
    expect(controller.grounded).toBe(true);
  });

  it("applies a configurable jump and resolves a triangle floor", () => {
    const octree = new Octree().addTriangle(
      new Triangle(
        new Vector3(-10, 0, -10),
        new Vector3(10, 0, -10),
        new Vector3(-10, 0, 10),
      ),
    );
    const controller = new CharacterController({
      octree,
      capsule: restingCapsule(),
      gravity: new Vector3(0, -10, 0),
      jumpSpeed: 4,
      fixedTimeStep: 0.1,
    });

    expect(controller.grounded).toBe(true);
    expect(controller.jump()).toBe(true);
    expect(controller.grounded).toBe(false);
    controller.step();
    expect(controller.position.y).toBeGreaterThan(1);
    expect(controller.velocity.y).toBeCloseTo(3);
    for (let index = 0; index < 20; index++) controller.step();
    expect(controller.grounded).toBe(true);
    expect(controller.position.y).toBeCloseTo(1, 4);
  });

  it("projects movement onto a walkable floor and clips a wall", () => {
    const octree = floorOctree()
      .addTriangle(
        new Triangle(
          new Vector3(1, 0, -2),
          new Vector3(1, 3, -2),
          new Vector3(1, 0, 2),
        ),
      )
      .addTriangle(
        new Triangle(
          new Vector3(1, 3, -2),
          new Vector3(1, 3, 2),
          new Vector3(1, 0, 2),
        ),
      );
    const controller = new CharacterController({
      octree,
      capsule: restingCapsule(),
      gravity: new Vector3(0, -10, 0),
      fixedTimeStep: 0.1,
    });
    controller.setMovement(new Vector3(10, 4, 0));
    expect(controller.movement.y).toBe(0);
    controller.update(0.2);

    expect(controller.position.x).toBeLessThan(1);
    expect(controller.position.y).toBeCloseTo(1, 4);
    expect(controller.grounded).toBe(true);
  });

  it("supports lifecycle-safe animation updates and disposal", () => {
    let nextHandle = 0;
    const callbacks = new Map<number, (timestamp: number) => void>();
    const cancelled: number[] = [];
    const host = {
      requestAnimationFrame(callback: (timestamp: number) => void): number {
        const handle = ++nextHandle;
        callbacks.set(handle, callback);
        return handle;
      },
      cancelAnimationFrame(handle: number): void {
        cancelled.push(handle);
        callbacks.delete(handle);
      },
    };
    const controller = new CharacterController({
      octree: floorOctree(),
      capsule: restingCapsule(),
      gravity: new Vector3(),
      fixedTimeStep: 0.01,
    });
    controller.start(host);
    callbacks.get(1)?.(100);
    callbacks.get(2)?.(120);
    expect(controller.lastStepCount).toBe(2);
    controller.dispose();
    expect(controller.running).toBe(false);
    expect(cancelled).toContain(3);
    expect(controller.update(1)).toBe(0);
  });

  it("rejects invalid controller settings", () => {
    expect(
      () =>
        new CharacterController({
          octree: floorOctree(),
          maxSlopeAngle: Math.PI,
        }),
    ).toThrow(RangeError);
    expect(
      () =>
        new CharacterController({
          octree: floorOctree(),
          fixedTimeStep: 0,
        }),
    ).toThrow(RangeError);
  });
});
