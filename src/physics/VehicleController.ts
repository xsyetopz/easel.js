import type { AABBShape, PhysicsWorld, RigidBody } from "./PhysicsWorld.ts";
import type { HeightfieldShape } from "./HeightfieldShape.ts";
import { Vector3 } from "../math/Vector3.ts";

/** Input values consumed by the CPU vehicle controller. */
export interface VehicleInput {
  /** Forward throttle in the range -1..1. */
  readonly forward?: number;
  /** Steering input in the range -1..1. */
  readonly right?: number;
  /** Brake input in the range 0..1. */
  readonly brake?: number;
  /** Restores the chassis to its initial position and velocity. */
  readonly reset?: boolean;
}

/** Construction options for a CPU wheel controller. */
export interface VehicleControllerOptions {
  /** Dynamic body representing the vehicle chassis. */
  readonly chassis: RigidBody;
  /** Optional world used to query static ground for wheel suspension. */
  readonly world?: PhysicsWorld;
  /** Maximum forward engine force applied by full throttle. */
  readonly maxEngineForce?: number;
  /** Maximum horizontal brake damping applied by full brake. */
  readonly maxBrakeForce?: number;
  /** Maximum chassis yaw rate at full steering. */
  readonly steeringRate?: number;
  /** Maximum horizontal speed in world units per second. */
  readonly maxSpeed?: number;
}

/** Per-wheel state exposed for CPU rendering and diagnostics. */
export interface VehicleWheel {
  /** Chassis-local wheel connection point. */
  readonly connectionPoint: Vector3;
  /** Chassis-local suspension direction. */
  readonly direction: Vector3;
  /** Chassis-local wheel axle direction. */
  readonly axle: Vector3;
  /** Suspension travel at rest in world units. */
  readonly suspensionRestLength: number;
  /** Wheel radius in world units. */
  readonly radius: number;
  /** Wheel width in world units. */
  readonly width: number;
  /** Current steering angle in radians. */
  steering: number;
  /** Current engine force in world units. */
  engineForce: number;
  /** Current brake force in the range 0..1. */
  brake: number;
  /** Current suspension extension in world units. */
  suspensionLength: number;
  /** Accumulated wheel rotation in radians. */
  rotation: number;
}

interface VehicleInputState {
  forward: number;
  right: number;
  brake: number;
  reset: boolean;
}

/**
 * Deterministic CPU vehicle controller for Canvas2D physics examples.
 *
 * The controller intentionally models translational chassis motion and wheel
 * suspension only. It provides the same application-facing wheel/query
 * surface used by THREE's Rapier vehicle example without requiring WASM,
 * angular rigid-body state, or a GPU renderer.
 */
export class VehicleController {
  /** Chassis body driven by this controller. */
  readonly chassis: RigidBody;
  /** Optional world used for static ground queries. */
  readonly world: PhysicsWorld | undefined;
  /** Maximum forward engine force. */
  readonly maxEngineForce: number;
  /** Maximum horizontal brake damping. */
  readonly maxBrakeForce: number;
  /** Maximum yaw rate at full steering. */
  readonly steeringRate: number;
  /** Maximum horizontal speed. */
  readonly maxSpeed: number;
  /** Wheel state in registration order. */
  readonly wheels: VehicleWheel[] = [];
  /** Current normalized input state. */
  readonly input: VehicleInputState = {
    forward: 0,
    right: 0,
    brake: 0,
    reset: false,
  };

  #heading = 0;
  #initialPosition: Vector3;
  #initialVelocity: Vector3;

  /** Creates a controller around an existing dynamic chassis body. */
  constructor(options: VehicleControllerOptions) {
    if (!options.chassis)
      throw new TypeError("VehicleController requires a chassis.");
    if (!options.chassis.dynamic)
      throw new TypeError("VehicleController chassis must be dynamic.");
    this.chassis = options.chassis;
    this.world = options.world;
    this.maxEngineForce = positiveFinite(
      options.maxEngineForce ?? 28,
      "maxEngineForce",
    );
    this.maxBrakeForce = positiveFinite(
      options.maxBrakeForce ?? 8,
      "maxBrakeForce",
    );
    this.steeringRate = positiveFinite(
      options.steeringRate ?? 1.4,
      "steeringRate",
    );
    this.maxSpeed = positiveFinite(options.maxSpeed ?? 18, "maxSpeed");
    this.#initialPosition = this.chassis.position.clone();
    this.#initialVelocity = this.chassis.velocity.clone();
    this.#heading = this.chassis.node?.rotation.y ?? 0;
  }

