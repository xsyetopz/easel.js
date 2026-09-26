import { LightType, Shading } from "../../core/Constants.ts";
import { encodeSrgb } from "../color/SrgbEncode.ts";
import type { TriangleBuffer } from "../TriangleBuffer.ts";
import { FlatShader } from "./FlatShader.ts";
import { GouraudShader } from "./GouraudShader.ts";

interface BakeColor {
  r: number;
  g: number;
  b: number;
}

interface BakeDrawCall {
  triangles: TriangleBuffer;
  material: {
    shading?: number;
    type?: string;
    color?: BakeColor;
    emissive?: BakeColor;
    emissiveIntensity?: number;
  };
  worldPositions?: Float32Array;
  shadedColorData: Float32Array;
  shadedColorStride: number;
  instanceColorR?: number;
  instanceColorG?: number;
  instanceColorB?: number;
}

/** Material types that three.js renders without lighting. */
function isUnlitType(type: string | undefined): boolean {
  return (
    type === "BasicMaterial" ||
    type === "PointsMaterial" ||
    type === "SpriteMaterial"
  );
}

/**
 * Whether a draw call's material is lit and so renders black, as in three.js,
 * when no light reaches it and its emissive color is black.
 */
export function isLitMaterialType(type: string | undefined): boolean {
  return type === "LambertMaterial" || type === "ToonMaterial";
}

/**
 * Bakes scene lights into per-vertex or per-face sRGB colors.
 *
 * Each baked value is the three.js Lambert output for that vertex or face:
 * `encode(irradiance * diffuse + emissive)`, where the collected light
 * intensities already include the `1 / π` of `BRDF_Lambert` and `diffuse` is
 * the linear material color times the instance color. The sRGB encode is a
 * table lookup per baked vertex, so the rasterizer interpolates and writes
 * encoded values with the material color already applied.
 */
export class LightBaker {
  readonly #flatShader = new FlatShader();
  readonly #gouraudShader = new GouraudShader();

  /** Reusable vertex shade cache (r,g,b per vertex index). */
  #shadeCache = new Float32Array(0);

  /** Bitmap tracking which vertex indices have been cached. */
  #shadeCachedBitmap = new Uint8Array(0);

  #kr = 1;
  #kg = 1;
  #kb = 1;
  #er = 0;
  #eg = 0;
  #eb = 0;

