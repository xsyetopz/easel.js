import type { Node } from "../core/Node.ts";
import { Vector3 } from "../math/Vector3.ts";
import type { HeightfieldShape } from "./HeightfieldShape.ts";

let nextRigidBodyId = 0;

/** A 3D axis-aligned box shape used by the CPU rigid-body solver. */
export class AABBShape {
  /** Shape discriminator used by collision dispatch. */
  readonly type = "aabb" as const;
  /** Half-size along each world axis. */
  readonly halfExtents: Vector3;

  /** Creates an axis-aligned box shape from half extents. */
  constructor(halfExtents: Vector3 = new Vector3(0.5, 0.5, 0.5)) {
    if (
      !isFiniteVector(halfExtents) ||
      halfExtents.x < 0 ||
      halfExtents.y < 0 ||
      halfExtents.z < 0
    ) {
      throw new RangeError(
        "AABBShape halfExtents must be finite and non-negative.",
      );
    }
    this.halfExtents = halfExtents.clone();
  }

  /** Returns an independent copy of this shape. */
  clone(): AABBShape {
    return new AABBShape(this.halfExtents);
  }
}

/** A circle shape for 2D XY-plane collision demos. */
export class CircleShape {
  /** Shape discriminator used by collision dispatch. */
  readonly type = "circle" as const;
  /** Radius in world units. */
  readonly radius: number;

  /** Creates a circle shape with a positive finite radius. */
  constructor(radius: number = 0.5) {
    if (!Number.isFinite(radius) || radius <= 0) {
      throw new RangeError("CircleShape radius must be positive and finite.");
    }
    this.radius = radius;
  }

  /** Returns an independent copy of this shape. */
  clone(): CircleShape {
    return new CircleShape(this.radius);
  }
}

/** A 3D sphere shape for CPU rigid-body collision demos. */
export class SphereShape {
  /** Shape discriminator used by collision dispatch. */
  readonly type = "sphere" as const;
  /** Radius in world units. */
  readonly radius: number;

  /** Creates a sphere shape with a positive finite radius. */
  constructor(radius: number = 0.5) {
    if (!Number.isFinite(radius) || radius <= 0) {
      throw new RangeError("SphereShape radius must be positive and finite.");
    }
    this.radius = radius;
  }

  /** Returns an independent copy of this shape. */
  clone(): SphereShape {
    return new SphereShape(this.radius);
  }
}

/** Collision shape accepted by a rigid body. */
export type PhysicsShape =
  | AABBShape
  | CircleShape
  | SphereShape
  | HeightfieldShape;

/** Construction options for a CPU rigid body. */
export interface RigidBodyOptions {
  /** Collision shape used by the body. */
  shape: PhysicsShape;
  /** Optional scene node synchronized from the simulated position. */
  node?: Node;
  /** Initial local/world position. Defaults to the node position when present. */
  position?: Vector3;
  /** Initial linear velocity in world units per second. */
  velocity?: Vector3;
  /** Mass in world units. Zero or `Infinity` creates a static body. */
  mass?: number;
  /** Coefficient of restitution used by collision impulses. */
  restitution?: number;
  /** Tangential impulse damping in the range 0–1. */
  friction?: number;
}

/** A simple translational rigid body for CPU collision examples. */
export class RigidBody {
  /** Stable body identifier for contact/debug records. */
  readonly id: number;
  /** Collision shape used by this body. */
  readonly shape: PhysicsShape;
  /** Optional node updated after every simulation step. */
  readonly node: Node | undefined;
  /** Simulated position. */
  readonly position: Vector3;
  /** Simulated linear velocity. */
  readonly velocity: Vector3;
  /** Coefficient of restitution, clamped to [0, 1]. */
  readonly restitution: number;
  /** Tangential impulse damping, clamped to [0, 1]. */
  readonly friction: number;
  /** Inverse mass; zero identifies static bodies. */
  readonly inverseMass: number;

  /** Creates a body and copies all mutable vector inputs. */
  constructor(options: RigidBodyOptions) {
    if (!options.shape) throw new TypeError("RigidBody requires a shape.");
    this.id = nextRigidBodyId++;
    this.shape = options.shape.clone();
    this.node = options.node;
    this.position = (
      options.position ??
      options.node?.position ??
      new Vector3()
    ).clone();
    this.velocity = (options.velocity ?? new Vector3()).clone();
    if (!(isFiniteVector(this.position) && isFiniteVector(this.velocity))) {
      throw new RangeError("RigidBody position and velocity must be finite.");
    }
    const mass = options.mass ?? 1;
    if (!Number.isFinite(mass) && mass !== Number.POSITIVE_INFINITY) {
      throw new RangeError("RigidBody mass must be finite or Infinity.");
    }
    if (mass < 0) throw new RangeError("RigidBody mass must be non-negative.");
    this.inverseMass =
      mass === 0 || mass === Number.POSITIVE_INFINITY ? 0 : 1 / mass;
    this.restitution = clamp01(options.restitution ?? 0.2);
    this.friction = clamp01(options.friction ?? 0.2);
    this.syncToNode();
  }

