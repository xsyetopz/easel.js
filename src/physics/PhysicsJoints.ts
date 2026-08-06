import { Vector3 } from "../math/Vector3.ts";
import {
  type PhysicsFrameHost,
  PhysicsWorld,
  type PhysicsWorldOptions,
  type RigidBody,
} from "./PhysicsWorld.ts";

/** Joint kinds implemented by the deterministic CPU constraint solver. */
export type PhysicsJointType = "distance" | "revolute" | "spring" | "spherical";

/** Shared body and anchor options for a CPU physics joint. */
export interface PhysicsJointOptions {
  /** First body connected by the joint. */
  bodyA: RigidBody;
  /** Second body connected by the joint. */
  bodyB: RigidBody;
  /** Anchor in body A coordinates. Rigid bodies currently have no rotation state. */
  anchorA?: Vector3;
  /** Anchor in body B coordinates. Rigid bodies currently have no rotation state. */
  anchorB?: Vector3;
  /** Constraint correction strength or spring constant, depending on the joint. */
  stiffness?: number;
  /** Velocity damping used to reduce constraint oscillation. */
  damping?: number;
}

/** Options for a distance constraint with a fixed anchor separation. */
export interface DistanceJointOptions extends PhysicsJointOptions {
  /** Target anchor separation. Defaults to the initial separation. */
  length?: number;
  /** Alias for `length`, matching common physics-engine terminology. */
  restLength?: number;
}

/** Options for a revolute hinge constraint. */
export interface RevoluteJointOptions extends PhysicsJointOptions {
  /** World-space axis around which relative rotation remains unconstrained. */
  axis?: Vector3;
}

/** Options for a spherical ball-and-socket constraint. */
export interface SphericalJointOptions extends PhysicsJointOptions {}

/** Options for a Hooke-style spring constraint. */
export interface SpringJointOptions extends PhysicsJointOptions {
  /** Target anchor separation. Defaults to the initial separation. */
  length?: number;
  /** Alias for `length`, matching common physics-engine terminology. */
  restLength?: number;
  /** Optional absolute force limit. */
  maxForce?: number;
}

/** Configuration for a CPU joint world wrapper. */
export interface PhysicsJointsOptions {
  /** Existing fixed-step world to drive. A new world is created when omitted. */
  world?: PhysicsWorld;
  /** Constant acceleration used when the wrapper creates its world. */
  gravity?: Vector3;
  /** Fixed simulation step in seconds. Defaults to the world's step. */
  fixedTimeStep?: number;
  /** Maximum fixed steps consumed by one `update` call. */
  maxSubSteps?: number;
  /** Maximum real-time delta consumed by one `update` call. */
  maxDelta?: number;
  /** Number of positional constraint iterations per fixed step. */
  iterations?: number;
}

interface JointDefaults {
  stiffness: number;
  damping: number;
}

/** Base class for anchor-based CPU constraints.
 *
 * The solver intentionally models translation only because `RigidBody` has no
 * angular state. Revolute constraints therefore preserve motion along a fixed
 * world axis but do not simulate angular limits, torques, or inertia.
 */
export abstract class PhysicsJoint {
  /** Joint kind used by the solver and diagnostics. */
  abstract readonly type: PhysicsJointType;
  /** First body connected by this joint. */
  readonly bodyA: RigidBody;
  /** Second body connected by this joint. */
  readonly bodyB: RigidBody;
  /** Local anchor on body A. */
  readonly anchorA: Vector3;
  /** Local anchor on body B. */
  readonly anchorB: Vector3;
  /** Configured correction strength or spring constant. */
  readonly stiffness: number;
  /** Configured velocity damping. */
  readonly damping: number;
  /** Enables or disables solving without removing the joint. */
  enabled = true;
  /** Absolute constraint error measured during the latest solve. */
  lastError = 0;

  /** Creates a validated joint shared by concrete constraint types. */
  protected constructor(options: PhysicsJointOptions, defaults: JointDefaults) {
    if (!(options.bodyA && options.bodyB))
      throw new TypeError("PhysicsJoint requires two rigid bodies.");
    if (options.bodyA === options.bodyB)
      throw new RangeError("PhysicsJoint bodies must be different.");
    this.bodyA = options.bodyA;
    this.bodyB = options.bodyB;
    this.anchorA = finiteVector(options.anchorA ?? new Vector3(), "anchorA");
    this.anchorB = finiteVector(options.anchorB ?? new Vector3(), "anchorB");
    this.stiffness = nonNegativeFinite(
      options.stiffness ?? defaults.stiffness,
      "stiffness",
    );
    this.damping = nonNegativeFinite(
      options.damping ?? defaults.damping,
      "damping",
    );
  }

  /** Solves this constraint for one fixed-step interval. */
  abstract solve(deltaSeconds: number): this;

