import { LightType } from "../core/Constants.ts";
import type { ColorValue } from "../math/Color.ts";
import { Color } from "../math/Color.ts";
import { Light } from "./Light.ts";

/** Per-vertex sky/ground blend evaluated against world Y axis normal. */
export class HemisphereLight extends Light {
	override type = "HemisphereLight";

	lightType: number = LightType.Hemisphere;

	groundColor: Color;

	constructor(
		skyColor: ColorValue = 0xffffff,
		groundColor: ColorValue = 0xffffff,
		intensity = 1,
	) {
		super(skyColor, intensity);
		this.groundColor =
			groundColor instanceof Color ? groundColor : new Color(groundColor);
		this.position.set(0, 1, 0);
	}

	override copy(source: HemisphereLight, recursive = true): this {
		super.copy(source, recursive);
		this.groundColor.copy(source.groundColor);
		return this;
	}
}