  /** Whether this body responds to forces and collision impulses. */
  get dynamic(): boolean {
    return this.inverseMass > 0;
  }

  /** Applies an instantaneous linear impulse. */
  applyImpulse(impulse: Vector3): this {
    if (this.dynamic) this.velocity.addScaledVector(impulse, this.inverseMass);
    return this;
  }

  /** Copies the simulated position into the attached scene node. */
  syncToNode(): this {
    if (this.node) {
      this.node.position.copy(this.position);
      this.node.updateMatrix();
    }
    return this;
  }

  /** Copies an attached node position into the body before simulation. */
  syncFromNode(): this {
    if (this.node) this.position.copy(this.node.position);
    return this;
  }
}

/** A resolved collision from body A toward body B. */
export interface PhysicsContact {
  /** First body in the contact pair. */
  readonly bodyA: RigidBody;
  /** Second body in the contact pair. */
  readonly bodyB: RigidBody;
  /** Unit normal directed from body A toward body B. */
  readonly normal: Vector3;
  /** Positional overlap measured along the contact normal. */
  readonly penetration: number;
}

/** Browser scheduling surface required by `PhysicsWorld.start`. */
export interface PhysicsFrameHost {
  /** Schedules the next simulation callback. */
  requestAnimationFrame(callback: (timestamp: number) => void): number;
  /** Cancels a previously scheduled simulation callback. */
  cancelAnimationFrame(handle: number): void;
}

/** Fixed-step, CPU-only rigid-body world with primitive and heightfield collisions. */
export interface PhysicsWorldOptions {
  /** Constant acceleration applied to dynamic bodies. Defaults to Earth gravity. */
  gravity?: Vector3;
  /** Fixed simulation step in seconds. Defaults to 1/60. */
  fixedTimeStep?: number;
  /** Maximum simulation steps consumed by one `update` call. Defaults to 8. */
  maxSubSteps?: number;
  /** Maximum real-time delta accepted by one `update` call. */
  maxDelta?: number;
}

interface CollisionManifold {
  normal: Vector3;
  penetration: number;
}

/** Fixed-step, lifecycle-safe CPU physics world for Canvas2D examples.
 *
 * Sphere contacts are resolved in three dimensions; rigid bodies remain
 * translation-only, so callers own angular state and instance transforms.
 */
export class PhysicsWorld {
  /** Constant acceleration applied to dynamic bodies. */
  readonly gravity: Vector3;
  /** Fixed simulation step in seconds. */
  readonly fixedTimeStep: number;
  /** Maximum fixed steps consumed by one update. */
  readonly maxSubSteps: number;
  /** Maximum real-time delta consumed by one update. */
  readonly maxDelta: number;
  /** Bodies currently owned by this world. */
  readonly bodies: RigidBody[] = [];
  /** Contacts generated by the most recent fixed step. */
  readonly contacts: PhysicsContact[] = [];
  /** Number of fixed steps performed by the most recent update. */
  lastStepCount = 0;

  #accumulator = 0;
  #running: boolean = false;
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

  /** Creates a world with bounded fixed-step simulation settings. */
  constructor(options: PhysicsWorldOptions = {}) {
    this.gravity = (options.gravity ?? new Vector3(0, -9.81, 0)).clone();
    if (!isFiniteVector(this.gravity))
      throw new RangeError("PhysicsWorld gravity must be finite.");
    this.fixedTimeStep = positiveFinite(
      options.fixedTimeStep ?? 1 / 60,
      "fixedTimeStep",
    );
    this.maxSubSteps = positiveInteger(options.maxSubSteps ?? 8, "maxSubSteps");
    this.maxDelta = positiveFinite(
      options.maxDelta ?? this.fixedTimeStep * this.maxSubSteps,
      "maxDelta",
    );
  }

  /** Adds a body once and returns this world for chaining. */
  addBody(body: RigidBody): this {
    if (!this.bodies.includes(body)) this.bodies.push(body);
    return this;
  }

