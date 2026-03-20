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

/** @type {{ cr: number, cg: number, cb: number }} */
const _color = { cr: 1, cg: 1, cb: 1 };

/**
 * Extracts normalized RGB from a light color that may be a Color object or integer.
 * Returns a module-level reusable object - do not hold a reference across calls.
 * @param {*} c
 * @returns {{ cr: number, cg: number, cb: number }}
 */
function extractColor(c) {
	if (typeof c === "object" && c !== null) {
		_color.cr = c.r;
		_color.cg = c.g;
		_color.cb = c.b;
	} else {
		_color.cr = 1;
		_color.cg = 1;
		_color.cb = 1;
	}
	return _color;
}

/**
 * Accumulates a spot light's RGB contribution at world position (wx, wy, wz).
 * @param {number} wx World-space surface position X
 * @param {number} wy World-space surface position Y
 * @param {number} wz World-space surface position Z
 * @param {number} nx Normalized surface normal X
 * @param {number} ny Normalized surface normal Y
 * @param {number} nz Normalized surface normal Z
 * @param {*} light
 * @param {{ r: number, g: number, b: number }} acc
 * @returns {void}
 */
function accumulateSpot(wx, wy, wz, nx, ny, nz, light, acc) {
	const slx = light.position.x - wx;
	const sly = light.position.y - wy;
	const slz = light.position.z - wz;
	const dist = Math.sqrt(slx * slx + sly * sly + slz * slz);
	if (dist === 0) return;
	const invDist = 1 / dist;
	const lx = slx * invDist;
	const ly = sly * invDist;
	const lz = slz * invDist;

	const NdotL = nx * lx + ny * ly + nz * lz;
	if (NdotL <= 0) return;

	const cosAngle = -(
		lx * light.direction.x +
		ly * light.direction.y +
		lz * light.direction.z
	);
	const outerCos = light._cosAngle ?? Math.cos(light.angle);
	if (cosAngle < outerCos) return;

	const innerCos =
		light._cosInnerAngle ?? Math.cos(light.angle * (1 - light.penumbra));
	const spotFactor =
		light.penumbra > 0
			? Math.min(Math.max((cosAngle - outerCos) / (innerCos - outerCos), 0), 1)
			: 1;

	let distAtten = 1;
	if (light.distance > 0) {
		const ratio = dist / light.distance;
		const r4 = ratio * ratio * ratio * ratio;
		const clamped = Math.max(1 - r4, 0);
		distAtten = (clamped * clamped) / Math.max(dist * dist, 0.0001);
	}

	const factor = NdotL * spotFactor * distAtten * light.intensity;
	const { cr, cg, cb } = extractColor(light.color);
	acc.r += cr * factor;
	acc.g += cg * factor;
	acc.b += cb * factor;
}

/**
 * Accumulates a point light's RGB contribution at world position (wx, wy, wz).
 * @param {number} wx World-space surface position X
 * @param {number} wy World-space surface position Y
 * @param {number} wz World-space surface position Z
 * @param {number} nx Normalized surface normal X
 * @param {number} ny Normalized surface normal Y
 * @param {number} nz Normalized surface normal Z
 * @param {*} light
 * @param {{ r: number, g: number, b: number }} acc
 * @returns {void}
 */
function accumulatePoint(wx, wy, wz, nx, ny, nz, light, acc) {
	const slx = light.position.x - wx;
	const sly = light.position.y - wy;
	const slz = light.position.z - wz;
	const dist = Math.sqrt(slx * slx + sly * sly + slz * slz);
	if (dist === 0) return;
	const invDist = 1 / dist;
	const lx = slx * invDist;
	const ly = sly * invDist;
	const lz = slz * invDist;

	const NdotL = nx * lx + ny * ly + nz * lz;
	if (NdotL <= 0) return;

	let distAtten = 1;
	if (light.distance > 0) {
		const ratio = dist / light.distance;
		const r4 = ratio * ratio * ratio * ratio;
		const clamped = Math.max(1 - r4, 0);
		distAtten = (clamped * clamped) / Math.max(dist * dist, 0.0001);
	}

	const factor = NdotL * distAtten * light.intensity;
	const { cr, cg, cb } = extractColor(light.color);
	acc.r += cr * factor;
	acc.g += cg * factor;
	acc.b += cb * factor;
}

import { LightType } from "../../core/Constants.js";

/**
 * Dispatches one light to the appropriate accumulation function.
 * Uses numeric `lightType` for fast dispatch when available; falls back to
 * string `type` for plain-object lights that predate the numeric constants.
 * @param {number} nx @param {number} ny @param {number} nz
 * @param {number} wx @param {number} wy @param {number} wz
 * @param {*} light
 * @param {{ r: number, g: number, b: number }} out
 * @returns {void}
 */
function accumulateOne(nx, ny, nz, wx, wy, wz, light, out) {
	const lt = light.lightType;
	if (typeof lt === "number") {
		if (lt === LightType.Ambient) {
			accumulateAmbient(light, out);
		} else if (lt === LightType.Hemisphere) {
			accumulateHemisphere(nx, ny, nz, light, out);
		} else if (lt === LightType.Spot) {
			accumulateSpot(wx, wy, wz, nx, ny, nz, light, out);
		} else if (lt === LightType.Point) {
			accumulatePoint(wx, wy, wz, nx, ny, nz, light, out);
		} else {
			accumulateDirectional(nx, ny, nz, light, out);
		}
	} else if (light.type === "ambient") {
		accumulateAmbient(light, out);
	} else if (light.type === "hemisphere") {
		accumulateHemisphere(nx, ny, nz, light, out);
	} else if (light.type === "spot") {
		accumulateSpot(wx, wy, wz, nx, ny, nz, light, out);
	} else if (light.type === "point") {
		accumulatePoint(wx, wy, wz, nx, ny, nz, light, out);
	} else {
		accumulateDirectional(nx, ny, nz, light, out);
	}
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
 * @param {number} [wx=0] World-space surface position X
 * @param {number} [wy=0] World-space surface position Y
 * @param {number} [wz=0] World-space surface position Z
 * @returns {{ r: number, g: number, b: number }} Clamped RGB multipliers in [0, 1]
 */
export function accumulateLights(
	nx,
	ny,
	nz,
	lights,
	ambientIntensity,
	out,
	wx = 0,
	wy = 0,
	wz = 0,
) {
	out.r = ambientIntensity;
	out.g = ambientIntensity;
	out.b = ambientIntensity;
	for (let i = 0, len = lights.length; i < len; i++) {
		accumulateOne(nx, ny, nz, wx, wy, wz, lights[i], out);
	}
	out.r = out.r < 0 ? 0 : out.r > 1 ? 1 : out.r;
	out.g = out.g < 0 ? 0 : out.g > 1 ? 1 : out.g;
	out.b = out.b < 0 ? 0 : out.b > 1 ? 1 : out.b;
	return out;
}
