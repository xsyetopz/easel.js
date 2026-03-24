import { accumulateLights } from "./lightAccumulator.ts";

interface RGB {
	r: number;
	g: number;
	b: number;
}

const _out: RGB = { r: 0, g: 0, b: 0 };

/** Per-face flat shader using face normal for lighting. */
export class FlatShader {
	/** Computes flat-shaded RGB light contribution for a face. */
	shade(
		nx: number,
		ny: number,
		nz: number,
		lights: Record<string, unknown>[],
		ambientIntensity = 0.1,
		wx = 0,
		wy = 0,
		wz = 0,
	): RGB {
		return accumulateLights(
			nx,
			ny,
			nz,
			lights,
			ambientIntensity,
			_out,
			wx,
			wy,
			wz,
		);
	}
}
