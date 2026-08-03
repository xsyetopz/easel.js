import { LightType } from "../core/Constants.ts";
import type { Node } from "../core/Node.ts";
import { Light } from "./Light.ts";

/**
 * Per-face or per-vertex depending on material shading mode.
 * Position determines direction when target is undefined.
 * When target is set, direction is computed as normalize(target world pos - light world pos).
 * No shadow support.
 */
export class DirectionalLight extends Light {
  override type = "DirectionalLight";

  lightType: number = LightType.Directional;

  /**
   * Optional target node. When set, overrides position-based direction.
   * Direction becomes normalize(target.matrixWorld position - this.matrixWorld position).
   */
  target: Node | undefined = undefined;

  constructor(color: number | string = 0xffffff, intensity = 1) {
    super(color, intensity);
    this.position.set(0, 1, 0);
  }
}