  /** Computes the world-space position of anchor A. */
  getAnchorA(target: Vector3 = new Vector3()): Vector3 {
    return target.copy(this.bodyA.position).add(this.anchorA);
  }

  /** Computes the world-space position of anchor B. */
  getAnchorB(target: Vector3 = new Vector3()): Vector3 {
    return target.copy(this.bodyB.position).add(this.anchorB);
  }

  /** Returns the current world-space distance between the two anchors. */
  get currentLength(): number {
    return this.getAnchorA().distanceTo(this.getAnchorB());
  }

  /** Returns the signed anchor delta directed from A toward B. */
  getAnchorDelta(target: Vector3 = new Vector3()): Vector3 {
    return target.copy(this.getAnchorB()).sub(this.getAnchorA());
  }
}

/** Keeps two body anchors at a fixed distance with positional correction. */
export class DistanceJoint extends PhysicsJoint {
  /** Joint kind used by the solver and diagnostics. */
  readonly type = "distance" as const;
  /** Target anchor separation in world units. */
  restLength: number;

  /** Creates a distance constraint from the initial or supplied separation. */
  constructor(options: DistanceJointOptions) {
    super(options, { stiffness: 1, damping: 0.2 });
    const initialLength = this.currentLength;
    this.restLength = nonNegativeFinite(
      options.restLength ?? options.length ?? initialLength,
      "restLength",
    );
  }

  /** Alias for `restLength` retained for readable constraint setup. */
  get length(): number {
    return this.restLength;
  }

  /** Replaces the target anchor separation. */
  set length(value: number) {
    this.restLength = nonNegativeFinite(value, "length");
  }

  /** Applies one deterministic positional and velocity correction. */
  solve(_deltaSeconds: number): this {
    const delta = this.getAnchorDelta();
    const currentLength = delta.length;
    const direction =
      currentLength > Number.EPSILON
        ? delta.multiplyScalar(1 / currentLength)
        : new Vector3(1, 0, 0);
    const error = currentLength - this.restLength;
    applyPositionCorrection(
      this.bodyA,
      this.bodyB,
      direction.clone().multiplyScalar(error),
      Math.min(1, this.stiffness),
    );
    applyVelocityDamping(
      this.bodyA,
      this.bodyB,
      direction,
      Math.min(1, this.damping),
    );
    this.lastError = Math.abs(this.currentLength - this.restLength);
    return this;
  }
}

/** Keeps two anchors coincident while allowing translation along one axis. */
export class RevoluteJoint extends PhysicsJoint {
  /** Joint kind used by the solver and diagnostics. */
  readonly type = "revolute" as const;
  /** Fixed world-space hinge axis. */
  readonly axis: Vector3;

  /** Creates a translational hinge approximation around a fixed axis. */
  constructor(options: RevoluteJointOptions) {
    super(options, { stiffness: 1, damping: 0.2 });
    const axis = finiteVector(options.axis ?? new Vector3(0, 1, 0), "axis");
    if (axis.lengthSq <= Number.EPSILON)
      throw new RangeError("RevoluteJoint axis must be non-zero.");
    this.axis = axis.normalize();
  }

  /** Applies one correction in the plane perpendicular to the hinge axis. */
  solve(_deltaSeconds: number): this {
    const delta = this.getAnchorDelta();
    const axial = this.axis.clone().multiplyScalar(delta.dot(this.axis));
    const error = delta.sub(axial);
    this.lastError = error.length;
    applyPositionCorrection(
      this.bodyA,
      this.bodyB,
      error,
      Math.min(1, this.stiffness),
    );
    const relativeVelocity = this.bodyB.velocity
      .clone()
      .sub(this.bodyA.velocity);
    const axialVelocity = this.axis
      .clone()
      .multiplyScalar(relativeVelocity.dot(this.axis));
    applyVelocityDamping(
      this.bodyA,
      this.bodyB,
      relativeVelocity.sub(axialVelocity),
      Math.min(1, this.damping),
    );
    const corrected = this.getAnchorDelta();
    this.lastError = corrected.sub(
      this.axis.clone().multiplyScalar(corrected.dot(this.axis)),
    ).length;
    return this;
  }
}

/** Keeps two body anchors coincident on all axes, matching a ball joint. */
export class SphericalJoint extends PhysicsJoint {
  /** Joint kind used by the solver and diagnostics. */
  readonly type = "spherical" as const;

  /** Creates a CPU ball-and-socket positional constraint. */
  constructor(options: SphericalJointOptions) {
    super(options, { stiffness: 1, damping: 0.2 });
  }

