import type { DepthBuffer } from "../framebuffer/DepthBuffer.ts";
import type { LineBuffer } from "../LineBuffer.ts";

const BAYER4 = Float64Array.of(
  0 / 16,
  8 / 16,
  2 / 16,
  10 / 16,
  12 / 16,
  4 / 16,
  14 / 16,
  6 / 16,
  3 / 16,
  11 / 16,
  1 / 16,
  9 / 16,
  15 / 16,
  7 / 16,
  13 / 16,
  5 / 16,
);

/** CPU line-rasterization settings consumed by LineRasterizer. */
export interface LineRasterMaterial {
  /** Integer line width in framebuffer pixels. */
  linewidth?: number;
  /** Dash length in framebuffer pixels. */
  dashSize?: number;
  /** Gap length in framebuffer pixels. */
  gapSize?: number;
  /** Normalized RGB line color. */
  color?: { r: number; g: number; b: number };
  /** Discrete opacity value used by the blend path. */
  opacity?: number;
  /** Whether fragments use the sorted translucent blend path. */
  transparent?: boolean;
  /** Whether fragments are compared with the CPU depth buffer. */
  depthTest?: boolean;
  /** Whether passing fragments update the CPU depth buffer. */
  depthWrite?: boolean;
}

/** Framebuffer views consumed by the integer line rasterizer. */
export interface LineRasterFramebuffer {
  /** Framebuffer width in pixels. */
  width: number;
  /** Framebuffer height in pixels. */
  height: number;
  /** Uint16 depth buffer used for CPU early-Z tests. */
  depthBuffer: Pick<DepthBuffer, "data" | "width" | "height">;
  /** Uint32 view used for packed RGBA writes. */
  u32: Uint32Array;
}

/** Deterministic integer line rasterizer for the CPU framebuffer. */
export class LineRasterizer {
  // Reused framebuffer-sized stamps suppress equivalent-depth overlapping
  // brush writes across one connected coverage group without allocating a
  // visited set per segment. Independent LineSegments pairs receive distinct
  // epochs; #stampDepth lets nearer self-intersections update normally.
  #stampGeneration = new Uint32Array(0);
  #stampDepth = new Uint16Array(0);
  #stampEpoch = 0;

  #segmentX0 = 0;
  #segmentY0 = 0;
  #segmentDx = 0;
  #segmentDy = 0;
  #segmentLengthSquared = 0;
  #segmentZ0 = 0;
  #segmentZ1 = 0;
  #segmentFog0 = 0;
  #segmentFog1 = 0;
  #segmentSourceT0 = 0;
  #segmentSourceT1 = 0;
  #segmentC0r = 1;
  #segmentC0g = 1;
  #segmentC0b = 1;
  #segmentC1r = 1;
  #segmentC1g = 1;
  #segmentC1b = 1;
  #segmentBaseR = 255;
  #segmentBaseG = 255;
  #segmentBaseB = 255;
  #segmentFogR = 0;
  #segmentFogG = 0;
  #segmentFogB = 0;
  #segmentHasFog = false;

