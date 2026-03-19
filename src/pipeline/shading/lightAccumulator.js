import { MathUtils } from "../../math/MathUtils.js";

/**
 * Extracts r, g, b from a color value, defaulting to 1 for non-object colors.
 * @param {*} c
 * @returns {{ r: number, g: number, b: number }}
 */
function colorChannels(c) {
	if (typeof c === "object" && c !== null) {
		return {
			r: /** @type {*} */ (c).r,
			g: /** @type {*} */ (c).g,
			b: /** @type {*} */ (c).b,
		};
	}
	return { r: 1, g: 1, b: 1 };
}

/**
 * Accumulates one ambient light's RGB contribution.
 * @param {*} light
 * @param {{ r: number, g: number, b: number }} acc
 * @returns {void}
 */
function accumulateAmbient(light, acc) {
	const c = colorChannels(light.color);
	acc.r += c.r * light.intensity;
	acc.g += c.g * light.intensity;
	acc.b += c.b * light.intensity;
}

/**
 * Accumulates one hemisphere light's RGB contribution.
 * @param {{ x: number, y: number, z: number }} normal
 * @param {*} light
 * @param {{ r: number, g: number, b: number }} acc
 * @returns {void}
 */
function accumulateHemisphere(normal, light, acc) {
	const d = light.direction;
	const dot = normal.x * d.x + normal.y * d.y + normal.z * d.z;
	const blend = 0.5 + 0.5 * dot;
	const sky = colorChannels(light.skyColor);
	const gnd = colorChannels(light.groundColor);
	acc.r += (gnd.r + (sky.r - gnd.r) * blend) * light.intensity;
	acc.g += (gnd.g + (sky.g - gnd.g) * blend) * light.intensity;
	acc.b += (gnd.b + (sky.b - gnd.b) * blend) * light.intensity;
}

/**
 * Accumulates one directional/point/spot light's RGB contribution.
 * @param {{ x: number, y: number, z: number }} normal
 * @param {*} light
 * @param {{ r: number, g: number, b: number }} acc
 * @returns {void}
 */
function accumulateDirectional(normal, light, acc) {
	const d = light.direction;
	const dot = normal.x * -d.x + normal.y * -d.y + normal.z * -d.z;
	if (dot <= 0) return;
	const c = colorChannels(light.color);
	acc.r += dot * c.r * light.intensity;
	acc.g += dot * c.g * light.intensity;
	acc.b += dot * c.b * light.intensity;
}

/**
 * Accumulates all scene lights into an RGB multiplier object.
 * @param {{ x: number, y: number, z: number }} normal Normalized surface normal
 * @param {Array<*>} lights
 * @param {number} ambientIntensity Starting ambient term
 * @returns {{ r: number, g: number, b: number }} Clamped RGB multipliers in [0, 1]
 */
export function accumulateLights(normal, lights, ambientIntensity) {
	const acc = { r: ambientIntensity, g: ambientIntensity, b: ambientIntensity };
	for (const light of lights) {
		if (light.type === "ambient") {
			accumulateAmbient(light, acc);
		} else if (light.type === "hemisphere") {
			accumulateHemisphere(normal, light, acc);
		} else {
			accumulateDirectional(normal, light, acc);
		}
	}
	return {
		r: MathUtils.clamp(acc.r, 0, 1),
		g: MathUtils.clamp(acc.g, 0, 1),
		b: MathUtils.clamp(acc.b, 0, 1),
	};
}
