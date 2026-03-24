import { Node } from "../core/Node.ts";
import type { Geometry } from "../geometry/Geometry.ts";
import type { Material } from "../materials/Material.ts";

/** Point cloud rendered as individual vertices. */
export class Points extends Node {
	override type = "Points";

	geometry: Geometry | undefined;

	material: Material | undefined;

	constructor(
		geometry: Geometry | undefined = undefined,
		material: Material | undefined = undefined,
	) {
		super();
		this.geometry = geometry;
		this.material = material;
	}

	override clone(): Points {
		return new Points(this.geometry, this.material).copy(this);
	}

	override copy(source: Points, recursive = true): this {
		super.copy(source, recursive);
		this.geometry = source.geometry;
		this.material = source.material;
		return this;
	}
}
