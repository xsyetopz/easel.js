import { Capsule } from "../math/Capsule.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Octree } from "./Octree.ts";

const EPSILON = 1e-8;

/** Browser scheduling surface required by {@link CharacterController.start}. */
export interface CharacterControllerFrameHost {
  /** Schedules the next controller update callback. */
  requestAnimationFrame(callback: (timestamp: number) => void): number;
  /** Cancels a previously scheduled controller callback. */
  cancelAnimationFrame(handle: number): void;
}

/** Construction options for a CPU capsule character controller. */
export interface CharacterControllerOptions {
  /** Triangle-aware CPU collision index used for movement resolution. */
  octree: Octree;
  /** Initial capsule segment and radius. It is copied by the controller. */
  capsule?: Capsule;
  /** Initial capsule center. When present, it overrides the copied capsule center. */
  position?: Vector3;
  /** Capsule radius used when {@link capsule} is omitted. Defaults to `0.3`. */
  radius?: number;
  /** Capsule segment length used when {@link capsule} is omitted. Defaults to `1`. */
  height?: number;
  /** Constant world-space acceleration. Defaults to `(0, -9.81, 0)`. */
  gravity?: Vector3;
  /** Unit vector that defines up and the grounding direction. Defaults to `(0, 1, 0)`. */
  up?: Vector3;
  /** Fixed simulation step in seconds. Defaults to `1 / 60`. */
  fixedTimeStep?: number;
  /** Maximum fixed steps consumed by one {@link update} call. Defaults to `8`. */
  maxSubSteps?: number;
  /** Maximum real-time delta accepted by one {@link update} call. */
  maxDelta?: number;
  /** Maximum walkable slope angle in radians. Defaults to `π / 4`. */
  maxSlopeAngle?: number;
  /** Extra downward distance used to detect a floor after movement. Defaults to `1e-4`. */
  groundCheckDistance?: number;
  /** Maximum collision-resolution passes consumed by one movement. Defaults to `4`. */
  maxIterations?: number;
  /** Initial desired horizontal velocity in world units per second. */
  movement?: Vector3;
  /** Initial linear velocity in world units per second. */
  velocity?: Vector3;
  /** Jump speed along {@link up}. Defaults to `5`. */
  jumpSpeed?: number;
  /** Whether {@link jump} may change the vertical velocity. Defaults to `true`. */
  enableJump?: boolean;
  /** Whether floor probes update {@link grounded}. Defaults to `true`. */
  enableGrounding?: boolean;
}

/** Fixed-step CPU capsule controller for Canvas2D game examples.
 *
 * The controller owns a copied {@link Capsule}, applies gravity and a desired
 * horizontal velocity, and resolves each fixed-step displacement against an
 * {@link Octree}. It intentionally exposes collision state rather than a
 * Rapier/WASM collider object, so a caller can synchronize any EASEL `Node`
 * or mesh from {@link position} after each update.
 */
export class CharacterController {
  /** Triangle-aware CPU collision index used by this controller. */
  readonly octree: Octree;
  /** Mutable capsule in world coordinates. */
  readonly capsule: Capsule;
  /** Capsule center in world coordinates. */
  readonly position: Vector3;
  /** Linear velocity in world units per second. */
  readonly velocity: Vector3;
  /** Desired horizontal velocity in world units per second. */
  readonly movement: Vector3;
  /** Constant world-space acceleration. */
  readonly gravity: Vector3;
  /** Unit vector defining up and the grounding direction. */
  readonly up: Vector3;
  /** Fixed simulation step in seconds. */
  readonly fixedTimeStep: number;
  /** Maximum fixed steps consumed by one update. */
  readonly maxSubSteps: number;
  /** Maximum real-time delta consumed by one update. */
  readonly maxDelta: number;
  /** Maximum walkable slope angle in radians. */
  readonly maxSlopeAngle: number;
  /** Downward distance used by the floor probe. */
  readonly groundCheckDistance: number;
  /** Maximum collision-resolution passes consumed by one movement. */
  readonly maxIterations: number;
  /** Jump speed along {@link up}. */
  readonly jumpSpeed: number;
  /** Whether {@link jump} is enabled. */
  enableJump: boolean;
  /** Whether floor probes update {@link grounded}. */
  enableGrounding: boolean;
  /** Whether the capsule currently rests on a walkable surface. */
  grounded: boolean = false;
  /** Number of fixed steps performed by the most recent update. */
  lastStepCount = 0;

  #accumulator = 0;
  #running: boolean = false;
  #disposed: boolean = false;
  #frameHandle: number | undefined;
  #previousTimestamp: number | undefined;
  #host: CharacterControllerFrameHost | undefined;
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
  readonly #contactNormals: Vector3[] = [];
  readonly #candidateCenter = new Vector3();
  readonly #collisionCenter = new Vector3();
  readonly #correction = new Vector3();

