import { Shading, Side } from "../core/Constants.ts";

let _materialId = 0;

export interface MaterialOptions {
	layer?: number;
	opacity?: number;
	shading?: number;
	side?: number;
}

/** Base material. All materials share layer, opacity, shading, and side. */
export class Material {
	id: number = _materialId++;

	name = "";

	type = "Material";

	/** Draw order within a tile. Higher values draw later. */
	layer = 0;

	/**
	 * Discrete translucency. 0 = fully opaque, 8 = nearly transparent.
	 * Nine steps, precomputed. Replaces both float opacity and transparent bool.
	 */
	opacity = 0;

	/** Shading model: Shading.Flat or Shading.Gouraud. */
	shading: number = Shading.Flat;

	/** Face culling: Side.Front, Side.Back, or Side.Double. */
	side: number = Side.Front;

	visible = true;

	needsUpdate = false;

	constructor(options: MaterialOptions = {}) {
		if (options.layer !== undefined) this.layer = options.layer;
		if (options.opacity !== undefined) this.opacity = options.opacity;
		if (options.shading !== undefined) this.shading = options.shading;
		if (options.side !== undefined) this.side = options.side;
	}

	clone(): Material {
		return new Material().copy(this);
	}

	copy(source: Material): this {
		this.name = source.name;
		this.layer = source.layer;
		this.opacity = source.opacity;
		this.shading = source.shading;
		this.side = source.side;
		this.visible = source.visible;
		return this;
	}

	dispose(): void {
		// subclasses may override
	}
}
