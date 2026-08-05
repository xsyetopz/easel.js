import { LightType } from "../core/Constants.ts";
import type { Node } from "../core/Node.ts";
import { Light } from "./Light.ts";

/**
 * Per-face or per-vertex depending on material shading mode.
 * Local position determines direction when target is undefined. Traversal reads
 * the explicitly prepared world matrix and never updates matrices implicitly.
 * When target is set, direction is computed as normalize(target world pos - light world pos).
 * No shadow support.
 */
export class DirectionalLight extends Light {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "DirectionalLight";

  /** Runtime light type identifier used by dispatch and serialization. */
  lightType: number = LightType.Directional;

  /**
   * Optional target node. When set, overrides local-position-based direction.
   * Direction becomes normalize(target.matrixWorld position - this.matrixWorld position)
   * after explicit matrix preparation.
   */
  target: Node | undefined = undefined;

  /** Constructs a directional light with CPU-baked vertex illumination. */
  constructor(color: number | string = 0xffffff, intensity: number = 1) {
    super(color, intensity);
    this.position.set(0, 1, 0);
  }

  /** Creates an independent copy with cloned owned state. */
  override clone(): DirectionalLight {
    return new DirectionalLight().copy(this);
  }

  /** Copies public state from `source` into this instance and returns `this`. */
  override copy(source: DirectionalLight, recursive: boolean = true): this {
    super.copy(source, recursive);
    this.target = source.target;
    return this;
  }
}
