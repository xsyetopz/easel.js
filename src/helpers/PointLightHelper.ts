import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import type { PointLight } from "../lights/PointLight.ts";
import { Mesh } from "../objects/Mesh.ts";

/** Visualises a PointLight as a small diamond wireframe at its position. */
export class PointLightHelper extends Mesh {
	override type = "PointLightHelper";

	#light: PointLight;

	constructor(light: PointLight, size = 1) {
		const s = size / 2;

		const geometry = new Geometry();
		geometry.setAttribute(
			"position",
			new Attribute(
				new Float32Array([
					0,
					s,
					0,
					0,
					-s,
					0,
					s,
					0,
					0,
					-s,
					0,
					0,
					0,
					0,
					s,
					0,
					0,
					-s,
				]),
				3,
			),
		);
		geometry.setIndex([
			0, 2, 4, 0, 4, 3, 0, 3, 5, 0, 5, 2, 1, 4, 2, 1, 3, 4, 1, 5, 3, 1, 2, 5,
		]);

		super(geometry);

		this.#light = light;
		this.update();
	}

	update(): void {
		const light = this.#light;
		if (!light) return;
		this.position.copy(light.position);
	}

	dispose(): void {
		this.geometry?.dispose();
	}
}