  /**
   * Rasterizes clipped segments. End points are checked before each bounded
   * Bresenham walk; invalid coordinates throw instead of entering a loop.
   */
  rasterize(
    lines: LineBuffer,
    material: LineRasterMaterial,
    framebuffer: LineRasterFramebuffer,
    fogColor?: { r: number; g: number; b: number },
    vertexColorData?: ArrayLike<number>,
    vertexColorItemSize = 0,
  ): void {
    const { width, height } = framebuffer;
    if (
      !(Number.isInteger(width) && Number.isInteger(height)) ||
      width <= 0 ||
      height <= 0
    ) {
      throw new RangeError(
        "Line rasterizer requires a positive integer viewport",
      );
    }

    const linewidth = material.linewidth ?? 1;
    if (
      !(Number.isInteger(linewidth) && Number.isFinite(linewidth)) ||
      linewidth <= 0
    ) {
      throw new RangeError("Line linewidth must be a finite positive integer");
    }
    const hasDash =
      material.dashSize !== undefined || material.gapSize !== undefined;
    const dashSize = material.dashSize ?? 0;
    const gapSize = material.gapSize ?? 0;
    if (
      hasDash &&
      (!(Number.isInteger(dashSize) && Number.isFinite(dashSize)) ||
        dashSize <= 0 ||
        !Number.isInteger(gapSize) ||
        !Number.isFinite(gapSize) ||
        gapSize < 0)
    ) {
      throw new RangeError(
        "Dashed line dashSize must be a finite positive integer and gapSize a non-negative integer",
      );
    }

    const color = material.color;
    const baseR = toByte(color?.r ?? 1);
    const baseG = toByte(color?.g ?? 1);
    const baseB = toByte(color?.b ?? 1);
    const opacity = material.opacity ?? 0;
    const blend = material.transparent === true && opacity > 0;
    const srcWeight = blend ? (8 - opacity) / 8 : 1;
    const depthTest = material.depthTest !== false;
    const depthWrite = material.depthWrite !== false;
    const fogR = toByte(fogColor?.r ?? 0);
    const fogG = toByte(fogColor?.g ?? 0);
    const fogB = toByte(fogColor?.b ?? 0);
    const hasFog = fogColor !== undefined;
    this.#ensureStampStorage(width, height);

    // Dash phase is intentionally restarted for each logical segment in
    // framebuffer pixels. It avoids implicit world-distance accumulation and
    // is an explicit CPU/Canvas2D divergence from THREE.js line distances.
    for (let segment = 0; segment < lines.length; segment++) {
      if (segment === 0 || lines.continuesPrevious[segment] !== 1) {
        this.#nextStampEpoch();
      }
      const endpoint = segment * 2;
      const x0 = lines.screenX[endpoint];
      const y0 = lines.screenY[endpoint];
      const x1 = lines.screenX[endpoint + 1];
      const y1 = lines.screenY[endpoint + 1];
      const z0 = lines.ndcZ[endpoint];
      const z1 = lines.ndcZ[endpoint + 1];
      const fog0 = lines.fogFactor[endpoint];
      const fog1 = lines.fogFactor[endpoint + 1];
      const vi0 = lines.vertexIndex[endpoint];
      const vi1 = lines.vertexIndex[endpoint + 1];
      const sourceT0 = lines.sourceT[endpoint];
      const sourceT1 = lines.sourceT[endpoint + 1];
      const dashPhase = lines.dashPhase[segment];
      let c0r = 1;
      let c0g = 1;
      let c0b = 1;
      let c1r = 1;
      let c1g = 1;
      let c1b = 1;
      if (vertexColorData && vertexColorItemSize === 3) {
        const base0 = vi0 * 3;
        if (base0 >= 0 && base0 + 2 < vertexColorData.length) {
          c0r = clamp01(vertexColorData[base0]);
          c0g = clamp01(vertexColorData[base0 + 1]);
          c0b = clamp01(vertexColorData[base0 + 2]);
        }
        const base1 = vi1 * 3;
        if (base1 >= 0 && base1 + 2 < vertexColorData.length) {
          c1r = clamp01(vertexColorData[base1]);
          c1g = clamp01(vertexColorData[base1 + 1]);
          c1b = clamp01(vertexColorData[base1 + 2]);
        }
      }
      if (
        !(
          Number.isFinite(x0) &&
          Number.isFinite(y0) &&
          Number.isFinite(x1) &&
          Number.isFinite(y1) &&
          Number.isInteger(x0) &&
          Number.isInteger(y0) &&
          Number.isInteger(x1) &&
          Number.isInteger(y1)
        ) ||
        x0 < 0 ||
        x0 >= width ||
        x1 < 0 ||
        x1 >= width ||
        y0 < 0 ||
        y0 >= height ||
        y1 < 0 ||
        y1 >= height
      ) {
        throw new RangeError(
          "Line endpoints must be finite framebuffer pixel indices",
        );
      }

      const dx = Math.abs(x1 - x0);
      const dy = Math.abs(y1 - y0);
      const totalSteps = Math.max(dx, dy);
      this.#segmentX0 = x0;
      this.#segmentY0 = y0;
      this.#segmentDx = x1 - x0;
      this.#segmentDy = y1 - y0;
      this.#segmentLengthSquared =
        this.#segmentDx * this.#segmentDx + this.#segmentDy * this.#segmentDy;
      this.#segmentZ0 = z0;
      this.#segmentZ1 = z1;
      this.#segmentFog0 = fog0;
      this.#segmentFog1 = fog1;
      this.#segmentSourceT0 = sourceT0;
      this.#segmentSourceT1 = sourceT1;
      this.#segmentC0r = c0r;
      this.#segmentC0g = c0g;
      this.#segmentC0b = c0b;
      this.#segmentC1r = c1r;
      this.#segmentC1g = c1g;
      this.#segmentC1b = c1b;
      this.#segmentBaseR = baseR;
      this.#segmentBaseG = baseG;
      this.#segmentBaseB = baseB;
      this.#segmentFogR = fogR;
      this.#segmentFogG = fogG;
      this.#segmentFogB = fogB;
      this.#segmentHasFog = hasFog;

      const sx = x0 < x1 ? 1 : -1;
      const sy = y0 < y1 ? 1 : -1;
      let err = dx - dy;
      let x = x0;
      let y = y0;
      const maxSteps = totalSteps + 1;
      let steps = 0;
      for (;;) {
        if (++steps > maxSteps) {
          throw new Error("Line walker exceeded its bounded iteration count");
        }
        const step = steps - 1;
        if (!hasDash || (dashPhase + step) % (dashSize + gapSize) < dashSize) {
          this.#writeSquare(
            x,
            y,
            linewidth,
            width,
            height,
            framebuffer,
            depthTest,
            depthWrite,
            blend,
            srcWeight,
          );
        }
        if (x === x1 && y === y1) break;
        const e2 = err * 2;
        if (e2 > -dy) {
          err -= dy;
          x += sx;
        }
        if (e2 < dx) {
          err += dx;
          y += sy;
        }
      }
    }
  }

  #ensureStampStorage(width: number, height: number): void {
    const size = width * height;
    if (this.#stampGeneration.length === size) return;
    this.#stampGeneration = new Uint32Array(size);
    this.#stampDepth = new Uint16Array(size);
    this.#stampEpoch = 0;
  }

  #nextStampEpoch(): void {
    this.#stampEpoch = (this.#stampEpoch + 1) >>> 0;
    if (this.#stampEpoch === 0) {
      this.#stampGeneration.fill(0);
      this.#stampDepth.fill(0);
      this.#stampEpoch = 1;
    }
  }

  #writeSquare(
    cx: number,
    cy: number,
    linewidth: number,
    width: number,
    height: number,
    framebuffer: LineRasterFramebuffer,
    depthTest: boolean,
    depthWrite: boolean,
    blend: boolean,
    srcWeight: number,
  ): void {
    const left = (linewidth - 1) >> 1;
    const right = linewidth - 1 - left;
    const xMin = Math.max(0, cx - left);
    const xMax = Math.min(width - 1, cx + right);
    const yMin = Math.max(0, cy - left);
    const yMax = Math.min(height - 1, cy + right);
    const data = framebuffer.depthBuffer.data;
    const pixels = framebuffer.u32;
    const stamps = this.#stampGeneration;
    const stampDepth = this.#stampDepth;
    const stampEpoch = this.#stampEpoch;
    const dx = this.#segmentDx;
    const dy = this.#segmentDy;
    const lengthSquared = this.#segmentLengthSquared;
    for (let y = yMin; y <= yMax; y++) {
      let index = y * width + xMin;
      for (let x = xMin; x <= xMax; x++, index++) {
        const t =
          lengthSquared === 0
            ? 0
            : clamp01(
                ((x - this.#segmentX0) * dx + (y - this.#segmentY0) * dy) /
                  lengthSquared,
              );
        const ndcZ = this.#segmentZ0 + (this.#segmentZ1 - this.#segmentZ0) * t;
        const depth16 = clampDepth(((ndcZ + 1) * 32767.5 + 0.5) | 0);
        if (stamps[index] === stampEpoch && stampDepth[index] === depth16) {
          continue;
        }
        const sourceT =
          this.#segmentSourceT0 +
          (this.#segmentSourceT1 - this.#segmentSourceT0) * t;
        const vertexR =
          this.#segmentC0r + (this.#segmentC1r - this.#segmentC0r) * sourceT;
        const vertexG =
          this.#segmentC0g + (this.#segmentC1g - this.#segmentC0g) * sourceT;
        const vertexB =
          this.#segmentC0b + (this.#segmentC1b - this.#segmentC0b) * sourceT;
        let r = this.#segmentBaseR * vertexR;
        let g = this.#segmentBaseG * vertexG;
        let b = this.#segmentBaseB * vertexB;
        if (this.#segmentHasFog) {
          const fogFactor = clamp01(
            this.#segmentFog0 + (this.#segmentFog1 - this.#segmentFog0) * t,
          );
          const dither = BAYER4[((y & 3) << 2) | (x & 3)];
          r = r + (this.#segmentFogR - r) * fogFactor + dither;
          g = g + (this.#segmentFogG - g) * fogFactor + dither;
          b = b + (this.#segmentFogB - b) * fogFactor + dither;
        }
        r = clampByte(r);
        g = clampByte(g);
        b = clampByte(b);
        if (depthTest && depth16 > data[index]) continue;
        stamps[index] = stampEpoch;
        stampDepth[index] = depth16;
        if (depthWrite) data[index] = depth16;
        if (!blend) {
          pixels[index] = 0xff000000 | (b << 16) | (g << 8) | r;
          continue;
        }
        const destination = pixels[index];
        const destinationWeight = 1 - srcWeight;
        pixels[index] =
          0xff000000 |
          (((b * srcWeight +
            ((destination >> 16) & 0xff) * destinationWeight +
            0.5) |
            0) <<
            16) |
          (((g * srcWeight +
            ((destination >> 8) & 0xff) * destinationWeight +
            0.5) |
            0) <<
            8) |
          ((r * srcWeight + (destination & 0xff) * destinationWeight + 0.5) |
            0);
      }
    }
  }
}

function toByte(value: number): number {
  return clampByte(Math.round(value * 255));
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : Math.min(value, 1);
}

function clampByte(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 255) return 255;
  return value | 0;
}

function clampDepth(value: number): number {
  return value < 0 ? 0 : Math.min(value, 0xffff);
}
