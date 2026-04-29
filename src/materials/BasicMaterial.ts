import { Shading } from "../core/Constants.ts";
import { Color } from "../math/Color.ts";
import type { Texture } from "../textures/Texture.ts";
import { Material } from "./Material.ts";

interface BasicMaterialOptions {
	color?: Color | number | string;
	map?: Texture | undefined;
	layer?: number;
	opacity?: number;
	transparent?: boolean;
	depthTest?: boolean;
	depthWrite?: boolean;
	shading?: number;
	side?: number;
}

/** Solid color or textured, no lighting. Defaults to flat shading. */
export class BasicMaterial extends Material {
	override type = "BasicMaterial";

	color: Color;

	map: Texture | undefined = undefined;

	constructor(options: BasicMaterialOptions = {}) {
		super(options);
		this.shading = options.shading ?? Shading.Flat;
		this.color =
			options.color instanceof Color
				? options.color
				: new Color(options.color ?? 0xffffff);
		if (options.map !== undefined) this.map = options.map;
	}

	override clone(): BasicMaterial {
		return new BasicMaterial().copy(this);
	}

	override copy(source: BasicMaterial): this {
		super.copy(source);
		this.color.copy(source.color);
		this.map = source.map;
		return this;
	}
}
