import { Node } from "../core/Node.js";
import { Attribute } from "../geometry/Attribute.js";
import { Geometry } from "../geometry/Geometry.js";
import { Line } from "../objects/Line.js";

/**
 * Visualises a DirectionalLight as a square wireframe + direction line.
 */
export class DirectionalLightHelper extends Node {
	/** @override @type {string} */
	type = "DirectionalLightHelper";

	/** @type {*} */
	#light;

	/**
	 * @param {*} light - DirectionalLight instance
	 * @param {number} [size=1]
	 */
	constructor(light, size = 1) {
		super();

		this.#light = light;

		const h = size / 2;

		const squareGeo = new Geometry();
		squareGeo.setAttribute(
			"position",
			new Attribute(
				new Float32Array([-h, -h, 0, h, -h, 0, h, h, 0, -h, h, 0, -h, -h, 0]),
				3,
			),
		);
		this.add(new Line(squareGeo));

		const dirGeo = new Geometry();
		dirGeo.setAttribute(
			"position",
			new Attribute(new Float32Array([0, 0, 0, 0, 0, -size]), 3),
		);
		this.add(new Line(dirGeo));

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
		for (const child of this.children) {
			if ("geometry" in child) {
				/** @type {{ geometry?: { dispose(): void } }} */ (
					child
				).geometry?.dispose();
			}
		}
	}
}
