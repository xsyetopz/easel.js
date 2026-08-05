import { LightType } from "../core/Constants.ts";
import type { Node } from "../core/Node.ts";
import type { Color } from "../math/Color.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Light, type LightJSON } from "./Light.ts";

/** Serialized state for a spot light. */
export interface SpotLightJSON extends LightJSON {
  /** Maximum influence distance in world units; zero means no finite cutoff. */
  distance: number;
  /** Spotlight cone half-angle in radians. */
  angle: number;
  /** Penumbra fraction in the inclusive range [0, 1]. */
  penumbra: number;
  /** Distance attenuation exponent applied to point or spot light intensity. */
  decay: number;
}

function assertFiniteSpotNumber(value: number, path: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`SpotLight.${path} must be finite.`);
  }
}

/**
 * Per-vertex cone attenuation, CPU-computed.
 * When target is set, direction is computed as normalize(target world pos - light world pos).
 */
export class SpotLight extends Light {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "SpotLight";

  /** Runtime light type identifier used by dispatch and serialization. */
  lightType: number = LightType.Spot;

  /** Local-space cone direction. */
  direction: Vector3 = new Vector3(0, -1, 0);

  /**
   * Optional target node. When set, overrides direction.
   * Direction becomes normalize(target.matrixWorld position - this.matrixWorld position).
   */
  target: Node | undefined = undefined;

  /** Maximum influence distance in world units; zero means no finite cutoff. */
  distance: number;

  #angle: number = Math.PI / 3;
  #penumbra = 0;
  #cosAngle: number = Math.cos(Math.PI / 3);
  #cosInnerAngle: number = Math.cos(Math.PI / 3);

  /** Precomputed cosine of the cone angle for per-vertex lighting. */
  get cosAngle(): number {
    return this.#cosAngle;
  }

  /** Precomputed cosine of the penumbra-adjusted cone angle. */
  get cosInnerAngle(): number {
    return this.#cosInnerAngle;
  }

  /** Distance attenuation exponent applied to point or spot light intensity. */
  decay: number;

  /** Spotlight cone half-angle in radians. */
  get angle(): number {
    return this.#angle;
  }

  /** Sets the spotlight cone half-angle and refreshes cached cosine limits. */
  set angle(value: number) {
    this.#angle = value;
    this.#updateTrig();
  }

  /** Penumbra fraction in the inclusive range [0, 1]. */
  get penumbra(): number {
    return this.#penumbra;
  }

  /** Sets the penumbra fraction and refreshes cached cosine limits. */
  set penumbra(value: number) {
    this.#penumbra = value;
    this.#updateTrig();
  }

  #updateTrig(): void {
    this.#cosAngle = Math.cos(this.#angle);
    this.#cosInnerAngle = Math.cos(this.#angle * (1 - this.#penumbra));
  }

  /** Constructs a cone-limited, distance-attenuated light for CPU baking. */
  constructor(
    color: Color | number | string = 0xffffff,
    intensity: number = 1,
    distance: number = 0,
    angle: number = Math.PI / 3,
    penumbra: number = 0,
    decay: number = 2,
  ) {
    super(color, intensity);
    this.distance = distance;
    // Use setters to initialize cached trig values.
    this.#angle = angle;
    this.#penumbra = penumbra;
    this.#updateTrig();
    this.decay = decay;
  }

  /** Radiometric convenience value derived from intensity. */
  get power(): number {
    return this.intensity * Math.PI;
  }

  /** Sets power and derives the corresponding intensity. */
  set power(value: number) {
    assertFiniteSpotNumber(value, "power");
    this.intensity = value / Math.PI;
  }

  /** Copies public state from `source` into this instance and returns `this`. */
  override copy(source: SpotLight, recursive: boolean = true): this {
    super.copy(source, recursive);
    this.direction.copy(source.direction);
    this.target = source.target;
    this.distance = source.distance;
    this.angle = source.angle;
    this.penumbra = source.penumbra;
    this.decay = source.decay;
    return this;
  }

  /** Creates an independent copy with cloned owned state. */
  override clone(): SpotLight {
    return new SpotLight().copy(this);
  }

  /** Serializes this light, including its node and lighting state. */
  override toJSON(): SpotLightJSON {
    const nodeJSON = super.toJSON();
    assertFiniteSpotNumber(this.distance, "distance");
    assertFiniteSpotNumber(this.angle, "angle");
    assertFiniteSpotNumber(this.penumbra, "penumbra");
    assertFiniteSpotNumber(this.decay, "decay");
    const json: SpotLightJSON = {
      ...nodeJSON,
      distance: this.distance,
      angle: this.angle,
      penumbra: this.penumbra,
      decay: this.decay,
    };
    assertFiniteSpotNumber(json.distance, "distance");
    assertFiniteSpotNumber(json.angle, "angle");
    assertFiniteSpotNumber(json.penumbra, "penumbra");
    assertFiniteSpotNumber(json.decay, "decay");
    return json;
  }
}
