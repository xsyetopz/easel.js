import { LightType } from "../core/Constants.ts";
import type { ColorValue } from "../math/Color.ts";
import { Light } from "./Light.ts";

/** Flat scene-wide brightness added uniformly to all vertices. */
export class AmbientLight extends Light {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "AmbientLight";

  /** Runtime light type identifier used by dispatch and serialization. */
  lightType: number = LightType.Ambient;

  /** Constructs a scene-wide light contribution for CPU vertex baking. */
  constructor(color: ColorValue | number = 0xffffff, intensity: number = 1) {
    super(color, intensity);
  }

  /** Creates an independent copy with cloned owned state. */
  override clone(): AmbientLight {
    return new AmbientLight().copy(this);
  }
}
