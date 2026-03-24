import { Node } from "../core/Node.ts";
import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import type { Light } from "../lights/Light.ts";
import { Line } from "../objects/Line.js";

/** Visualises a DirectionalLight as a square wireframe + direction line. */
export class DirectionalLightHelper extends Node {
	override type = "DirectionalLightHelper";

	#light: Light;

	constructor(light: Light, size = 1) {
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

	update(): void {
		const light = this.#light;
		if (!light) return;
		this.position.copy(light.position);
	}

	dispose(): void {
		for (const child of this.children) {
			if ("geometry" in child) {
				(child as { geometry?: { dispose(): void } }).geometry?.dispose();
			}
		}
	}
}
