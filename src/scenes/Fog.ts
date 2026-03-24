import { Color } from "../math/Color.ts";

interface FogOptions {
	color?: Color | number | string;
	near?: number;
	far?: number;
}

/**
 * Linear fog that blends fragment colors toward a configurable color based on
 * camera-space depth. Objects at `near` are unaffected; objects at `far` are
 * fully fogged.
 */
export class Fog {
	#color: Color;
	#near: number;
	#far: number;

	constructor({ color = 0x000000, near = 1, far = 100 }: FogOptions = {}) {
		this.#color = color instanceof Color ? color : new Color(color);
		this.#near = near;
		this.#far = far;
	}

	get color(): Color {
		return this.#color;
	}

	get near(): number {
		return this.#near;
	}

	set near(value: number) {
		this.#near = value;
	}

	get far(): number {
		return this.#far;
	}

	set far(value: number) {
		this.#far = value;
	}

	clone(): Fog {
		return new Fog({
			color: this.#color.clone(),
			near: this.#near,
			far: this.#far,
		});
	}
}
