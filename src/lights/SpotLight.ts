import { LightType } from "../core/Constants.ts";
import type { Node } from "../core/Node.ts";
import type { Color } from "../math/Color.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Light } from "./Light.ts";

/**
 * Per-vertex cone attenuation, CPU-computed.
 * When target is set, direction is computed as normalize(target world pos - light world pos).
 */
export class SpotLight extends Light {
	override type = "SpotLight";

	lightType: number = LightType.Spot;

	/** Local-space cone direction. */
	direction: Vector3 = new Vector3(0, -1, 0);

	/**
	 * Optional target node. When set, overrides direction.
	 * Direction becomes normalize(target.matrixWorld position - this.matrixWorld position).
	 */
	target: Node | undefined = undefined;

	distance: number;

	#angle: number = Math.PI / 3;
	#penumbra = 0;

	/** Precomputed `Math.cos(angle)`. Updated whenever `angle` or `penumbra` change. */
	_cosAngle: number = Math.cos(Math.PI / 3);

	/** Precomputed `Math.cos(angle * (1 - penumbra))`. Updated whenever `angle` or `penumbra` change. */
	_cosInnerAngle: number = Math.cos(Math.PI / 3);

	decay: number;

	get angle(): number {
		return this.#angle;
	}

	set angle(value: number) {
		this.#angle = value;
		this.#updateTrig();
	}

	get penumbra(): number {
		return this.#penumbra;
	}

	set penumbra(value: number) {
		this.#penumbra = value;
		this.#updateTrig();
	}

	#updateTrig(): void {
		this._cosAngle = Math.cos(this.#angle);
		this._cosInnerAngle = Math.cos(this.#angle * (1 - this.#penumbra));
	}

	constructor(
		color: Color | number | string = 0xffffff,
		intensity = 1,
		distance = 0,
		angle: number = Math.PI / 3,
		penumbra = 0,
		decay = 2,
	) {
		super(color, intensity);
		this.distance = distance;
		// Use setters to initialize cached trig values.
		this.#angle = angle;
		this.#penumbra = penumbra;
		this.#updateTrig();
		this.decay = decay;
	}

	override copy(source: SpotLight, recursive = true): this {
		super.copy(source, recursive);
		this.direction.copy(source.direction);
		this.target = source.target;
		this.distance = source.distance;
		this.angle = source.angle;
		this.penumbra = source.penumbra;
		this.decay = source.decay;
		return this;
	}
}
