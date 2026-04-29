import { Shading, Side } from "../core/Constants.ts";

let _materialId = 0;

export interface MaterialOptions {
	layer?: number;
	opacity?: number;
	transparent?: boolean;
	depthTest?: boolean;
	depthWrite?: boolean;
	shading?: number;
	side?: number;
}

/** Base material. All materials share layer, opacity, depth flags, shading, and side. */
export class Material {
	id: number = _materialId++;

	name = "";

	type = "Material";

	/** Draw order within a tile. Higher values draw later. */
	layer = 0;

	/**
	 * Discrete translucency. 0 = fully opaque, 8 = nearly transparent.
	 * Nine steps, precomputed. Used for blending only when transparent is true.
	 */
	opacity = 0;

	/** Enables translucent blending. Opacity only blends when this is true. */
	transparent = false;

	/** Enables depth testing against the framebuffer depth buffer. */
	depthTest = true;

	/** Enables depth writes after a passing depth test. */
	depthWrite = true;

	/** Shading model: Shading.Flat or Shading.Gouraud. */
	shading: number = Shading.Flat;

	/** Face culling: Side.Front, Side.Back, or Side.Double. */
	side: number = Side.Front;

	visible = true;

	needsUpdate = false;

	constructor(options: MaterialOptions = {}) {
		if (options.layer !== undefined) this.layer = options.layer;
		if (options.opacity !== undefined) this.opacity = options.opacity;
		if (options.transparent !== undefined)
			this.transparent = options.transparent;
		if (options.depthTest !== undefined) this.depthTest = options.depthTest;
		if (options.depthWrite !== undefined) {
			this.depthWrite = options.depthWrite;
		} else if (options.transparent === true) {
			this.depthWrite = false;
		}
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
		this.transparent = source.transparent;
		this.depthTest = source.depthTest;
		this.depthWrite = source.depthWrite;
		this.shading = source.shading;
		this.side = source.side;
		this.visible = source.visible;
		return this;
	}

	dispose(): void {
		// subclasses may override
	}
}
