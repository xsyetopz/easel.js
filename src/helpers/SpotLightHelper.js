import { Node } from "../core/Node.js";
import { Attribute } from "../geometry/Attribute.js";
import { Geometry } from "../geometry/Geometry.js";
import { LineSegments } from "../objects/LineSegments.js";

/**
 * Visualises a SpotLight as a cone wireframe.
 */
export class SpotLightHelper extends Node {
	/** @override @type {string} */
	type = "SpotLightHelper";

	/** @type {*} */
	#light;

	/**
	 * @param {*} light - SpotLight instance
	 */
	constructor(light) {
		super();

		this.#light = light;
		this.#buildCone();
		this.update();
	}

	/** @returns {void} */
	#buildCone() {
		const segments = 8;
		const positions = [];

		const angle = this.#light?.angle ?? Math.PI / 6;
		const distance = this.#light?.distance ?? 1;
		const radius = Math.tan(angle) * distance;

		for (let i = 0; i < segments; i++) {
			const theta = (i / segments) * Math.PI * 2;
			const x = Math.cos(theta) * radius;
			const z = Math.sin(theta) * radius;
			positions.push(0, 0, 0, x, -distance, z);
		}

		for (let i = 0; i < segments; i++) {
			const t0 = (i / segments) * Math.PI * 2;
			const t1 = ((i + 1) / segments) * Math.PI * 2;
			positions.push(
				Math.cos(t0) * radius,
				-distance,
				Math.sin(t0) * radius,
				Math.cos(t1) * radius,
				-distance,
				Math.sin(t1) * radius,
			);
		}

		const geometry = new Geometry();
		geometry.setAttribute(
			"position",
			new Attribute(new Float32Array(positions), 3),
		);

		for (const child of [...this.children]) {
			this.remove(child);
			if ("geometry" in child) {
				/** @type {{ geometry?: { dispose(): void } }} */ (
					child
				).geometry?.dispose();
			}
		}

		this.add(new LineSegments(geometry));
	}

	/** @returns {void} */
	update() {
		const light = this.#light;
		if (!light) return;
		this.position.copy(light.position);
		if (light.target) this.lookAt(light.target.position);
		this.#buildCone();
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
