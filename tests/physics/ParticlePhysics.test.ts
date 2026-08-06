import { describe, expect, it } from "bun:test";
import { Vector3 } from "@/math/Vector3.js";
import {
  DistanceConstraint,
  Particle,
  ParticleWorld,
} from "@/physics/ParticlePhysics.js";

describe("ParticleWorld", () => {
  it("integrates gravity, resolves distance constraints, and respects pins", () => {
    const world = new ParticleWorld({
      gravity: new Vector3(0, -10, 0),
      fixedTimeStep: 0.1,
      iterations: 4,
    });
    const anchor = world.addParticle({
      position: new Vector3(0, 1, 0),
      mass: 0,
    });
    const bob = world.addParticle({ position: new Vector3(0, 0, 0) });
    const constraint = world.addDistanceConstraint(anchor, bob);

    world.step();

    expect(anchor.position.toArray()).toEqual([0, 1, 0]);
    expect(bob.position.distanceTo(anchor.position)).toBeCloseTo(
      constraint.restLength,
    );
    expect(bob.position.y).toBeLessThan(0.1);
  });

  it("supports a ground plane without introducing NaN state", () => {
    const world = new ParticleWorld({
      gravity: new Vector3(0, -9.81, 0),
      fixedTimeStep: 0.1,
      groundY: 0,
      groundRestitution: 0,
    });
    const particle = world.addParticle({ position: new Vector3(0, 0.05, 0) });

    world.step();

    expect(particle.position.y).toBe(0);
    expect(particle.velocity.y).toBe(0);
    expect(particle.position.x).toBeFinite();
  });

  it("uses bounded fixed steps and lifecycle-safe scheduling", () => {
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
    const world = new ParticleWorld({ fixedTimeStep: 0.01 });
    world.start(host);
    expect(world.running).toBe(true);
    callbacks.get(1)?.(100);
    callbacks.get(2)?.(120);
    expect(world.lastStepCount).toBe(2);
    world.stop();
    expect(world.running).toBe(false);
    expect(cancelled).toContain(3);
  });

  it("validates ownership and constraint inputs", () => {
    const world = new ParticleWorld();
    const first = world.addParticle({ position: new Vector3() });
    const second = world.addParticle({ position: new Vector3(1, 0, 0) });
    expect(new DistanceConstraint(first, second).currentLength).toBe(1);
    expect(() => new DistanceConstraint(first, first)).toThrow(RangeError);
    expect(() =>
      world.addDistanceConstraint(
        first,
        new Particle({ position: new Vector3(1, 0, 0) }),
      ),
    ).toThrow(RangeError);
  });
});