  /** Adds a wheel and returns its stable index. */
  addWheel(
    connectionPoint: Vector3,
    direction: Vector3 = new Vector3(0, -1, 0),
    axle: Vector3 = new Vector3(-1, 0, 0),
    suspensionRestLength: number = 0.8,
    radius: number = 0.3,
    width: number = 0.4,
  ): number {
    if (!isFiniteVector(connectionPoint))
      throw new RangeError(
        "VehicleController wheel connectionPoint must be finite.",
      );
    const normalizedDirection = finiteUnit(direction, "direction");
    const normalizedAxle = finiteUnit(axle, "axle");
    const rest = positiveFinite(suspensionRestLength, "suspensionRestLength");
    const wheelRadius = positiveFinite(radius, "radius");
    const wheelWidth = positiveFinite(width, "width");
    const wheel: VehicleWheel = {
      connectionPoint: connectionPoint.clone(),
      direction: normalizedDirection,
      axle: normalizedAxle,
      suspensionRestLength: rest,
      radius: wheelRadius,
      width: wheelWidth,
      steering: 0,
      engineForce: 0,
      brake: 0,
      suspensionLength: rest,
      rotation: 0,
    };
    this.wheels.push(wheel);
    return this.wheels.length - 1;
  }

  /** Sets the steering angle for one wheel. */
  setWheelSteering(index: number, angle: number): this {
    const wheel = this.getWheel(index);
    if (!Number.isFinite(angle))
      throw new RangeError("Wheel steering must be finite.");
    wheel.steering = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, angle));
    return this;
  }

  /** Sets the signed engine force for one wheel. */
  setWheelEngineForce(index: number, force: number): this {
    const wheel = this.getWheel(index);
    if (!Number.isFinite(force))
      throw new RangeError("Wheel engine force must be finite.");
    wheel.engineForce = force;
    return this;
  }

  /** Sets normalized brake force for one wheel. */
  setWheelBrake(index: number, brake: number): this {
    const wheel = this.getWheel(index);
    if (!Number.isFinite(brake))
      throw new RangeError("Wheel brake must be finite.");
    wheel.brake = clamp01(brake);
    return this;
  }

  /** Replaces normalized input values and returns this controller. */
  setInput(input: VehicleInput = {}): this {
    this.input.forward = clamp11(input.forward ?? this.input.forward);
    this.input.right = clamp11(input.right ?? this.input.right);
    this.input.brake = clamp01(input.brake ?? this.input.brake);
    this.input.reset = input.reset === true;
    return this;
  }

  /** Advances heading, throttle, braking, wheel rotation, and suspension. */
  update(deltaSeconds: number, input?: VehicleInput): this {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0)
      throw new RangeError(
        "VehicleController deltaSeconds must be finite and non-negative.",
      );
    if (input !== undefined) this.setInput(input);
    if (this.input.reset) {
      this.reset();
      this.input.reset = false;
    }
    const steering = this.input.right * this.steeringRate;
    const speed = Math.hypot(this.chassis.velocity.x, this.chassis.velocity.z);
    this.#heading += steering * Math.min(1, speed / 2) * deltaSeconds;
    if (this.chassis.node) this.chassis.node.rotation.y = this.#heading;
    const forward = new Vector3(0, 0, -1).applyAxisAngle(
      new Vector3(0, 1, 0),
      this.#heading,
    );
    const configuredForce = this.wheels.reduce(
      (total, wheel) => total + wheel.engineForce,
      0,
    );
    const force =
      configuredForce !== 0
        ? configuredForce
        : this.input.forward * this.maxEngineForce;
    const commandedForce = this.input.brake > 0 ? 0 : force;
    this.chassis.velocity.addScaledVector(
      forward,
      commandedForce * deltaSeconds,
    );
    const horizontalSpeed = Math.hypot(
      this.chassis.velocity.x,
      this.chassis.velocity.z,
    );
    if (horizontalSpeed > this.maxSpeed) {
      const scale = this.maxSpeed / horizontalSpeed;
      this.chassis.velocity.x *= scale;
      this.chassis.velocity.z *= scale;
    }
    const configuredBrake = this.wheels.reduce(
      (maximum, wheel) => Math.max(maximum, wheel.brake),
      0,
    );
    const brake =
      Math.max(configuredBrake, this.input.brake) * this.maxBrakeForce;
    if (brake > 0 && deltaSeconds > 0) {
      const damping = Math.max(0, 1 - brake * deltaSeconds);
      this.chassis.velocity.x *= damping;
      this.chassis.velocity.z *= damping;
    }
    for (const wheel of this.wheels) {
      wheel.rotation += (horizontalSpeed * deltaSeconds) / wheel.radius;
      wheel.suspensionLength = this.computeSuspensionLength(wheel);
    }
    return this;
  }

  /** Restores the chassis and clears velocity/input state. */
  reset(position: Vector3 = this.#initialPosition): this {
    this.chassis.position.copy(position);
    this.chassis.velocity.copy(this.#initialVelocity);
    this.input.forward = 0;
    this.input.right = 0;
    this.input.brake = 0;
    this.input.reset = false;
    this.#heading = this.chassis.node?.rotation.y ?? 0;
    this.chassis.syncToNode();
    return this;
  }

  /** Returns the chassis-local connection point for a wheel. */
  wheelChassisConnectionPointCs(
    index: number,
    target: Vector3 = new Vector3(),
  ): Vector3 {
    return target.copy(this.getWheel(index).connectionPoint);
  }

  /** Returns the chassis-local wheel axle for a wheel. */
  wheelAxleCs(index: number, target: Vector3 = new Vector3()): Vector3 {
    return target.copy(this.getWheel(index).axle);
  }

  /** Returns the current suspension extension for a wheel. */
  wheelSuspensionLength(index: number): number {
    return this.getWheel(index).suspensionLength;
  }

  /** Returns the current steering angle for a wheel. */
  wheelSteering(index: number): number {
    return this.getWheel(index).steering;
  }

  /** Returns the accumulated wheel rotation for a wheel. */
  wheelRotation(index: number): number {
    return this.getWheel(index).rotation;
  }

  /** Computes a wheel connection point in world coordinates. */
  wheelWorldPosition(index: number, target: Vector3 = new Vector3()): Vector3 {
    const wheel = this.getWheel(index);
    const offset = target
      .copy(wheel.connectionPoint)
      .applyAxisAngle(new Vector3(0, 1, 0), this.#heading);
    return offset.add(this.chassis.position);
  }

  /** Releases wheel state owned by this controller. */
  dispose(): void {
    this.wheels.length = 0;
  }

  /** Returns a validated mutable wheel record by index. */
  getWheel(index: number): VehicleWheel {
    if (
      !Number.isSafeInteger(index) ||
      index < 0 ||
      index >= this.wheels.length
    )
      throw new RangeError(
        `VehicleController wheel index ${index} is out of range.`,
      );
    return this.wheels[index] as VehicleWheel;
  }

  /** Computes one wheel's suspension extension against static world shapes. */
  computeSuspensionLength(wheel: VehicleWheel): number {
    const point = this.wheelWorldPosition(this.wheels.indexOf(wheel));
    let groundY = Number.NEGATIVE_INFINITY;
    for (const body of this.world?.bodies ?? []) {
      if (body.inverseMass !== 0) continue;
      if (body.shape.type === "heightfield") {
        const shape = body.shape as HeightfieldShape;
        const height = shape.getHeightAt(
          point.x - body.position.x,
          point.z - body.position.z,
        );
        if (height !== undefined)
          groundY = Math.max(groundY, body.position.y + height);
      } else if (body.shape.type === "aabb") {
        const shape = body.shape as AABBShape;
        if (
          Math.abs(point.x - body.position.x) <= shape.halfExtents.x &&
          Math.abs(point.z - body.position.z) <= shape.halfExtents.z
        ) {
          groundY = Math.max(groundY, body.position.y + shape.halfExtents.y);
        }
      }
    }
    if (!Number.isFinite(groundY)) return wheel.suspensionRestLength;
    return Math.max(
      0,
      Math.min(wheel.suspensionRestLength, point.y - groundY - wheel.radius),
    );
  }
}

function isFiniteVector(value: Vector3): boolean {
  return (
    Number.isFinite(value.x) &&
    Number.isFinite(value.y) &&
    Number.isFinite(value.z)
  );
}

function finiteUnit(value: Vector3, name: string): Vector3 {
  if (!isFiniteVector(value) || value.lengthSq <= Number.EPSILON)
    throw new RangeError(
      `VehicleController wheel ${name} must be non-zero and finite.`,
    );
  return value.clone().normalize();
}

function positiveFinite(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0)
    throw new RangeError(
      `VehicleController ${name} must be positive and finite.`,
    );
  return value;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value))
    throw new RangeError("VehicleController value must be finite.");
  return Math.max(0, Math.min(1, value));
}

function clamp11(value: number): number {
  if (!Number.isFinite(value))
    throw new RangeError("VehicleController value must be finite.");
  return Math.max(-1, Math.min(1, value));
}
