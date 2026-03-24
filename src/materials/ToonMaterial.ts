import { Shading } from "../core/Constants.ts";
import { Color } from "../math/Color.ts";
import type { Texture } from "../textures/Texture.ts";
import { Material } from "./Material.ts";

interface ToonMaterialOptions {
	color?: Color | number | string;
	gradientMap?: Texture | undefined;
	layer?: number;
	opacity?: number;
	side?: number;
}

/**
 * Stepped shading via gradientMap. Each lighting level snaps to
 * the nearest HSL16 step.
 */
export class ToonMaterial extends Material {
	override type = "ToonMaterial";

	color: Color;

	gradientMap: Texture | undefined = undefined;

	constructor(options: ToonMaterialOptions = {}) {
		super(options);
		this.shading = Shading.Gouraud;
		this.color =
			options.color instanceof Color
				? options.color
				: new Color(options.color ?? 0xffffff);
		if (options.gradientMap !== undefined) {
			this.gradientMap = options.gradientMap;
		}
	}

	override clone(): ToonMaterial {
		return new ToonMaterial().copy(this);
	}

	override copy(source: ToonMaterial): this {
		super.copy(source);
		this.color.copy(source.color);
		this.gradientMap = source.gradientMap;
		return this;
	}
}