  /** Removes a body and any contacts involving it. */
  removeBody(body: RigidBody): boolean {
    const index = this.bodies.indexOf(body);
    if (index < 0) return false;
    this.bodies.splice(index, 1);
    for (
      let contactIndex = this.contacts.length - 1;
      contactIndex >= 0;
      contactIndex--
    ) {
      const contact = this.contacts[contactIndex];
      if (contact.bodyA === body || contact.bodyB === body)
        this.contacts.splice(contactIndex, 1);
    }
    return true;
  }

  /** Removes every body and resets accumulated time. */
  clear(): this {
    this.bodies.length = 0;
    this.contacts.length = 0;
    this.#accumulator = 0;
    this.lastStepCount = 0;
    return this;
  }

  /** Advances exactly one fixed simulation step. */
  step(deltaSeconds: number = this.fixedTimeStep): this {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      throw new RangeError(
        "PhysicsWorld.step deltaSeconds must be positive and finite.",
      );
    }
    this.contacts.length = 0;
    for (const body of this.bodies) {
      if (!body.dynamic) continue;
      body.velocity.addScaledVector(this.gravity, deltaSeconds);
      body.position.addScaledVector(body.velocity, deltaSeconds);
    }
    for (let i = 0; i < this.bodies.length; i++) {
      const bodyA = this.bodies[i];
      if (!bodyA) continue;
      for (let j = i + 1; j < this.bodies.length; j++) {
        const bodyB = this.bodies[j];
        if (!bodyB) continue;
        if (bodyA.inverseMass === 0 && bodyB.inverseMass === 0) continue;
        const manifold = collide(bodyA, bodyB);
        if (!manifold) continue;
        resolve(bodyA, bodyB, manifold);
        this.contacts.push({
          bodyA,
          bodyB,
          normal: manifold.normal.clone(),
          penetration: manifold.penetration,
        });
      }
    }
    for (const body of this.bodies) body.syncToNode();
    return this;
  }

  /** Accumulates elapsed time and consumes bounded fixed simulation steps. */
  update(deltaSeconds: number): number {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError(
        "PhysicsWorld.update deltaSeconds must be finite and non-negative.",
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
    if (steps === this.maxSubSteps && this.#accumulator >= this.fixedTimeStep) {
      this.#accumulator = this.fixedTimeStep * 0.5;
    }
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
        "PhysicsWorld.start requires requestAnimationFrame and cancelAnimationFrame.",
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

  /** Stops scheduling and releases all body/contact state. */
  dispose(): void {
    this.stop();
    this.clear();
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
    throw new RangeError(`PhysicsWorld ${name} must be positive and finite.`);
  return value;
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new RangeError(`PhysicsWorld ${name} must be a positive integer.`);
  return value;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value))
    throw new RangeError("RigidBody coefficient must be finite.");
  return Math.max(0, Math.min(1, value));
}

function collide(a: RigidBody, b: RigidBody): CollisionManifold | undefined {
  if (a.shape.type === "aabb" && b.shape.type === "aabb")
    return collideAABBs(a, b);
  if (a.shape.type === "sphere" && b.shape.type === "sphere")
    return collideSpheres(a, b);
  if (a.shape.type === "sphere" && b.shape.type === "aabb")
    return collideSphereAABB(a, b);
  if (a.shape.type === "aabb" && b.shape.type === "sphere") {
    const manifold = collideSphereAABB(b, a);
    if (!manifold) return noCollision;
    manifold.normal.multiplyScalar(-1);
    return manifold;
  }
  if (a.shape.type === "circle" && b.shape.type === "circle")
    return collideCircles(a, b);
  if (a.shape.type === "circle" && b.shape.type === "aabb")
    return collideCircleAABB(a, b);
  if (a.shape.type === "aabb" && b.shape.type === "circle") {
    const manifold = collideCircleAABB(b, a);
    if (!manifold) return noCollision;
    manifold.normal.multiplyScalar(-1);
    return manifold;
  }
  if (a.shape.type === "sphere" && b.shape.type === "heightfield")
    return collideSphereHeightfield(a, b);
  if (a.shape.type === "heightfield" && b.shape.type === "sphere") {
    const manifold = collideSphereHeightfield(b, a);
    if (!manifold) return noCollision;
    manifold.normal.multiplyScalar(-1);
    return manifold;
  }
  if (a.shape.type === "aabb" && b.shape.type === "heightfield")
    return collideAABBHeightfield(a, b);
  if (a.shape.type === "heightfield" && b.shape.type === "aabb") {
    const manifold = collideAABBHeightfield(b, a);
    if (!manifold) return noCollision;
    manifold.normal.multiplyScalar(-1);
    return manifold;
  }
  return noCollision;
}

const noCollision: undefined = void 0;