  /** Constructs a controller with bounded deterministic fixed-step settings. */
  constructor(options: CharacterControllerOptions) {
    if (!(options && options.octree instanceof Octree)) {
      throw new TypeError("CharacterController requires an Octree.");
    }
    this.octree = options.octree;
    const capsule = options.capsule
      ? options.capsule.clone()
      : createCapsule(options.radius ?? 0.3, options.height ?? 1);
    if (options.position) validateVector(options.position, "position");
    this.capsule = capsule;
    this.position = capsule.getCenter(new Vector3());
    if (options.position) {
      this.capsule.translate(
        _difference.copy(options.position).sub(this.position),
      );
      this.position.copy(options.position);
    }

    this.gravity = (options.gravity ?? new Vector3(0, -9.81, 0)).clone();
    validateVector(this.gravity, "gravity");
    this.up = (options.up ?? new Vector3(0, 1, 0)).clone();
    validateVector(this.up, "up");
    if (this.up.lengthSq <= EPSILON)
      throw new RangeError("CharacterController up must be non-zero.");
    this.up.normalize();

    this.fixedTimeStep = positiveFinite(
      options.fixedTimeStep ?? 1 / 60,
      "fixedTimeStep",
    );
    this.maxSubSteps = positiveInteger(options.maxSubSteps ?? 8, "maxSubSteps");
    this.maxDelta = positiveFinite(
      options.maxDelta ?? this.fixedTimeStep * this.maxSubSteps,
      "maxDelta",
    );
    this.maxSlopeAngle = boundedAngle(
      options.maxSlopeAngle ?? Math.PI / 4,
      "maxSlopeAngle",
    );
    this.groundCheckDistance = nonNegativeFinite(
      options.groundCheckDistance ?? 1e-4,
      "groundCheckDistance",
    );
    this.maxIterations = positiveInteger(
      options.maxIterations ?? 4,
      "maxIterations",
    );
    this.jumpSpeed = nonNegativeFinite(options.jumpSpeed ?? 5, "jumpSpeed");
    this.enableJump = options.enableJump ?? true;
    this.enableGrounding = options.enableGrounding ?? true;
    this.velocity = (options.velocity ?? new Vector3()).clone();
    validateVector(this.velocity, "velocity");
    this.movement = new Vector3();
    if (options.movement) this.setMovement(options.movement);
    this.#updateGrounded();
  }

  /** Whether this controller has been disposed. */
  get disposed(): boolean {
    return this.#disposed;
  }

  /** Whether this controller currently owns an animation-frame loop. */
  get running(): boolean {
    return this.#running;
  }

