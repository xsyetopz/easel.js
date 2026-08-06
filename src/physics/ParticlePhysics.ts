import { Vector3 } from "../math/Vector3.ts";

let nextParticleId = 0;

/** Construction options for a CPU particle. */
export interface ParticleOptions {
  /** Initial world-space position. */
  readonly position?: Vector3;
  /** Initial world-space velocity. */
  readonly velocity?: Vector3;
  /** Particle mass. Zero or Infinity pins the particle. */
  readonly mass?: number;
}

/** A point mass used by CPU cloth, rope, and soft-volume simulations. */
export class Particle {
  /** Stable particle identifier. */
  readonly id: number;
  /** Current world-space position. */
  readonly position: Vector3;
  /** Current world-space velocity. */
  readonly velocity: Vector3;
  /** Inverse mass; zero identifies a pinned particle. */
  readonly inverseMass: number;

  /** Creates a particle and copies mutable vector inputs. */
  constructor(options: ParticleOptions = {}) {
    this.id = nextParticleId++;
    this.position = (options.position ?? new Vector3()).clone();
    this.velocity = (options.velocity ?? new Vector3()).clone();
    if (!(isFiniteVector(this.position) && isFiniteVector(this.velocity))) {
      throw new RangeError("Particle position and velocity must be finite.");
    }
    const mass = options.mass ?? 1;
    if (!Number.isFinite(mass) && mass !== Number.POSITIVE_INFINITY) {
      throw new RangeError("Particle mass must be finite or Infinity.");
    }
    if (mass < 0) throw new RangeError("Particle mass must be non-negative.");
    this.inverseMass =
      mass === 0 || mass === Number.POSITIVE_INFINITY ? 0 : 1 / mass;
  }

  /** Whether this particle responds to gravity and constraints. */
  get dynamic(): boolean {
    return this.inverseMass > 0;
  }

  /** Applies an instantaneous impulse to this particle. */
  applyImpulse(impulse: Vector3): this {
    if (!isFiniteVector(impulse))
      throw new RangeError("Particle impulse must be finite.");
    if (this.dynamic) this.velocity.addScaledVector(impulse, this.inverseMass);
    return this;
  }
}

/** Construction options for a distance constraint. */
export interface DistanceConstraintOptions {
  /** Rest length; defaults to the current particle separation. */
  readonly restLength?: number;
  /** Positional correction fraction in the range 0..1. */
  readonly stiffness?: number;
}

/** A position-based distance constraint between two particles. */
export class DistanceConstraint {
  /** First constrained particle. */
  readonly particleA: Particle;
  /** Second constrained particle. */
  readonly particleB: Particle;
  /** Target distance between particles. */
  readonly restLength: number;
  /** Positional correction fraction. */
  readonly stiffness: number;
  /** Most recent absolute distance error. */
  lastError = 0;

  /** Creates a validated distance constraint. */
  constructor(
    particleA: Particle,
    particleB: Particle,
    options: DistanceConstraintOptions = {},
  ) {
    if (particleA === particleB)
      throw new RangeError("DistanceConstraint requires two particles.");
    this.particleA = particleA;
    this.particleB = particleB;
    const distance = particleA.position.distanceTo(particleB.position);
    const restLength = options.restLength ?? distance;
    if (!Number.isFinite(restLength) || restLength <= 0) {
      throw new RangeError(
        "DistanceConstraint restLength must be positive and finite.",
      );
    }
    this.restLength = restLength;
    this.stiffness = clamp01(options.stiffness ?? 1);
  }

  /** Current distance between constrained particles. */
  get currentLength(): number {
    return this.particleA.position.distanceTo(this.particleB.position);
  }

  /** Applies one bounded positional correction. */
  solve(): this {
    const a = this.particleA;
    const b = this.particleB;
    const delta = b.position.clone().sub(a.position);
    const distance = delta.length;
    this.lastError = Math.abs(distance - this.restLength);
    const totalInverseMass = a.inverseMass + b.inverseMass;
    if (totalInverseMass === 0 || distance <= Number.EPSILON) return this;
    const correction =
      ((distance - this.restLength) * this.stiffness) / distance;
    const weightedA = (a.inverseMass / totalInverseMass) * correction;
    const weightedB = (b.inverseMass / totalInverseMass) * correction;
    a.position.addScaledVector(delta, weightedA);
    b.position.addScaledVector(delta, -weightedB);
    return this;
  }
}

/** Browser scheduling surface required by {@link ParticleWorld.start}. */
export interface ParticleFrameHost {
  /** Schedules the next particle simulation callback. */
  requestAnimationFrame(callback: (timestamp: number) => void): number;
  /** Cancels a previously scheduled particle simulation callback. */
  cancelAnimationFrame(handle: number): void;
}

