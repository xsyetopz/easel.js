import { LightType } from "../core/Constants.ts";
import { Light } from "./Light.ts";

/** Per-vertex distance attenuation, CPU-computed. */
export class PointLight extends Light {
	override type = "PointLight";

	lightType: number = LightType.Point;

	distance: number;

	decay: number;

	/**
	 * @param distance 0 means no limit.
	 */
	constructor(
		color: number | string = 0xffffff,
		intensity = 1,
		distance = 0,
		decay = 2,
	) {
		super(color, intensity);
		this.distance = distance;
		this.decay = decay;
	}

	override copy(source: PointLight, recursive = true): this {
		super.copy(source, recursive);
		this.distance = source.distance;
		this.decay = source.decay;
		return this;
	}
}