function collideSpheres(
  a: RigidBody,
  b: RigidBody,
): CollisionManifold | undefined {
  const shapeA = a.shape as SphereShape;
  const shapeB = b.shape as SphereShape;
  const delta = b.position.clone().sub(a.position);
  const distanceSq = delta.lengthSq;
  const radius = shapeA.radius + shapeB.radius;
  if (distanceSq >= radius * radius) return;
  if (distanceSq <= Number.EPSILON) {
    return { normal: new Vector3(1, 0, 0), penetration: radius };
  }
  const distance = Math.sqrt(distanceSq);
  return {
    normal: delta.multiplyScalar(1 / distance),
    penetration: radius - distance,
  };
}

function collideSphereAABB(
  sphere: RigidBody,
  box: RigidBody,
): CollisionManifold | undefined {
  const half = (box.shape as AABBShape).halfExtents;
  const minX = box.position.x - half.x;
  const maxX = box.position.x + half.x;
  const minY = box.position.y - half.y;
  const maxY = box.position.y + half.y;
  const minZ = box.position.z - half.z;
  const maxZ = box.position.z + half.z;
  const deltaX =
    Math.max(minX, Math.min(sphere.position.x, maxX)) - sphere.position.x;
  const deltaY =
    Math.max(minY, Math.min(sphere.position.y, maxY)) - sphere.position.y;
  const deltaZ =
    Math.max(minZ, Math.min(sphere.position.z, maxZ)) - sphere.position.z;
  const distanceSq = deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ;
  const radius = (sphere.shape as SphereShape).radius;
  if (distanceSq > Number.EPSILON) {
    const distance = Math.sqrt(distanceSq);
    if (distance >= radius) return;
    return {
      normal: new Vector3(
        deltaX / distance,
        deltaY / distance,
        deltaZ / distance,
      ),
      penetration: radius - distance,
    };
  }

  const left = sphere.position.x - minX;
  const right = maxX - sphere.position.x;
  const bottom = sphere.position.y - minY;
  const top = maxY - sphere.position.y;
  const back = sphere.position.z - minZ;
  const front = maxZ - sphere.position.z;
  const nearest = Math.min(left, right, bottom, top, back, front);
  if (nearest === left)
    return { normal: new Vector3(1, 0, 0), penetration: radius + left };
  if (nearest === right)
    return { normal: new Vector3(-1, 0, 0), penetration: radius + right };
  if (nearest === bottom)
    return { normal: new Vector3(0, 1, 0), penetration: radius + bottom };
  if (nearest === top)
    return { normal: new Vector3(0, -1, 0), penetration: radius + top };
  if (nearest === back)
    return { normal: new Vector3(0, 0, 1), penetration: radius + back };
  return { normal: new Vector3(0, 0, -1), penetration: radius + front };
}

function collideSphereHeightfield(
  sphere: RigidBody,
  field: RigidBody,
): CollisionManifold | undefined {
  const shape = field.shape as HeightfieldShape;
  const localX = sphere.position.x - field.position.x;
  const localZ = sphere.position.z - field.position.z;
  const height = shape.getHeightAt(localX, localZ);
  if (height === undefined) return;
  const terrainY = field.position.y + height;
  const radius = (sphere.shape as SphereShape).radius;
  const penetration = terrainY + radius - sphere.position.y;
  if (penetration <= 0) return;
  const normal = shape.getNormalAt(localX, localZ).multiplyScalar(-1);
  return { normal, penetration };
}

function collideAABBHeightfield(
  box: RigidBody,
  field: RigidBody,
): CollisionManifold | undefined {
  const shape = field.shape as HeightfieldShape;
  const localX = box.position.x - field.position.x;
  const localZ = box.position.z - field.position.z;
  const height = shape.getHeightAt(localX, localZ);
  if (height === undefined) return;
  const half = (box.shape as AABBShape).halfExtents;
  const terrainY = field.position.y + height;
  const penetration = terrainY + half.y - box.position.y;
  if (penetration <= 0) return;
  const normal = shape.getNormalAt(localX, localZ).multiplyScalar(-1);
  return { normal, penetration };
}

function collideAABBs(
  a: RigidBody,
  b: RigidBody,
): CollisionManifold | undefined {
  const shapeA = a.shape as AABBShape;
  const shapeB = b.shape as AABBShape;
  const dx = b.position.x - a.position.x;
  const dy = b.position.y - a.position.y;
  const dz = b.position.z - a.position.z;
  const overlapX = shapeA.halfExtents.x + shapeB.halfExtents.x - Math.abs(dx);
  const overlapY = shapeA.halfExtents.y + shapeB.halfExtents.y - Math.abs(dy);
  const overlapZ = shapeA.halfExtents.z + shapeB.halfExtents.z - Math.abs(dz);
  if (overlapX <= 0 || overlapY <= 0 || overlapZ <= 0) return;
  if (overlapX <= overlapY && overlapX <= overlapZ)
    return { normal: new Vector3(signOrOne(dx), 0, 0), penetration: overlapX };
  if (overlapY <= overlapZ)
    return { normal: new Vector3(0, signOrOne(dy), 0), penetration: overlapY };
  return { normal: new Vector3(0, 0, signOrOne(dz)), penetration: overlapZ };
}

