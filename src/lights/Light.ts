import { Node, type NodeJSON } from "../core/Node.ts";
import { Color } from "../math/Color.ts";

/** Canonical serialized state shared by every EASEL light. */
export interface LightJSON extends NodeJSON {
  /** RGB color multiplied into the light contribution. */
  color: number;
  /** Base light intensity multiplier used during CPU light baking. */
  intensity: number;
}

function assertFiniteNumber(value: number, path: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Light.toJSON requires finite ${path}.`);
  }
}

function assertFiniteColor(color: Color, path: string): void {
  assertFiniteNumber(color.r, `${path}.r`);
  assertFiniteNumber(color.g, `${path}.g`);
  assertFiniteNumber(color.b, `${path}.b`);
}

/** Abstract base class for scene lights. */
export class Light extends Node {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "Light";

  /** RGB color multiplied into the light contribution. */
  color: Color;

  /** Base light intensity multiplier used during CPU light baking. */
  intensity: number;

  /** Constructs a base light with color and intensity for CPU baking. */
  constructor(
    color: Color | number | string = 0xffffff,
    intensity: number = 1,
  ) {
    super();
    this.color = color instanceof Color ? color : new Color(color);
    this.intensity = intensity;
  }

  /** Creates an independent copy with cloned owned state. */
  override clone(): Light {
    return new Light().copy(this);
  }

  /** Copies public state from `source` into this instance and returns `this`. */
  override copy(source: Light, recursive: boolean = true): this {
    super.copy(source, recursive);
    this.color.copy(source.color);
    this.intensity = source.intensity;
    return this;
  }

  /** Serializes node state plus the light's packed color and intensity. */
  override toJSON(): LightJSON {
    const nodeJSON = super.toJSON();
    assertFiniteColor(this.color, `${this.type}.color`);
    assertFiniteNumber(this.intensity, `${this.type}.intensity`);

    const json: LightJSON = {
      ...nodeJSON,
      color: this.color.hex,
      intensity: this.intensity,
    };
    assertFiniteNumber(json.color, `${this.type}.toJSON.color`);
    assertFiniteNumber(json.intensity, `${this.type}.toJSON.intensity`);
    return json;
  }
}
