import { Color } from "../math/Color.ts";
import type { Texture } from "../textures/Texture.ts";
import { Material } from "./Material.ts";

interface PointsMaterialOptions {
	color?: Color | number | string;
	size?: number;
	map?: Texture | undefined;
	layer?: number;
	opacity?: number;
	transparent?: boolean;
	depthTest?: boolean;
	depthWrite?: boolean;
}

/** Material for Points objects. Size is an integer pixel radius. */
export class PointsMaterial extends Material {
	override type = "PointsMaterial";

	color: Color;

	/** Integer pixel radius. */
	size = 1;

	/** Signals the rasterizer to use point rendering. */
	points = true;

	map: Texture | undefined = undefined;

	constructor(options: PointsMaterialOptions = {}) {
		super(options);
		this.color =
			options.color instanceof Color
				? options.color
				: new Color(options.color ?? 0xffffff);
		if (options.size !== undefined) this.size = options.size;
		if (options.map !== undefined) this.map = options.map;
	}

	/** Alias for {@link size}, used by the rasterizer. */
	get pointRadius(): number {
		return this.size;
	}

	override clone(): PointsMaterial {
		return new PointsMaterial().copy(this);
	}

	override copy(source: PointsMaterial): this {
		super.copy(source);
		this.color.copy(source.color);
		this.size = source.size;
		this.map = source.map;
		return this;
	}
}
