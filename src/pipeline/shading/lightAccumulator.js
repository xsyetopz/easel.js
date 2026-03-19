/**
 * Accumulates one ambient light's RGB contribution.
 * @param {*} light
 * @param {{ r: number, g: number, b: number }} acc
 * @returns {void}
 */
function accumulateAmbient(light, acc) {
	const c = light.color;
	const cr = typeof c === "object" && c !== null ? c.r : 1;
	const cg = typeof c === "object" && c !== null ? c.g : 1;
	const cb = typeof c === "object" && c !== null ? c.b : 1;
	acc.r += cr * light.intensity;
	acc.g += cg * light.intensity;
	acc.b += cb * light.intensity;
}

/**
 * Accumulates one hemisphere light's RGB contribution.
 * @param {number} nx Normalized surface normal X component
 * @param {number} ny Normalized surface normal Y component
 * @param {number} nz Normalized surface normal Z component
 * @param {*} light
 * @param {{ r: number, g: number, b: number }} acc
 * @returns {void}
 */
function accumulateHemisphere(nx, ny, nz, light, acc) {
	const d = light.direction;
	const dot = nx * d.x + ny * d.y + nz * d.z;
	const blend = 0.5 + 0.5 * dot;
	const sc = light.skyColor;
	const sr = typeof sc === "object" && sc !== null ? sc.r : 1;
	const sg = typeof sc === "object" && sc !== null ? sc.g : 1;
	const sb = typeof sc === "object" && sc !== null ? sc.b : 1;
	const gc = light.groundColor;
	const gr = typeof gc === "object" && gc !== null ? gc.r : 1;
	const gg = typeof gc === "object" && gc !== null ? gc.g : 1;
	const gb = typeof gc === "object" && gc !== null ? gc.b : 1;
	acc.r += (gr + (sr - gr) * blend) * light.intensity;
	acc.g += (gg + (sg - gg) * blend) * light.intensity;
	acc.b += (gb + (sb - gb) * blend) * light.intensity;
}

/**
 * Accumulates one directional/point/spot light's RGB contribution.
 * @param {number} nx Normalized surface normal X component
 * @param {number} ny Normalized surface normal Y component
 * @param {number} nz Normalized surface normal Z component
 * @param {*} light
 * @param {{ r: number, g: number, b: number }} acc
 * @returns {void}
 */
function accumulateDirectional(nx, ny, nz, light, acc) {
	const d = light.direction;
	const dot = nx * -d.x + ny * -d.y + nz * -d.z;
	if (dot <= 0) return;
	const c = light.color;
	const cr = typeof c === "object" && c !== null ? c.r : 1;
	const cg = typeof c === "object" && c !== null ? c.g : 1;
	const cb = typeof c === "object" && c !== null ? c.b : 1;
	acc.r += dot * cr * light.intensity;
	acc.g += dot * cg * light.intensity;
	acc.b += dot * cb * light.intensity;
}

/**
 * Accumulates all scene lights into an RGB multiplier object.
 * Mutates and returns the provided `out` parameter to avoid allocation.
 * @param {number} nx Normalized surface normal X component
 * @param {number} ny Normalized surface normal Y component
 * @param {number} nz Normalized surface normal Z component
 * @param {Array<*>} lights
 * @param {number} ambientIntensity Starting ambient term
 * @param {{ r: number, g: number, b: number }} out Pre-allocated output object
 * @returns {{ r: number, g: number, b: number }} Clamped RGB multipliers in [0, 1]
 */
export function accumulateLights(nx, ny, nz, lights, ambientIntensity, out) {
	out.r = ambientIntensity;
	out.g = ambientIntensity;
	out.b = ambientIntensity;
	for (const light of lights) {
		if (light.type === "ambient") {
			accumulateAmbient(light, out);
		} else if (light.type === "hemisphere") {
			accumulateHemisphere(nx, ny, nz, light, out);
		} else {
			accumulateDirectional(nx, ny, nz, light, out);
		}
	}
	out.r = out.r < 0 ? 0 : out.r > 1 ? 1 : out.r;
	out.g = out.g < 0 ? 0 : out.g > 1 ? 1 : out.g;
	out.b = out.b < 0 ? 0 : out.b > 1 ? 1 : out.b;
	return out;
}
