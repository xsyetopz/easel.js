import { LightType } from "../core/Constants.ts";
import type { ColorValue } from "../math/Color.ts";
import { Light } from "./Light.ts";

/** Flat scene-wide brightness added uniformly to all vertices. */
export class AmbientLight extends Light {
  override type = "AmbientLight";

  lightType: number = LightType.Ambient;

  constructor(color: ColorValue | number = 0xffffff, intensity = 1) {
    super(color, intensity);
  }
}
