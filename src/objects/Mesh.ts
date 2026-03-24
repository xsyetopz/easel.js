import { Node } from "../core/Node.ts";
import type { Geometry } from "../geometry/Geometry.ts";
import type { Material } from "../materials/Material.ts";

/** Triangulated surface with geometry and material. */
export class Mesh extends Node {
	override type = "Mesh";

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

	override clone(): Mesh {
		return new Mesh(this.geometry, this.material).copy(this);
	}

	override copy(source: Mesh, recursive = true): this {
		super.copy(source, recursive);
		this.geometry = source.geometry;
		this.material = source.material;
		return this;
	}
}
