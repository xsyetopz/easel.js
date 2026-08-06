import { describe, expect, it } from "bun:test";
import {
  AABBShape,
  DistanceJoint,
  PhysicsJoints,
  PhysicsWorld,
  RevoluteJoint,
  RigidBody,
  SphericalJoint,
  SpringJoint,
  Vector3,
} from "@/index.js";

function body(position: Vector3, mass = 1): RigidBody {
  return new RigidBody({
    position,
    shape: new AABBShape(new Vector3(0.1, 0.1, 0.1)),
    mass,
  });
}

describe("PhysicsJoints", () => {
  it("holds a dynamic anchor at a deterministic distance from a static body", () => {
    const world = new PhysicsWorld({
      gravity: new Vector3(),
      fixedTimeStep: 0.1,
    });
    const anchor = body(new Vector3(), 0);
    const bob = body(new Vector3(2, 0, 0));
    world.addBody(anchor).addBody(bob);
    const joints = new PhysicsJoints({ world, iterations: 2 });
    const joint = new DistanceJoint({
      bodyA: anchor,
      bodyB: bob,
      length: 1,
    });
    joints.addJoint(joint).step();

    expect(bob.position.x).toBeCloseTo(1);
    expect(joint.currentLength).toBeCloseTo(1);
    expect(joint.lastError).toBeCloseTo(0);
  });

  it("coincides spherical anchors while preserving body ownership", () => {
    const world = new PhysicsWorld({ gravity: new Vector3() });
    const anchor = body(new Vector3(), 0);
    const bob = body(new Vector3(2, 3, 4));
    world.addBody(anchor).addBody(bob);
    const joints = new PhysicsJoints({ world, iterations: 1 });
    const joint = new SphericalJoint({
      bodyA: anchor,
      bodyB: bob,
      anchorB: new Vector3(-1, -1, -2),
    });
    joints.add(joint).step();

    expect(joint.getAnchorA().distanceTo(joint.getAnchorB())).toBeCloseTo(0);
    expect(bob.position.toArray()).toEqual([1, 1, 2]);
  });

  it("revolute correction removes only motion perpendicular to its axis", () => {
    const world = new PhysicsWorld({ gravity: new Vector3() });
    const anchor = body(new Vector3(), 0);
    const bob = body(new Vector3(2, 3, 4));
    world.addBody(anchor).addBody(bob);
    const joints = new PhysicsJoints({ world, iterations: 1 });
    const joint = new RevoluteJoint({
      bodyA: anchor,
      bodyB: bob,
      axis: new Vector3(0, 0, 1),
    });
    joints.addJoint(joint).step();

    expect(bob.position.x).toBeCloseTo(0);
    expect(bob.position.y).toBeCloseTo(0);
    expect(bob.position.z).toBeCloseTo(4);
    expect(joint.lastError).toBeCloseTo(0);
  });

  it("applies a bounded spring impulse without changing positions directly", () => {
    const world = new PhysicsWorld({ gravity: new Vector3() });
    const anchor = body(new Vector3(), 0);
    const bob = body(new Vector3(2, 0, 0));
    world.addBody(anchor).addBody(bob);
    const joints = new PhysicsJoints({ world, iterations: 4 });
    const spring = new SpringJoint({
      bodyA: anchor,
      bodyB: bob,
      length: 1,
      stiffness: 10,
      damping: 0,
      maxForce: 5,
    });
    joints.addJoint(spring).step(0.1);

    expect(bob.position.x).toBeCloseTo(2);
    expect(bob.velocity.x).toBeCloseTo(-0.5);
    expect(spring.lastForce).toBeCloseTo(5);
  });

  it("uses bounded fixed steps and has lifecycle-safe scheduling", () => {
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
    const world = new PhysicsWorld({
      gravity: new Vector3(),
      fixedTimeStep: 0.01,
    });
    const joints = new PhysicsJoints({ world });
    joints.start(host);
    expect(joints.running).toBe(true);
    callbacks.get(1)?.(100);
    callbacks.get(2)?.(120);
    expect(joints.lastStepCount).toBe(2);
    joints.stop();
    expect(joints.running).toBe(false);
    expect(cancelled).toContain(3);
  });

  it("rejects invalid body pairs and hinge axes", () => {
    const first = body(new Vector3());
    const second = body(new Vector3(1, 0, 0));
    expect(() => new DistanceJoint({ bodyA: first, bodyB: first })).toThrow(
      RangeError,
    );
    expect(
      () =>
        new RevoluteJoint({
          bodyA: first,
          bodyB: second,
          axis: new Vector3(),
        }),
    ).toThrow(RangeError);
  });
});
