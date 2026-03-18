import { Attribute } from "../geometry/Attribute.js";
import { Geometry } from "../geometry/Geometry.js";
import { Mesh } from "../objects/Mesh.js";

/**
 * Visualises a PointLight as a small diamond wireframe at its position.
 */
export class PointLightHelper extends Mesh {
	/** @override @type {string} */
	type = "PointLightHelper";

	/** @type {*} */
	#light;

	/**
	 * @param {*} light - PointLight instance
	 * @param {number} [size=1]
	 */
	constructor(light, size = 1) {
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

	/** @returns {void} */
	update() {
		const light = this.#light;
		if (!light) return;
		this.position.copy(light.position);
	}

	/** @returns {void} */
	dispose() {
		this.geometry?.dispose();
	}
}
