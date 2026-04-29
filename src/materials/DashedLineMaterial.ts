import type { Color } from "../math/Color.ts";
import { LineMaterial } from "./LineMaterial.ts";

interface DashedLineMaterialOptions {
	color?: Color | number | string;
	linewidth?: number;
	dashSize?: number;
	gapSize?: number;
	layer?: number;
	opacity?: number;
	transparent?: boolean;
	depthTest?: boolean;
	depthWrite?: boolean;
}

/** Line material that renders a repeating dash pattern. */
export class DashedLineMaterial extends LineMaterial {
	override type = "DashedLineMaterial";

	dashSize = 3;

	gapSize = 1;

	constructor(options: DashedLineMaterialOptions = {}) {
		super(options);
		if (options.dashSize !== undefined) this.dashSize = options.dashSize;
		if (options.gapSize !== undefined) this.gapSize = options.gapSize;
	}

	override clone(): DashedLineMaterial {
		return new DashedLineMaterial().copy(this);
	}

	override copy(source: DashedLineMaterial): this {
		super.copy(source);
		this.dashSize = source.dashSize;
		this.gapSize = source.gapSize;
		return this;
	}
}
