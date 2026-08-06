import { LightType } from "../core/Constants.ts";
import { Light, type LightJSON } from "./Light.ts";

/** Serialized state for a rectangular area light. */
export interface RectAreaLightJSON extends LightJSON {
  /** Width of the rectangular area in world units. */
  width: number;
  /** Height of the rectangular area in world units. */
  height: number;
}

function assertFiniteRectAreaNumber(value: number, path: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`RectAreaLight.${path} must be finite.`);
  }
}

/** Rectangular area light for CPU vertex baking. */
export class RectAreaLight extends Light {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "RectAreaLight";

  /** Runtime light type identifier used by dispatch and serialization. */
  lightType: number = LightType.RectArea;

  /** Width of the rectangular area in world units. */
  width: number;

  /** Height of the rectangular area in world units. */
  height: number;

  /** Constructs a rectangular area light for CPU baking. */
  constructor(
    color: number | string = 0xffffff,
    intensity: number = 1,
    width: number = 10,
    height: number = 10,
  ) {
    super(color, intensity);
    this.width = width;
    this.height = height;
  }

  /** Radiometric convenience value derived from intensity and area. */
  get power(): number {
    return this.intensity * this.width * this.height * Math.PI;
  }

  /** Sets power and derives the corresponding intensity. */
  set power(value: number) {
    assertFiniteRectAreaNumber(value, "power");
    this.intensity = value / (this.width * this.height * Math.PI);
  }

  /** Copies public state from `source` into this instance and returns `this`. */
  override copy(source: RectAreaLight, recursive: boolean = true): this {
    super.copy(source, recursive);
    this.width = source.width;
    this.height = source.height;
    return this;
  }

  /** Creates an independent copy with cloned owned state. */
  override clone(): RectAreaLight {
    return new RectAreaLight().copy(this);
  }

  /** Serializes this light, including its node and lighting state. */
  override toJSON(): RectAreaLightJSON {
    const nodeJSON = super.toJSON();
    assertFiniteRectAreaNumber(this.width, "width");
    assertFiniteRectAreaNumber(this.height, "height");
    const json: RectAreaLightJSON = {
      ...nodeJSON,
      width: this.width,
      height: this.height,
    };
    assertFiniteRectAreaNumber(json.width, "width");
    assertFiniteRectAreaNumber(json.height, "height");
    return json;
  }
}
