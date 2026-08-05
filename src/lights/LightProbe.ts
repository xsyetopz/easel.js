import { SphericalHarmonics3 } from "../math/SphericalHarmonics3.ts";
import { Light, type LightJSON } from "./Light.ts";

/** Serialized diffuse spherical-harmonic light probe. */
export interface LightProbeJSON extends LightJSON {
  /** Twenty-seven RGB spherical-harmonic coefficient components. */
  sh: number[];
}

/** Diffuse environment lighting evaluated only during flat or Gouraud baking. */
export class LightProbe extends Light {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "LightProbe";

  /** 27 RGB spherical-harmonic coefficients used for diffuse CPU lighting. */
  sh: SphericalHarmonics3;

  /** Constructs a diffuse spherical-harmonic probe for CPU light baking. */
  constructor(
    sh: SphericalHarmonics3 = new SphericalHarmonics3(),
    intensity = 1,
  ) {
    super(undefined, intensity);
    this.sh = sh;
  }

  /** Returns `true` for this concrete type. */
  get isLightProbe(): true {
    return true;
  }

  /** Copies probe state while retaining this probe's coefficient storage. */
  override copy(source: LightProbe, recursive: boolean = true): this {
    super.copy(source, recursive);
    this.sh.copy(source.sh);
    return this;
  }

  /** Returns an independent light probe. */
  override clone(): LightProbe {
    return new LightProbe().copy(this);
  }

  /** Serializes node, light, and spherical-harmonic state. */
  override toJSON(): LightProbeJSON {
    const sh = this.sh.toArray();
    for (const coefficient of sh) {
      if (!Number.isFinite(coefficient)) {
        throw new RangeError(
          "LightProbe.toJSON requires finite SH coefficients.",
        );
      }
    }
    return { ...super.toJSON(), sh };
  }
}