function collideCircles(
  a: RigidBody,
  b: RigidBody,
): CollisionManifold | undefined {
  const shapeA = a.shape as CircleShape;
  const shapeB = b.shape as CircleShape;
  const dx = b.position.x - a.position.x;
  const dy = b.position.y - a.position.y;
  const radius = shapeA.radius + shapeB.radius;
  const distanceSq = dx * dx + dy * dy;
  if (distanceSq >= radius * radius) return;
  if (distanceSq <= Number.EPSILON)
    return { normal: new Vector3(1, 0, 0), penetration: radius };
  const distance = Math.sqrt(distanceSq);
  return {
    normal: new Vector3(dx / distance, dy / distance, 0),
    penetration: radius - distance,
  };
}

function collideCircleAABB(
  circle: RigidBody,
  box: RigidBody,
): CollisionManifold | undefined {
  const half = (box.shape as AABBShape).halfExtents;
  const minX = box.position.x - half.x;
  const maxX = box.position.x + half.x;
  const minY = box.position.y - half.y;
  const maxY = box.position.y + half.y;
  const closestX = Math.max(minX, Math.min(circle.position.x, maxX));
  const closestY = Math.max(minY, Math.min(circle.position.y, maxY));
  const dx = closestX - circle.position.x;
  const dy = closestY - circle.position.y;
  const distanceSq = dx * dx + dy * dy;
  const radius = (circle.shape as CircleShape).radius;
  if (distanceSq > Number.EPSILON) {
    const distance = Math.sqrt(distanceSq);
    if (distance >= radius) return;
    return {
      normal: new Vector3(dx / distance, dy / distance, 0),
      penetration: radius - distance,
    };
  }
  const left = circle.position.x - minX;
  const right = maxX - circle.position.x;
  const bottom = circle.position.y - minY;
  const top = maxY - circle.position.y;
  const nearest = Math.min(left, right, bottom, top);
  if (nearest === left)
    return { normal: new Vector3(-1, 0, 0), penetration: radius + left };
  if (nearest === right)
    return { normal: new Vector3(1, 0, 0), penetration: radius + right };
  if (nearest === bottom)
    return { normal: new Vector3(0, -1, 0), penetration: radius + bottom };
  return { normal: new Vector3(0, 1, 0), penetration: radius + top };
}

function resolve(
  a: RigidBody,
  b: RigidBody,
  manifold: CollisionManifold,
): void {
  const totalInverseMass = a.inverseMass + b.inverseMass;
  if (totalInverseMass === 0) return;
  const correction = manifold.penetration / totalInverseMass;
  a.position.addScaledVector(manifold.normal, -correction * a.inverseMass);
  b.position.addScaledVector(manifold.normal, correction * b.inverseMass);

  const relativeVelocity = b.velocity.clone().sub(a.velocity);
  const normalVelocity = relativeVelocity.dot(manifold.normal);
  if (normalVelocity > 0) return;
  const restitution = Math.min(a.restitution, b.restitution);
  const impulseMagnitude =
    (-(1 + restitution) * normalVelocity) / totalInverseMass;
  const impulse = manifold.normal.clone().multiplyScalar(impulseMagnitude);
  a.velocity.addScaledVector(impulse, -a.inverseMass);
  b.velocity.addScaledVector(impulse, b.inverseMass);

  const tangent = relativeVelocity.sub(
    manifold.normal.clone().multiplyScalar(normalVelocity),
  );
  if (tangent.lengthSq <= Number.EPSILON) return;
  tangent.normalize();
  const frictionImpulse = -relativeVelocity.dot(tangent) / totalInverseMass;
  const maxFriction = impulseMagnitude * Math.sqrt(a.friction * b.friction);
  const limited = Math.max(
    -maxFriction,
    Math.min(maxFriction, frictionImpulse),
  );
  const friction = tangent.multiplyScalar(limited);
  a.velocity.addScaledVector(friction, -a.inverseMass);
  b.velocity.addScaledVector(friction, b.inverseMass);
}

function signOrOne(value: number): number {
  return value < 0 ? -1 : 1;
}