/** Construction options for a deterministic CPU particle world. */
export interface ParticleWorldOptions {
  /** Constant acceleration applied to dynamic particles. */
  readonly gravity?: Vector3;
  /** Fixed simulation step in seconds. */
  readonly fixedTimeStep?: number;
  /** Maximum fixed steps consumed by one update. */
  readonly maxSubSteps?: number;
  /** Maximum elapsed time consumed by one update. */
  readonly maxDelta?: number;
  /** Constraint iterations consumed by one fixed step. */
  readonly iterations?: number;
  /** Optional horizontal ground plane used for examples. */
  readonly groundY?: number;
  /** Vertical velocity restitution at the ground plane. */
  readonly groundRestitution?: number;
  /** Tangential velocity retention at the ground plane. */
  readonly groundFriction?: number;
  /** Per-step velocity retention before gravity integration. */
  readonly damping?: number;
}

/** Fixed-step, CPU-only particle solver for Canvas2D soft-body examples. */
export class ParticleWorld {
  /** Constant acceleration applied to dynamic particles. */
  readonly gravity: Vector3;
  /** Fixed simulation step in seconds. */
  readonly fixedTimeStep: number;
  /** Maximum fixed steps consumed by one update. */
  readonly maxSubSteps: number;
  /** Maximum elapsed time consumed by one update. */
  readonly maxDelta: number;
  /** Number of positional constraint iterations per fixed step. */
  readonly iterations: number;
  /** Optional horizontal ground plane. */
  readonly groundY: number | undefined;
  /** Vertical velocity restitution at the ground plane. */
  readonly groundRestitution: number;
  /** Tangential velocity retention at the ground plane. */
  readonly groundFriction: number;
  /** Per-step velocity retention before integration. */
  readonly damping: number;
  /** Particles currently owned by this world. */
  readonly particles: Particle[] = [];
  /** Distance constraints currently owned by this world. */
  readonly constraints: DistanceConstraint[] = [];
  /** Number of fixed steps performed by the most recent update. */
  lastStepCount = 0;

  #accumulator = 0;
  #running = false;
  #frameHandle: number | undefined;
  #previousTimestamp: number | undefined;
  #host: ParticleFrameHost | undefined;
  readonly #frame = (timestamp: number): void => {
    if (!this.#running) return;
    const previous = this.#previousTimestamp;
    this.#previousTimestamp = timestamp;
    if (
      previous !== undefined &&
      Number.isFinite(previous) &&
      Number.isFinite(timestamp)
    ) {
      this.update(Math.max(0, (timestamp - previous) / 1000));
    }
    if (this.#running)
      this.#frameHandle = this.#host?.requestAnimationFrame(this.#frame);
  };

  /** Creates a bounded fixed-step particle world. */
  constructor(options: ParticleWorldOptions = {}) {
    this.gravity = (options.gravity ?? new Vector3(0, -9.81, 0)).clone();
    if (!isFiniteVector(this.gravity))
      throw new RangeError("ParticleWorld gravity must be finite.");
    this.fixedTimeStep = positiveFinite(
      options.fixedTimeStep ?? 1 / 60,
      "fixedTimeStep",
    );
    this.maxSubSteps = positiveInteger(options.maxSubSteps ?? 8, "maxSubSteps");
    this.maxDelta = positiveFinite(
      options.maxDelta ?? this.fixedTimeStep * this.maxSubSteps,
      "maxDelta",
    );
    this.iterations = positiveInteger(options.iterations ?? 4, "iterations");
    if (options.groundY !== undefined && !Number.isFinite(options.groundY)) {
      throw new RangeError("ParticleWorld groundY must be finite.");
    }
    this.groundY = options.groundY;
    this.groundRestitution = clamp01(options.groundRestitution ?? 0.15);
    this.groundFriction = clamp01(options.groundFriction ?? 0.92);
    this.damping = clamp01(options.damping ?? 0.995);
  }

  /** Adds a particle and returns it for constraint setup. */
  addParticle(options: ParticleOptions = {}): Particle {
    const particle = new Particle(options);
    this.particles.push(particle);
    return particle;
  }

  /** Adds a distance constraint and returns it for diagnostics. */
  addDistanceConstraint(
    particleA: Particle,
    particleB: Particle,
    options: DistanceConstraintOptions = {},
  ): DistanceConstraint {
    if (
      !(
        this.particles.includes(particleA) && this.particles.includes(particleB)
      )
    )
      throw new RangeError(
        "ParticleWorld constraints require particles owned by the world.",
      );
    const constraint = new DistanceConstraint(particleA, particleB, options);
    this.constraints.push(constraint);
    return constraint;
  }

  /** Pins a particle at its current or supplied position. */
  pin(particle: Particle, position?: Vector3): this {
    this.#assertOwned(particle);
    if (position !== undefined) {
      if (!isFiniteVector(position))
        throw new RangeError("Pinned particle position must be finite.");
      particle.position.copy(position);
    }
    particle.velocity.set(0, 0, 0);
    return this;
  }

  /** Advances exactly one fixed simulation step. */
  step(deltaSeconds: number = this.fixedTimeStep): this {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      throw new RangeError(
        "ParticleWorld.step deltaSeconds must be positive and finite.",
      );
    }
    const previousPositions = this.particles.map((particle) =>
      particle.position.clone(),
    );
    for (const particle of this.particles) {
      if (!particle.dynamic) continue;
      particle.velocity.multiplyScalar(this.damping);
      particle.velocity.addScaledVector(this.gravity, deltaSeconds);
      particle.position.addScaledVector(particle.velocity, deltaSeconds);
    }
    for (let iteration = 0; iteration < this.iterations; iteration++) {
      for (const constraint of this.constraints) constraint.solve();
      this.#solveGround();
    }
    for (let index = 0; index < this.particles.length; index++) {
      const particle = this.particles[index];
      const previousPosition = previousPositions[index];
      if (!particle || !previousPosition) continue;
      if (!particle.dynamic) {
        particle.velocity.set(0, 0, 0);
        continue;
      }
      particle.velocity
        .copy(particle.position)
        .sub(previousPosition)
        .divideScalar(deltaSeconds);
    }
    this.#solveGround();
    return this;
  }