  /** Applies one full three-axis anchor correction. */
  solve(_deltaSeconds: number): this {
    const error = this.getAnchorDelta();
    this.lastError = error.length;
    applyPositionCorrection(
      this.bodyA,
      this.bodyB,
      error,
      Math.min(1, this.stiffness),
    );
    const dampingDirection =
      error.length > Number.EPSILON
        ? error
        : this.bodyB.velocity.clone().sub(this.bodyA.velocity);
    applyVelocityDamping(
      this.bodyA,
      this.bodyB,
      dampingDirection,
      Math.min(1, this.damping),
    );
    this.lastError = this.getAnchorDelta().length;
    return this;
  }
}

/** Applies a damped Hooke force between two body anchors. */
export class SpringJoint extends PhysicsJoint {
  /** Joint kind used by the solver and diagnostics. */
  readonly type = "spring" as const;
  /** Target anchor separation in world units. */
  restLength: number;
  /** Optional absolute force limit. */
  readonly maxForce: number | undefined;
  /** Signed force magnitude from A toward B in the latest solve. */
  lastForce = 0;

  /** Creates a deterministic spring constraint. */
  constructor(options: SpringJointOptions) {
    super(options, { stiffness: 80, damping: 8 });
    const initialLength = this.currentLength;
    this.restLength = nonNegativeFinite(
      options.restLength ?? options.length ?? initialLength,
      "restLength",
    );
    this.maxForce =
      options.maxForce === undefined
        ? undefined
        : nonNegativeFinite(options.maxForce, "maxForce");
  }

  /** Alias for `restLength` retained for readable constraint setup. */
  get length(): number {
    return this.restLength;
  }

  /** Replaces the target anchor separation. */
  set length(value: number) {
    this.restLength = nonNegativeFinite(value, "length");
  }

  /** Applies the spring force and records its current error and force. */
  solve(deltaSeconds: number = 1 / 60): this {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0)
      throw new RangeError(
        "SpringJoint deltaSeconds must be positive and finite.",
      );
    const delta = this.getAnchorDelta();
    const currentLength = delta.length;
    const direction =
      currentLength > Number.EPSILON
        ? delta.multiplyScalar(1 / currentLength)
        : new Vector3(1, 0, 0);
    const error = currentLength - this.restLength;
    const relativeSpeed = this.bodyB.velocity
      .clone()
      .sub(this.bodyA.velocity)
      .dot(direction);
    let force = this.stiffness * error + this.damping * relativeSpeed;
    if (this.maxForce !== undefined)
      force = Math.max(-this.maxForce, Math.min(this.maxForce, force));
    this.lastError = Math.abs(error);
    this.lastForce = force;
    const impulse = direction.multiplyScalar(force * deltaSeconds);
    this.bodyA.applyImpulse(impulse);
    this.bodyB.applyImpulse(impulse.clone().negate());
    return this;
  }
}

/** Fixed-step CPU world wrapper that applies joints after rigid-body contacts. */
export class PhysicsJoints {
  /** Rigid-body world driven by this wrapper. */
  readonly world: PhysicsWorld;
  /** Joints solved after each rigid-body step. */
  readonly joints: PhysicsJoint[] = [];
  /** Fixed simulation step in seconds. */
  readonly fixedTimeStep: number;
  /** Maximum fixed steps consumed by one update. */
  readonly maxSubSteps: number;
  /** Maximum real-time delta consumed by one update. */
  readonly maxDelta: number;
  /** Positional iterations applied to each fixed step. */
  readonly iterations: number;
  /** Number of fixed steps performed by the most recent update. */
  lastStepCount = 0;

  #accumulator = 0;
  #running = false;
  #frameHandle: number | undefined;
  #previousTimestamp: number | undefined;
  #host: PhysicsFrameHost | undefined;
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

  /** Creates a wrapper around an existing world or a new CPU world. */
  constructor(options: PhysicsJointsOptions | PhysicsWorld = {}) {
    const resolved =
      options instanceof PhysicsWorld ? { world: options } : options;
    if (resolved.world) {
      this.world = resolved.world;
    } else {
      const worldOptions: PhysicsWorldOptions = {};
      if (resolved.gravity !== undefined)
        worldOptions.gravity = resolved.gravity;
      if (resolved.fixedTimeStep !== undefined)
        worldOptions.fixedTimeStep = resolved.fixedTimeStep;
      if (resolved.maxSubSteps !== undefined)
        worldOptions.maxSubSteps = resolved.maxSubSteps;
      if (resolved.maxDelta !== undefined)
        worldOptions.maxDelta = resolved.maxDelta;
      this.world = new PhysicsWorld(worldOptions);
    }
    this.fixedTimeStep = positiveFinite(
      resolved.fixedTimeStep ?? this.world.fixedTimeStep,
      "fixedTimeStep",
    );
    this.maxSubSteps = positiveInteger(
      resolved.maxSubSteps ?? this.world.maxSubSteps,
      "maxSubSteps",
    );
    this.maxDelta = positiveFinite(
      resolved.maxDelta ?? this.world.maxDelta,
      "maxDelta",
    );
    this.iterations = positiveInteger(resolved.iterations ?? 4, "iterations");
  }

