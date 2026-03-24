import { Node } from "../core/Node.ts";
import { Color } from "../math/Color.ts";

/** Abstract base class for scene lights. */
export class Light extends Node {
	override type = "Light";

	color: Color;

	intensity: number;

	constructor(color: Color | number | string = 0xffffff, intensity = 1) {
		super();
		this.color = color instanceof Color ? color : new Color(color);
		this.intensity = intensity;
	}

	override clone(): Light {
		return new Light().copy(this);
	}

	override copy(source: Light, recursive = true): this {
		super.copy(source, recursive);
		this.color.copy(source.color);
		this.intensity = source.intensity;
		return this;
	}
}
