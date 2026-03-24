import { Color } from "../math/Color.ts";

const FOG_LUT_SIZE = 256;

interface FogOptions {
	color?: Color | number | string;
	near?: number;
	far?: number;
	density?: number;
}

/**
 * EXP2 fog. Blends fragments toward `color` with factor `1 - exp(-(density * t)^2)` where
 * `t` is normalized depth (0 at `near`, 1 at `far`). Default density 2.5 gives ~99.8% fog
 * at `far` regardless of scene scale. LUT is rebuilt when `density` changes.
 */
export class Fog {
	#color: Color;
	#near: number;
	#far: number;
	#density: number;
	#lut: Float32Array = new Float32Array(FOG_LUT_SIZE);

	constructor({
		color = 0x000000,
		near = 1,
		far = 100,
		density = 2.5,
	}: FogOptions = {}) {
		this.#color = color instanceof Color ? color : new Color(color);
		this.#near = near;
		this.#far = far;
		this.#density = density;
		this.#buildLut();
	}

	#buildLut(): void {
		const density = this.#density;
		for (let i = 0; i < FOG_LUT_SIZE; i++) {
			const t = i / (FOG_LUT_SIZE - 1);
			const dd = density * t;
			this.#lut[i] = 1 - Math.exp(-(dd * dd));
		}
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

	get density(): number {
		return this.#density;
	}

	set density(value: number) {
		this.#density = value;
		this.#buildLut();
	}

	get lut(): Float32Array {
		return this.#lut;
	}

	clone(): Fog {
		return new Fog({
			color: this.#color.clone(),
			near: this.#near,
			far: this.#far,
			density: this.#density,
		});
	}
}
