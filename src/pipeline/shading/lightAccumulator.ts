import { LightType } from "../../core/Constants.ts";
import type { SphericalHarmonicsCoefficients } from "../../math/SphericalHarmonics3.ts";

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface ColorLike {
  r: number;
  g: number;
  b: number;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface AmbientLightEntry {
  color: ColorLike | unknown;
  intensity: number;
}

interface HemisphereLightEntry {
  direction: Vec3;
  skyColor: ColorLike | unknown;
  groundColor: ColorLike | unknown;
  intensity: number;
}

interface DirectionalLightEntry {
  direction: Vec3;
  color: ColorLike | unknown;
  intensity: number;
}

interface SpotLightEntry {
  position: Vec3;
  direction: Vec3;
  color: ColorLike | unknown;
  intensity: number;
  angle: number;
  penumbra: number;
  distance: number;
  decay: number;
  cosAngle?: number;
  cosInnerAngle?: number;
}

interface PointLightEntry {
  position: Vec3;
  color: ColorLike | unknown;
  intensity: number;
  distance: number;
  decay: number;
}

interface LightProbeEntry {
  coefficients: SphericalHarmonicsCoefficients;
  intensity: number;
}

interface LightEntry {
  type?: string;
  lightType?: number;
  color?: ColorLike | unknown;
  intensity?: number;
  direction?: Vec3;
  position?: Vec3;
  skyColor?: ColorLike | unknown;
  groundColor?: ColorLike | unknown;
  coefficients?: SphericalHarmonicsCoefficients;
  angle?: number;
  penumbra?: number;
  distance?: number;
  decay?: number;
  cosAngle?: number;
  cosInnerAngle?: number;
}

function accumulateProbe(
  nx: number,
  ny: number,
  nz: number,
  light: LightProbeEntry,
  acc: RGB,
): void {
  const coefficients = light.coefficients;
  const weight0 = 0.886227;
  const weight1 = 1.023328 * ny;
  const weight2 = 1.023328 * nz;
  const weight3 = 1.023328 * nx;
  const weight4 = 0.858086 * nx * ny;
  const weight5 = 0.858086 * ny * nz;
  const weight6 = 0.743125 * nz * nz - 0.247708;
  const weight7 = 0.858086 * nx * nz;
  const weight8 = 0.429043 * (nx * nx - ny * ny);
  const intensity = light.intensity;
  acc.r +=
    (coefficients[0].x * weight0 +
      coefficients[1].x * weight1 +
      coefficients[2].x * weight2 +
      coefficients[3].x * weight3 +
      coefficients[4].x * weight4 +
      coefficients[5].x * weight5 +
      coefficients[6].x * weight6 +
      coefficients[7].x * weight7 +
      coefficients[8].x * weight8) *
    intensity;
  acc.g +=
    (coefficients[0].y * weight0 +
      coefficients[1].y * weight1 +
      coefficients[2].y * weight2 +
      coefficients[3].y * weight3 +
      coefficients[4].y * weight4 +
      coefficients[5].y * weight5 +
      coefficients[6].y * weight6 +
      coefficients[7].y * weight7 +
      coefficients[8].y * weight8) *
    intensity;
  acc.b +=
    (coefficients[0].z * weight0 +
      coefficients[1].z * weight1 +
      coefficients[2].z * weight2 +
      coefficients[3].z * weight3 +
      coefficients[4].z * weight4 +
      coefficients[5].z * weight5 +
      coefficients[6].z * weight6 +
      coefficients[7].z * weight7 +
      coefficients[8].z * weight8) *
    intensity;
}

function accumulateAmbient(light: AmbientLightEntry, acc: RGB): void {
  const c = light.color;
  const cr = typeof c === "object" && c !== null ? (c as ColorLike).r : 1;
  const cg = typeof c === "object" && c !== null ? (c as ColorLike).g : 1;
  const cb = typeof c === "object" && c !== null ? (c as ColorLike).b : 1;
  acc.r += cr * light.intensity;
  acc.g += cg * light.intensity;
  acc.b += cb * light.intensity;
}

function accumulateHemisphere(
  nx: number,
  ny: number,
  nz: number,
  light: HemisphereLightEntry,
  acc: RGB,
): void {
  const d = light.direction;
  const dot = nx * d.x + ny * d.y + nz * d.z;
  const blend = 0.5 + 0.5 * dot;
  const sc = light.skyColor;
  const sr = typeof sc === "object" && sc !== null ? (sc as ColorLike).r : 1;
  const sg = typeof sc === "object" && sc !== null ? (sc as ColorLike).g : 1;
  const sb = typeof sc === "object" && sc !== null ? (sc as ColorLike).b : 1;
  const gc = light.groundColor;
  const gr = typeof gc === "object" && gc !== null ? (gc as ColorLike).r : 1;
  const gg = typeof gc === "object" && gc !== null ? (gc as ColorLike).g : 1;
  const gb = typeof gc === "object" && gc !== null ? (gc as ColorLike).b : 1;
  acc.r += (gr + (sr - gr) * blend) * light.intensity;
  acc.g += (gg + (sg - gg) * blend) * light.intensity;
  acc.b += (gb + (sb - gb) * blend) * light.intensity;
}

function accumulateDirectional(
  nx: number,
  ny: number,
  nz: number,
  light: DirectionalLightEntry,
  acc: RGB,
): void {
  const d = light.direction;
  const dot = nx * -d.x + ny * -d.y + nz * -d.z;
  if (dot <= 0) return;
  const c = light.color;
  const cr = typeof c === "object" && c !== null ? (c as ColorLike).r : 1;
  const cg = typeof c === "object" && c !== null ? (c as ColorLike).g : 1;
  const cb = typeof c === "object" && c !== null ? (c as ColorLike).b : 1;
  acc.r += dot * cr * light.intensity;
  acc.g += dot * cg * light.intensity;
  acc.b += dot * cb * light.intensity;
}

const _color = { cr: 1, cg: 1, cb: 1 };

/**
 * Extracts normalized RGB from a light color that may be a Color object or integer.
 * Returns a module-level reusable object - do not hold a reference across calls.
 */
function extractColor(c: ColorLike | unknown): {
  cr: number;
  cg: number;
  cb: number;
} {
  if (typeof c === "object" && c !== null) {
    _color.cr = (c as ColorLike).r;
    _color.cg = (c as ColorLike).g;
    _color.cb = (c as ColorLike).b;
  } else {
    _color.cr = 1;
    _color.cg = 1;
    _color.cb = 1;
  }
  return _color;
}

function accumulateSpot(
  wx: number,
  wy: number,
  wz: number,
  nx: number,
  ny: number,
  nz: number,
  light: SpotLightEntry,
  acc: RGB,
): void {
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
  const outerCos = light.cosAngle ?? Math.cos(light.angle);
  if (cosAngle < outerCos) return;

  const innerCos =
    light.cosInnerAngle ?? Math.cos(light.angle * (1 - light.penumbra));
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

function accumulatePoint(
  wx: number,
  wy: number,
  wz: number,
  nx: number,
  ny: number,
  nz: number,
  light: PointLightEntry,
  acc: RGB,
): void {
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

/**
 * Dispatches one light to the appropriate accumulation function.
 * Uses numeric `lightType` for fast dispatch when available; falls back to
 * string `type` for plain-object lights that predate the numeric constants.
 */
function accumulateOne(
  nx: number,
  ny: number,
  nz: number,
  wx: number,
  wy: number,
  wz: number,
  light: LightEntry,
  out: RGB,
): void {
  const lt = light.lightType;
  if (typeof lt === "number") {
    if (lt === LightType.Ambient) {
      accumulateAmbient(light as AmbientLightEntry, out);
    } else if (lt === LightType.Hemisphere) {
      accumulateHemisphere(nx, ny, nz, light as HemisphereLightEntry, out);
    } else if (lt === LightType.Spot) {
      accumulateSpot(wx, wy, wz, nx, ny, nz, light as SpotLightEntry, out);
    } else if (lt === LightType.Point) {
      accumulatePoint(wx, wy, wz, nx, ny, nz, light as PointLightEntry, out);
    } else {
      accumulateDirectional(nx, ny, nz, light as DirectionalLightEntry, out);
    }
  } else if (light.type === "ambient") {
    accumulateAmbient(light as AmbientLightEntry, out);
  } else if (light.type === "hemisphere") {
    accumulateHemisphere(nx, ny, nz, light as HemisphereLightEntry, out);
  } else if (light.type === "spot") {
    accumulateSpot(wx, wy, wz, nx, ny, nz, light as SpotLightEntry, out);
  } else if (light.type === "point") {
    accumulatePoint(wx, wy, wz, nx, ny, nz, light as PointLightEntry, out);
  } else if (light.type === "probe") {
    accumulateProbe(nx, ny, nz, light as LightProbeEntry, out);
  } else {
    accumulateDirectional(nx, ny, nz, light as DirectionalLightEntry, out);
  }
}

/**
 * Accumulates all scene lights into an RGB multiplier object.
 * Mutates and returns the provided `out` parameter to avoid allocation.
 */
export function accumulateLights(
  nx: number,
  ny: number,
  nz: number,
  lights: Record<string, unknown>[],
  ambientIntensity: number,
  out: RGB,
  wx = 0,
  wy = 0,
  wz = 0,
): RGB {
  out.r = ambientIntensity;
  out.g = ambientIntensity;
  out.b = ambientIntensity;
  for (let i = 0, len = lights.length; i < len; i++) {
    accumulateOne(nx, ny, nz, wx, wy, wz, lights[i] as LightEntry, out);
  }
  out.r = out.r < 0 ? 0 : out.r > 1 ? 1 : out.r;
  out.g = out.g < 0 ? 0 : out.g > 1 ? 1 : out.g;
  out.b = out.b < 0 ? 0 : out.b > 1 ? 1 : out.b;
  return out;
}