  #ensureCache(size: number): Float32Array {
    if (this.#shadeCache.length < size) {
      this.#shadeCache = new Float32Array(size * 2);
    }
    return this.#shadeCache;
  }

  #ensureBitmap(size: number): Uint8Array {
    if (this.#shadeCachedBitmap.length < size) {
      this.#shadeCachedBitmap = new Uint8Array(size * 2);
    }
    return this.#shadeCachedBitmap;
  }

  /**
   * Bakes lighting onto a draw call's faces or vertices.
   * Writes sRGB-encoded RGB in [0, 1] into drawCall.shadedColorData.
   * Stride is 3 for flat shading (r,g,b per face) or 9 for gouraud (r,g,b x 3 vertices).
   * Lit materials without lights or emissive light leave the stride at 0;
   * the rasterizer renders them black.
   */
  bake(drawCall: BakeDrawCall, lights: Record<string, unknown>[]): void {
    drawCall.shadedColorStride = 0;
    const material = drawCall.material;
    if (isUnlitType(material.type)) return;

    const emissive = material.emissive;
    const emissiveIntensity = material.emissiveIntensity ?? 1;
    this.#er = emissive ? emissive.r * emissiveIntensity : 0;
    this.#eg = emissive ? emissive.g * emissiveIntensity : 0;
    this.#eb = emissive ? emissive.b * emissiveIntensity : 0;
    if (
      lights.length === 0 &&
      this.#er === 0 &&
      this.#eg === 0 &&
      this.#eb === 0
    ) {
      return;
    }
    const color = material.color;
    this.#kr = (color ? color.r : 1) * (drawCall.instanceColorR ?? 1);
    this.#kg = (color ? color.g : 1) * (drawCall.instanceColorG ?? 1);
    this.#kb = (color ? color.b : 1) * (drawCall.instanceColorB ?? 1);

    const tb = drawCall.triangles;
    const isFlat = material.shading === Shading.Flat;
    const stride = isFlat ? 3 : 9;
    const needed = tb.length * stride;

    if (drawCall.shadedColorData.length < needed) {
      drawCall.shadedColorData = new Float32Array(needed);
    }
    drawCall.shadedColorStride = stride;

    const needsWorldPos = this.#needsWorldPosition(lights);
    if (isFlat) {
      this.#bakeFlat(tb, drawCall, lights, needsWorldPos);
    } else {
      this.#bakeGouraud(tb, drawCall, lights, needsWorldPos);
    }
  }

  #needsWorldPosition(lights: Record<string, unknown>[]): boolean {
    for (let i = 0, len = lights.length; i < len; i++) {
      const light = lights[i] as { lightType?: unknown; type?: unknown };
      const lt = light.lightType;
      if (lt === LightType.Point || lt === LightType.Spot) return true;
      const t = light.type;
      if (t === "point" || t === "spot") return true;
    }
    return false;
  }

  /** Applies the material, adds emissive light, and encodes to sRGB. */
  #store(data: Float32Array, at: number, light: BakeColor): void {
    data[at] = encodeSrgb(light.r * this.#kr + this.#er);
    data[at + 1] = encodeSrgb(light.g * this.#kg + this.#eg);
    data[at + 2] = encodeSrgb(light.b * this.#kb + this.#eb);
  }

  #bakeFlat(
    tb: TriangleBuffer,
    drawCall: BakeDrawCall,
    lights: Record<string, unknown>[],
    needsWorldPos: boolean,
  ): void {
    const data = drawCall.shadedColorData;
    const wp = drawCall.worldPositions;
    const sortOrder = tb.sortOrder;
    const useSortOrder = tb.sortOrderActive && sortOrder.length === tb.length;
    if (needsWorldPos && wp !== undefined && wp.length > 0) {
      for (let i = 0; i < tb.length; i++) {
        const physIdx = useSortOrder ? sortOrder[i] : i;
        const v = physIdx * 3;
        const vi0 = tb.vertexIndex[v];
        const vi1 = tb.vertexIndex[v + 1];
        const vi2 = tb.vertexIndex[v + 2];
        const wb0 = vi0 * 3;
        const wb1 = vi1 * 3;
        const wb2 = vi2 * 3;
        const fcwx = (wp[wb0] + wp[wb1] + wp[wb2]) * 0.3333333333333333;
        const fcwy =
          (wp[wb0 + 1] + wp[wb1 + 1] + wp[wb2 + 1]) * 0.3333333333333333;
        const fcwz =
          (wp[wb0 + 2] + wp[wb1 + 2] + wp[wb2 + 2]) * 0.3333333333333333;
        const s = this.#flatShader.shade(
          tb.faceNormalX[physIdx],
          tb.faceNormalY[physIdx],
          tb.faceNormalZ[physIdx],
          lights,
          fcwx,
          fcwy,
          fcwz,
        );
        this.#store(data, i * 3, s);
      }
      return;
    }

    for (let i = 0; i < tb.length; i++) {
      const physIdx = useSortOrder ? sortOrder[i] : i;
      const s = this.#flatShader.shade(
        tb.faceNormalX[physIdx],
        tb.faceNormalY[physIdx],
        tb.faceNormalZ[physIdx],
        lights,
      );
      this.#store(data, i * 3, s);
    }
  }

  /**
   * Gouraud bake with per-vertex shade cache.
   * Shared vertices are shaded once and the result is reused.
   */
  #bakeGouraud(
    tb: TriangleBuffer,
    drawCall: BakeDrawCall,
    lights: Record<string, unknown>[],
    needsWorldPos: boolean,
  ): void {
    const data = drawCall.shadedColorData;
    const maxVi = tb.maxVertexIndex;
    const sortOrder = tb.sortOrder;
    const useSortOrder = tb.sortOrderActive && sortOrder.length === tb.length;
    const cacheSize = (maxVi + 1) * 3;
    const cache = this.#ensureCache(cacheSize);
    const cached = this.#ensureBitmap(maxVi + 1);
    cached.fill(0, 0, maxVi + 1);

    const wp = drawCall.worldPositions;
    if (needsWorldPos && wp !== undefined && wp.length > 0) {
      for (let i = 0; i < tb.length; i++) {
        const physIdx = useSortOrder ? sortOrder[i] : i;
        const v = physIdx * 3;
        const base = i * 9;

        for (let k = 0; k < 3; k++) {
          const vi = tb.vertexIndex[v + k];
          const cb = vi * 3;

          if (!cached[vi]) {
            const wb = vi * 3;
            const s = this.#gouraudShader.shade(
              tb.vertNormalX[v + k],
              tb.vertNormalY[v + k],
              tb.vertNormalZ[v + k],
              lights,
              wp[wb],
              wp[wb + 1],
              wp[wb + 2],
            );
            this.#store(cache, cb, s);
            cached[vi] = 1;
          }

          data[base + k * 3] = cache[cb];
          data[base + k * 3 + 1] = cache[cb + 1];
          data[base + k * 3 + 2] = cache[cb + 2];
        }
      }
      return;
    }

    for (let i = 0; i < tb.length; i++) {
      const physIdx = useSortOrder ? sortOrder[i] : i;
      const v = physIdx * 3;
      const base = i * 9;

      for (let k = 0; k < 3; k++) {
        const vi = tb.vertexIndex[v + k];
        const cb = vi * 3;

        if (!cached[vi]) {
          const s = this.#gouraudShader.shade(
            tb.vertNormalX[v + k],
            tb.vertNormalY[v + k],
            tb.vertNormalZ[v + k],
            lights,
          );
          this.#store(cache, cb, s);
          cached[vi] = 1;
        }

        data[base + k * 3] = cache[cb];
        data[base + k * 3 + 1] = cache[cb + 1];
        data[base + k * 3 + 2] = cache[cb + 2];
      }
    }
  }
}