  /** Adds a joint once and returns this wrapper for chaining. */
  addJoint(joint: PhysicsJoint): this {
    if (!this.joints.includes(joint)) this.joints.push(joint);
    return this;
  }

  /** Alias for `addJoint` used by concise example setup. */
  add(joint: PhysicsJoint): this {
    return this.addJoint(joint);
  }

  /** Removes one joint and reports whether it was present. */
  removeJoint(joint: PhysicsJoint): boolean {
    const index = this.joints.indexOf(joint);
    if (index < 0) return false;
    this.joints.splice(index, 1);
    return true;
  }

  /** Removes all joints and resets accumulated elapsed time. */
  clear(): this {
    this.joints.length = 0;
    this.#accumulator = 0;
    this.lastStepCount = 0;
    return this;
  }

  /** Advances one rigid-body step and applies all enabled constraints. */
  step(deltaSeconds: number = this.fixedTimeStep): this {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0)
      throw new RangeError(
        "PhysicsJoints.step deltaSeconds must be positive and finite.",
      );
    this.world.step(deltaSeconds);
    this.solve(deltaSeconds);
    return this;
  }

  /** Applies constraints after a caller has advanced the underlying world. */
  solve(deltaSeconds: number = this.fixedTimeStep): this {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0)
      throw new RangeError(
        "PhysicsJoints.solve deltaSeconds must be positive and finite.",
      );
    for (const joint of this.joints) {
      if (joint.enabled && joint.type === "spring") joint.solve(deltaSeconds);
    }
    for (let iteration = 0; iteration < this.iterations; iteration++) {
      for (const joint of this.joints) {
        if (joint.enabled && joint.type !== "spring") joint.solve(deltaSeconds);
      }
    }
    for (const body of this.world.bodies) body.syncToNode();
    return this;
  }

  /** Accumulates elapsed time and consumes bounded fixed simulation steps. */
  update(deltaSeconds: number): number {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0)
      throw new RangeError(
        "PhysicsJoints.update deltaSeconds must be finite and non-negative.",
      );
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
    host: PhysicsFrameHost = globalThis as unknown as PhysicsFrameHost,
  ): this {
    if (
      typeof host.requestAnimationFrame !== "function" ||
      typeof host.cancelAnimationFrame !== "function"
    ) {
      throw new TypeError(
        "PhysicsJoints.start requires requestAnimationFrame and cancelAnimationFrame.",
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

  /** Whether this wrapper currently owns an animation-frame loop. */
  get running(): boolean {
    return this.#running;
  }

  /** Stops scheduling and releases joints and rigid-body state. */
  dispose(): void {
    this.stop();
    this.clear();
    this.world.dispose();
  }
}

function finiteVector(value: Vector3, name: string): Vector3 {
  if (
    !(
      Number.isFinite(value.x) &&
      Number.isFinite(value.y) &&
      Number.isFinite(value.z)
    )
  ) {
    throw new RangeError(`PhysicsJoint ${name} must be finite.`);
  }
  return value.clone();
}

function nonNegativeFinite(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0)
    throw new RangeError(
      `PhysicsJoint ${name} must be non-negative and finite.`,
    );
  return value;
}

function positiveFinite(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0)
    throw new RangeError(`PhysicsJoints ${name} must be positive and finite.`);
  return value;
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new RangeError(`PhysicsJoints ${name} must be a positive integer.`);
  return value;
}

function applyPositionCorrection(
  bodyA: RigidBody,
  bodyB: RigidBody,
  error: Vector3,
  strength: number,
): void {
  const totalInverseMass = bodyA.inverseMass + bodyB.inverseMass;
  if (totalInverseMass === 0 || strength === 0) return;
  const scale = strength / totalInverseMass;
  bodyA.position.addScaledVector(error, bodyA.inverseMass * scale);
  bodyB.position.addScaledVector(error, -bodyB.inverseMass * scale);
}

function applyVelocityDamping(
  bodyA: RigidBody,
  bodyB: RigidBody,
  direction: Vector3,
  damping: number,
): void {
  const length = direction.length;
  const totalInverseMass = bodyA.inverseMass + bodyB.inverseMass;
  if (length <= Number.EPSILON || totalInverseMass === 0 || damping === 0)
    return;
  const normal = direction.multiplyScalar(1 / length);
  const relativeSpeed = bodyB.velocity.clone().sub(bodyA.velocity).dot(normal);
  const impulse = (relativeSpeed * damping) / totalInverseMass;
  bodyA.velocity.addScaledVector(normal, impulse * bodyA.inverseMass);
  bodyB.velocity.addScaledVector(normal, -impulse * bodyB.inverseMass);
}