  /** Accumulates elapsed time and consumes bounded fixed simulation steps. */
  update(deltaSeconds: number): number {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError(
        "ParticleWorld.update deltaSeconds must be finite and non-negative.",
      );
    }
    this.#accumulator += Math.min(deltaSeconds, this.maxDelta);
    let steps = 0;
    while (
      this.#accumulator >= this.fixedTimeStep &&
      steps < this.maxSubSteps
    ) {
      this.step();
      this.#accumulator -= this.fixedTimeStep;
      steps++;
    }
    if (steps === this.maxSubSteps && this.#accumulator >= this.fixedTimeStep)
      this.#accumulator = this.fixedTimeStep * 0.5;
    this.lastStepCount = steps;
    return steps;
  }

  /** Starts a requestAnimationFrame loop; safe to call repeatedly. */
  start(
    host: ParticleFrameHost = globalThis as unknown as ParticleFrameHost,
  ): this {
    if (
      typeof host.requestAnimationFrame !== "function" ||
      typeof host.cancelAnimationFrame !== "function"
    ) {
      throw new TypeError(
        "ParticleWorld.start requires requestAnimationFrame and cancelAnimationFrame.",
      );
    }
    this.stop();
    this.#host = host;
    this.#running = true;
    this.#previousTimestamp = undefined;
    this.#frameHandle = host.requestAnimationFrame(this.#frame);
    return this;
  }

  /** Stops the browser loop and cancels its pending frame. */
  stop(): this {
    this.#running = false;
    if (this.#frameHandle !== undefined)
      this.#host?.cancelAnimationFrame(this.#frameHandle);
    this.#frameHandle = undefined;
    this.#previousTimestamp = undefined;
    return this;
  }

  /** Whether this world currently owns an animation-frame loop. */
  get running(): boolean {
    return this.#running;
  }

  /** Removes all particles and constraints and resets accumulated time. */
  clear(): this {
    this.particles.length = 0;
    this.constraints.length = 0;
    this.#accumulator = 0;
    this.lastStepCount = 0;
    return this;
  }

  /** Stops scheduling and releases all particle state. */
  dispose(): void {
    this.stop();
    this.clear();
  }

  #assertOwned(particle: Particle): void {
    if (!this.particles.includes(particle))
      throw new RangeError(
        "ParticleWorld operation requires an owned particle.",
      );
  }

  #solveGround(): void {
    const groundY = this.groundY;
    if (groundY === undefined) return;
    for (const particle of this.particles) {
      if (!particle.dynamic || particle.position.y > groundY) continue;
      if (particle.position.y < groundY) particle.position.y = groundY;
      if (particle.velocity.y < 0) {
        particle.velocity.y *= -this.groundRestitution;
        particle.velocity.x *= this.groundFriction;
        particle.velocity.z *= this.groundFriction;
      }
    }
  }
}

function isFiniteVector(value: Vector3): boolean {
  return (
    Number.isFinite(value.x) &&
    Number.isFinite(value.y) &&
    Number.isFinite(value.z)
  );
}

function positiveFinite(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0)
    throw new RangeError(`ParticleWorld ${name} must be positive and finite.`);
  return value;
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new RangeError(`ParticleWorld ${name} must be a positive integer.`);
  return value;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value))
    throw new RangeError("ParticleWorld coefficient must be finite.");
  return Math.max(0, Math.min(1, value));
}