  /** Copies a desired world-space horizontal velocity into {@link movement}. */
  setMovement(value: Vector3): this {
    if (this.#disposed) return this;
    validateVector(value, "movement");
    const vertical = value.dot(this.up);
    this.movement.copy(value).addScaledVector(this.up, -vertical);
    return this;
  }

  /** Clears the desired horizontal velocity. */
  stopMovement(): this {
    this.movement.set(0, 0, 0);
    return this;
  }

  /** Sets the capsule center without changing its radius or segment length. */
  setPosition(value: Vector3): this {
    if (this.#disposed) return this;
    validateVector(value, "position");
    this.capsule.translate(_difference.copy(value).sub(this.position));
    this.position.copy(value);
    this.#updateGrounded();
    return this;
  }

  /** Sets linear velocity in world units per second. */
  setVelocity(value: Vector3): this {
    if (this.#disposed) return this;
    validateVector(value, "velocity");
    this.velocity.copy(value);
    return this;
  }

  /** Requests a jump and returns `true` when the capsule was grounded. */
  jump(speed: number = this.jumpSpeed): boolean {
    if (this.#disposed || !this.enableJump || !this.grounded) return false;
    const jumpSpeed = nonNegativeFinite(speed, "jumpSpeed");
    const verticalVelocity = this.velocity.dot(this.up);
    this.velocity.addScaledVector(this.up, jumpSpeed - verticalVelocity);
    this.grounded = false;
    return true;
  }

  /** Resolves one caller-supplied world-space displacement immediately.
   *
   * This low-level operation mirrors Rapier's computed movement result without
   * exposing a device or WASM collider. Gravity and fixed-step accumulation are
   * handled by {@link step} and {@link update}; use this method for an explicit
   * displacement or a deterministic controller test.
   */
  move(displacement: Vector3): Vector3 {
    if (this.#disposed) return new Vector3();
    validateVector(displacement, "displacement");
    const before = this.position.clone();
    this.#contactNormals.length = 0;
    const subdivisions = Math.max(
      1,
      Math.ceil(displacement.length / Math.max(this.capsule.radius, 1e-3)),
    );
    const slice = displacement.clone().multiplyScalar(1 / subdivisions);
    for (let sliceIndex = 0; sliceIndex < subdivisions; sliceIndex++) {
      this.capsule.translate(slice);
      for (let iteration = 0; iteration < this.maxIterations; iteration++) {
        this.capsule.getCenter(this.#candidateCenter);
        const hit = this.octree.capsuleIntersect(this.capsule);
        if (hit === false) break;
        this.capsule.getCenter(this.#collisionCenter);
        this.#correction.copy(this.#collisionCenter).sub(this.#candidateCenter);
        const normal = hit.normal.clone();
        // Triangle winding is not guaranteed to face the approach direction.
        // If the octree correction continues along the requested displacement,
        // reflect it so a wall cannot push a controller through its far side.
        if (
          this.#correction.lengthSq > EPSILON &&
          this.#correction.dot(slice) > EPSILON
        ) {
          this.capsule.translate(this.#correction.clone().multiplyScalar(-2));
          normal.negate();
        }
        this.#contactNormals.push(normal);
        if (hit.depth <= EPSILON) break;
      }
    }
    this.#syncPosition();
    this.#projectVelocityFromContacts();
    this.#updateGrounded();
    return this.position.clone().sub(before);
  }

  /** Alias for {@link move} matching the upstream controller terminology. */
  computeColliderMovement(displacement: Vector3): Vector3 {
    return this.move(displacement);
  }

  /** Advances exactly one fixed controller step. */
  step(deltaSeconds: number = this.fixedTimeStep): this {
    if (this.#disposed) return this;
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      throw new RangeError(
        "CharacterController.step deltaSeconds must be positive and finite.",
      );
    }
    this.#updateGrounded();
    const verticalVelocity = this.velocity.dot(this.up);
    const gravityAlongUp = this.gravity.dot(this.up);
    if (
      !this.grounded ||
      verticalVelocity > EPSILON ||
      gravityAlongUp > EPSILON
    )
      this.velocity.addScaledVector(this.gravity, deltaSeconds);
    _move.copy(this.movement).multiplyScalar(deltaSeconds);
    _move.addScaledVector(this.velocity, deltaSeconds);
    this.move(_move);
    if (this.grounded) {
      const downwardVelocity = this.velocity.dot(this.up);
      if (downwardVelocity < 0)
        this.velocity.addScaledVector(this.up, -downwardVelocity);
    }
    return this;
  }

  /** Accumulates elapsed time and consumes bounded fixed controller steps. */
  update(deltaSeconds: number, movement?: Vector3): number {
    if (this.#disposed) return 0;
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError(
        "CharacterController.update deltaSeconds must be finite and non-negative.",
      );
    }
    if (movement) this.setMovement(movement);
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
    host: CharacterControllerFrameHost = globalThis as unknown as CharacterControllerFrameHost,
  ): this {
    if (this.#disposed)
      throw new Error("CharacterController has been disposed.");
    if (
      typeof host.requestAnimationFrame !== "function" ||
      typeof host.cancelAnimationFrame !== "function"
    ) {
      throw new TypeError(
        "CharacterController.start requires requestAnimationFrame and cancelAnimationFrame.",
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

  /** Stops scheduling and makes future updates no-ops. */
  dispose(): void {
    if (this.#disposed) return;
    this.stop();
    this.#disposed = true;
    this.#accumulator = 0;
    this.lastStepCount = 0;
    this.stopMovement();
  }

  #syncPosition(): void {
    this.capsule.getCenter(this.position);
  }

  #projectVelocityFromContacts(): void {
    for (const normal of this.#contactNormals) {
      const inward = this.velocity.dot(normal);
      if (inward < 0) this.velocity.addScaledVector(normal, -inward);
    }
  }

  #updateGrounded(): void {
    if (!this.enableGrounding) {
      this.grounded = false;
      return;
    }
    const probe = this.capsule.clone();
    if (this.groundCheckDistance > 0)
      probe.translate(
        _probeOffset.copy(this.up).multiplyScalar(-this.groundCheckDistance),
      );
    const hit = this.octree.capsuleIntersect(probe);
    this.grounded = hit !== false && this.#isWalkableNormal(hit.normal);
  }

  #isWalkableNormal(normal: Vector3): boolean {
    return normal.dot(this.up) >= Math.cos(this.maxSlopeAngle) - EPSILON;
  }
}

function createCapsule(radius: number, height: number): Capsule {
  const validRadius = nonNegativeFinite(radius, "radius");
  const validHeight = nonNegativeFinite(height, "height");
  const halfHeight = validHeight * 0.5;
  return new Capsule(
    new Vector3(0, -halfHeight, 0),
    new Vector3(0, halfHeight, 0),
    validRadius,
  );
}

function validateVector(value: Vector3, name: string): void {
  if (
    !(
      Number.isFinite(value.x) &&
      Number.isFinite(value.y) &&
      Number.isFinite(value.z)
    )
  ) {
    throw new RangeError(`CharacterController ${name} must be finite.`);
  }
}

function positiveFinite(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0)
    throw new RangeError(
      `CharacterController ${name} must be positive and finite.`,
    );
  return value;
}

function nonNegativeFinite(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0)
    throw new RangeError(
      `CharacterController ${name} must be non-negative and finite.`,
    );
  return value;
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0)
    throw new RangeError(
      `CharacterController ${name} must be a positive integer.`,
    );
  return value;
}

function boundedAngle(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0 || value > Math.PI / 2)
    throw new RangeError(
      `CharacterController ${name} must be between 0 and π/2 radians.`,
    );
  return value;
}

const _difference = new Vector3();
const _move = new Vector3();
const _probeOffset = new Vector3();
