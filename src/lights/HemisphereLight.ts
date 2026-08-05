import { LightType } from "../core/Constants.ts";
import type { ColorValue } from "../math/Color.ts";
import { Color } from "../math/Color.ts";
import { Light, type LightJSON } from "./Light.ts";

/** Serialized state for a hemisphere light. */
export interface HemisphereLightJSON extends LightJSON {
  /** Color contributed from the lower hemisphere. */
  groundColor: number;
}

function assertFiniteGroundColor(color: Color): void {
  if (
    !(
      Number.isFinite(color.r) &&
      Number.isFinite(color.g) &&
      Number.isFinite(color.b)
    )
  ) {
    throw new RangeError(
      "HemisphereLight.toJSON requires finite groundColor channels.",
    );
  }
}

/** Per-vertex sky/ground blend evaluated against the prepared light direction. */
export class HemisphereLight extends Light {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "HemisphereLight";

  /** Runtime light type identifier used by dispatch and serialization. */
  lightType: number = LightType.Hemisphere;

  /** Color contributed from the lower hemisphere. */
  groundColor: Color;

  /** Constructs a sky/ground light blended per vertex during baking. */
  constructor(
    skyColor: ColorValue = 0xffffff,
    groundColor: ColorValue = 0xffffff,
    intensity: number = 1,
  ) {
    super(skyColor, intensity);
    this.groundColor =
      groundColor instanceof Color ? groundColor : new Color(groundColor);
    this.position.set(0, 1, 0);
  }

  /** Copies public state from `source` into this instance and returns `this`. */
  override copy(source: HemisphereLight, recursive: boolean = true): this {
    super.copy(source, recursive);
    this.groundColor.copy(source.groundColor);
    return this;
  }

  /** Creates an independent copy with cloned owned state. */
  override clone(): HemisphereLight {
    return new HemisphereLight().copy(this);
  }

  /** Serializes this light, including its node and lighting state. */
  override toJSON(): HemisphereLightJSON {
    const nodeJSON = super.toJSON();
    assertFiniteGroundColor(this.groundColor);
    const json: HemisphereLightJSON = {
      ...nodeJSON,
      groundColor: this.groundColor.hex,
    };
    if (!Number.isFinite(json.groundColor)) {
      throw new RangeError(
        "HemisphereLight.toJSON requires finite groundColor.",
      );
    }
    return json;
  }
}
