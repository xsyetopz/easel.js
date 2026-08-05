import { LightType } from "../core/Constants.ts";
import { Light, type LightJSON } from "./Light.ts";

/** Serialized state for a point light. */
export interface PointLightJSON extends LightJSON {
  /** Maximum influence distance in world units; zero means no finite cutoff. */
  distance: number;
  /** Distance attenuation exponent applied to point or spot light intensity. */
  decay: number;
}

function assertFinitePointNumber(value: number, path: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`PointLight.${path} must be finite.`);
  }
}

/** Per-vertex distance attenuation, CPU-computed. */
export class PointLight extends Light {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "PointLight";

  /** Runtime light type identifier used by dispatch and serialization. */
  lightType: number = LightType.Point;

  /** Maximum influence distance in world units; zero means no finite cutoff. */
  distance: number;

  /** Distance attenuation exponent applied to point or spot light intensity. */
  decay: number;

  /**
   * Constructs a distance-attenuated point light for CPU vertex baking.
   * @param distance 0 means no limit.
   */
  constructor(
    color: number | string = 0xffffff,
    intensity: number = 1,
    distance: number = 0,
    decay: number = 2,
  ) {
    super(color, intensity);
    this.distance = distance;
    this.decay = decay;
  }

  /** Radiometric convenience value derived from intensity. */
  get power(): number {
    return this.intensity * 4 * Math.PI;
  }

  /** Sets power and derives the corresponding intensity. */
  set power(value: number) {
    assertFinitePointNumber(value, "power");
    this.intensity = value / (4 * Math.PI);
  }

  /** Copies public state from `source` into this instance and returns `this`. */
  override copy(source: PointLight, recursive: boolean = true): this {
    super.copy(source, recursive);
    this.distance = source.distance;
    this.decay = source.decay;
    return this;
  }

  /** Creates an independent copy with cloned owned state. */
  override clone(): PointLight {
    return new PointLight().copy(this);
  }

  /** Serializes this light, including its node and lighting state. */
  override toJSON(): PointLightJSON {
    const nodeJSON = super.toJSON();
    assertFinitePointNumber(this.distance, "distance");
    assertFinitePointNumber(this.decay, "decay");
    const json: PointLightJSON = {
      ...nodeJSON,
      distance: this.distance,
      decay: this.decay,
    };
    assertFinitePointNumber(json.distance, "distance");
    assertFinitePointNumber(json.decay, "decay");
    return json;
  }
}
