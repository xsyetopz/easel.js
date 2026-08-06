import { describe, expect, it } from "bun:test";
import {
  AABBShape,
  CircleShape,
  Node,
  PhysicsWorld,
  RigidBody,
  Vector3,
} from "@/index.js";

describe("PhysicsWorld", () => {
  it("advances dynamic bodies in bounded fixed steps and syncs nodes", () => {
    const node = new Node();
    node.position.set(0, 2, 0);
    const body = new RigidBody({
      node,
      shape: new AABBShape(new Vector3(0.25, 0.25, 0.25)),
    });
    const world = new PhysicsWorld({
      gravity: new Vector3(0, -10, 0),
      fixedTimeStep: 0.1,
      maxSubSteps: 2,
    });
    world.addBody(body);

    expect(world.update(0.05)).toBe(0);
    expect(body.position.y).toBe(2);
    expect(world.update(0.05)).toBe(1);
    expect(body.velocity.y).toBeCloseTo(-1);
    expect(body.position.y).toBeCloseTo(1.9);
    expect(node.position.y).toBeCloseTo(body.position.y);
    expect(world.update(1)).toBe(2);
    expect(world.lastStepCount).toBe(2);
  });

  it("resolves AABB contacts against static bodies", () => {
    const world = new PhysicsWorld({
      gravity: new Vector3(0, -10, 0),
      fixedTimeStep: 1 / 60,
    });
    const falling = new RigidBody({
      position: new Vector3(0, 0.4, 0),
      shape: new AABBShape(new Vector3(0.5, 0.5, 0.5)),
      restitution: 0,
    });
    const floor = new RigidBody({
      position: new Vector3(0, 0, 0),
      shape: new AABBShape(new Vector3(4, 0.5, 4)),
      mass: 0,
    });
    world.addBody(falling).addBody(floor).step();

    expect(falling.position.y).toBeGreaterThanOrEqual(0.5);
    expect(falling.velocity.y).toBeGreaterThanOrEqual(0);
    expect(world.contacts).toHaveLength(1);
    expect(world.contacts[0]?.bodyA).toBe(falling);
  });

  it("resolves circle contacts in the XY plane", () => {
    const world = new PhysicsWorld({
      gravity: new Vector3(),
      fixedTimeStep: 0.1,
    });
    const a = new RigidBody({
      position: new Vector3(-0.4, 0, 0),
      shape: new CircleShape(0.5),
      velocity: new Vector3(1, 0, 0),
    });
    const b = new RigidBody({
      position: new Vector3(0.4, 0, 0),
      shape: new CircleShape(0.5),
      mass: 0,
    });
    world.addBody(a).addBody(b).step();

    expect(a.position.x).toBeLessThan(-0.49);
    expect(a.velocity.x).toBeLessThanOrEqual(0);
    expect(world.contacts[0]?.normal.x).toBeGreaterThan(0);
  });

  it("supports lifecycle-safe requestAnimationFrame updates", () => {
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
      gravity: new Vector3(0, -1, 0),
      fixedTimeStep: 0.01,
    });
    const body = new RigidBody({ shape: new CircleShape(0.25) });
    world.addBody(body).start(host);
    expect(world.running).toBe(true);
    const first = callbacks.get(1);
    first?.(100);
    const second = callbacks.get(2);
    second?.(120);
    expect(world.lastStepCount).toBe(2);
    world.stop();
    expect(world.running).toBe(false);
    expect(cancelled).toContain(3);
  });
});
