import { textureCoordinateToTexel } from "../texture/TextureWrapping.ts";
import { BAYER4, type RasterizerState } from "./_RasterizerTypes.ts";

type GouraudTexScanlineArgs = [
  y: number,
  xStart: number,
  xEnd: number,
  u: number,
  v: number,
  duDx: number,
  dvDx: number,
];

interface GouraudTexScanline {
  y: number;
  xStart: number;
  xEnd: number;
  dIdx: number;
  depth16F: number;
  dDepth16: number;
  ndcZ: number;
  dNdcZ: number;
  texU: number;
  dTexU: number;
  texV: number;
  dTexV: number;
  lr: number;
  dLR: number;
  lg: number;
  dLG: number;
  lb: number;
  dLB: number;
  tr: number;
  dTR: number;
  tg: number;
  dTG: number;
  tb: number;
  dTB: number;
  fogF: number;
  dFogF: number;
}

interface GouraudTexPixel {
  state: RasterizerState;
  texD: Uint8ClampedArray;
  fbIdx: number;
  texIdx: number;
  d: number;
  lr: number;
  lg: number;
  lb: number;
  tr: number;
  tg: number;
  tb: number;
  fogF: number;
}

interface GouraudTexColor {
  r: number;
  g: number;
  b: number;
}

type GouraudTexShadePixel = (
  pixel: GouraudTexPixel,
  color: GouraudTexColor,
) => void;

function clampUnit(value: number): number {
  return value < 0 ? 0 : Math.min(value, 1);
}

function brightnessLevel(
  litFactor: number,
  dither: number,
  levelCount: number,
): number {
  const level = (litFactor * levelCount + dither) | 0;
  if (level < 0) return 0;
  if (level >= levelCount) return levelCount - 1;
  return level;
}

function createGouraudTexScanline(
  state: RasterizerState,
  args: GouraudTexScanlineArgs,
): GouraudTexScanline {
  const [y, xStart, xEnd, u, v, duDx, dvDx] = args;
  const w = 1 - u - v;
  const gd = state.gouraudData as Float32Array;
  const b0 = state.gouraudBase;
  const dNdcZ =
    duDx * (state.ndcZ0 - state.ndcZ2) + dvDx * (state.ndcZ1 - state.ndcZ2);
  const dTexU =
    duDx * (state.uv0u - state.uv2u) + dvDx * (state.uv1u - state.uv2u);
  const dTexV =
    duDx * (state.uv0v - state.uv2v) + dvDx * (state.uv1v - state.uv2v);
  const dLR = duDx * (gd[b0] - gd[b0 + 6]) + dvDx * (gd[b0 + 3] - gd[b0 + 6]);
  const dLG =
    duDx * (gd[b0 + 1] - gd[b0 + 7]) + dvDx * (gd[b0 + 4] - gd[b0 + 7]);
  const dLB =
    duDx * (gd[b0 + 2] - gd[b0 + 8]) + dvDx * (gd[b0 + 5] - gd[b0 + 8]);
  const tint = state.vertexTintData;
  const tr = tint === undefined ? 0 : u * tint[0] + v * tint[3] + w * tint[6];
  const tg = tint === undefined ? 0 : u * tint[1] + v * tint[4] + w * tint[7];
  const tb = tint === undefined ? 0 : u * tint[2] + v * tint[5] + w * tint[8];
  const dTR =
    tint === undefined
      ? 0
      : duDx * (tint[0] - tint[6]) + dvDx * (tint[3] - tint[6]);
  const dTG =
    tint === undefined
      ? 0
      : duDx * (tint[1] - tint[7]) + dvDx * (tint[4] - tint[7]);
  const dTB =
    tint === undefined
      ? 0
      : duDx * (tint[2] - tint[8]) + dvDx * (tint[5] - tint[8]);
  const ndcZ = u * state.ndcZ0 + v * state.ndcZ1 + w * state.ndcZ2;
  const texU = u * state.uv0u + v * state.uv1u + w * state.uv2u;
  const texV = u * state.uv0v + v * state.uv1v + w * state.uv2v;
  const lr = u * gd[b0] + v * gd[b0 + 3] + w * gd[b0 + 6];
  const lg = u * gd[b0 + 1] + v * gd[b0 + 4] + w * gd[b0 + 7];
  const lb = u * gd[b0 + 2] + v * gd[b0 + 5] + w * gd[b0 + 8];
  const fogF = state.hasFog
    ? u * state.fogF0 + v * state.fogF1 + w * state.fogF2
    : 0;
  const dFogF = state.hasFog
    ? duDx * (state.fogF0 - state.fogF2) + dvDx * (state.fogF1 - state.fogF2)
    : 0;
  return {
    y,
    xStart,
    xEnd,
    dIdx: y * state.dbWidth + xStart,
    depth16F: (ndcZ + 1) * 32767.5 + 0.5,
    dDepth16: dNdcZ * 32767.5,
    ndcZ,
    dNdcZ,
    texU,
    dTexU,
    texV,
    dTexV,
    lr,
    dLR,
    lg,
    dLG,
    lb,
    dLB,
    tr,
    dTR,
    tg,
    dTG,
    tb,
    dTB,
    fogF,
    dFogF,
  };
}

function writeGouraudTexPixel(
  pixel: GouraudTexPixel,
  color: GouraudTexColor,
): void {
  const state = pixel.state;
  if (state.hasFog) {
    const f = clampUnit(pixel.fogF);
    color.r = (color.r + (state.fogR - color.r) * f + pixel.d) | 0;
    color.g = (color.g + (state.fogG - color.g) * f + pixel.d) | 0;
    color.b = (color.b + (state.fogB - color.b) * f + pixel.d) | 0;
  }
  if (state.blend) {
    const dstPx = state.fbU32[pixel.fbIdx];
    const sw = state.srcWeight;
    const dw = 1 - sw;
    state.fbU32[pixel.fbIdx] =
      0xff000000 |
      (((color.b * sw + ((dstPx >> 16) & 0xff) * dw + 0.5) | 0) << 16) |
      (((color.g * sw + ((dstPx >> 8) & 0xff) * dw + 0.5) | 0) << 8) |
      ((color.r * sw + (dstPx & 0xff) * dw + 0.5) | 0);
  } else {
    state.fbU32[pixel.fbIdx] =
      0xff000000 | (color.b << 16) | (color.g << 8) | color.r;
  }
}

function fillGouraudTexScanline(
  state: RasterizerState,
  scanline: GouraudTexScanline,
  shadePixel: GouraudTexShadePixel,
): void {
  const texD = state.texData as Uint8ClampedArray;
  const pixel: GouraudTexPixel = {
    state,
    texD,
    fbIdx: 0,
    texIdx: 0,
    d: 0,
    lr: 0,
    lg: 0,
    lb: 0,
    tr: 0,
    tg: 0,
    tb: 0,
    fogF: 0,
  };
  const color: GouraudTexColor = { r: 0, g: 0, b: 0 };
  for (
    let x = scanline.xStart;
    x <= scanline.xEnd;
    x++,
      scanline.dIdx++,
      scanline.ndcZ += scanline.dNdcZ,
      scanline.texU += scanline.dTexU,
      scanline.texV += scanline.dTexV,
      scanline.lr += scanline.dLR,
      scanline.lg += scanline.dLG,
      scanline.lb += scanline.dLB,
      scanline.tr += scanline.dTR,
      scanline.tg += scanline.dTG,
      scanline.tb += scanline.dTB
  ) {
    scanline.depth16F += scanline.dDepth16;
    const depth16 = scanline.depth16F | 0;
    if (state.depthTest && depth16 > state.dbData[scanline.dIdx]) continue;
    const tx = textureCoordinateToTexel(scanline.texU, state.texW, state.wrapS);
    const ty = textureCoordinateToTexel(scanline.texV, state.texH, state.wrapT);
    const tidx = (ty * state.texW + tx) << 2;
    if (texD[tidx + 3] === 0) continue;
    if (state.depthWrite) state.dbData[scanline.dIdx] = depth16;
    pixel.fbIdx = scanline.dIdx;
    pixel.d = BAYER4[((scanline.y & 3) << 2) | (x & 3)];
    pixel.lr = scanline.lr;
    pixel.lg = scanline.lg;
    pixel.lb = scanline.lb;
    pixel.tr = scanline.tr;
    pixel.tg = scanline.tg;
    pixel.tb = scanline.tb;
    pixel.fogF = scanline.fogF;
    pixel.texIdx = tidx;
    shadePixel(pixel, color);
    writeGouraudTexPixel(pixel, color);
    if (state.hasFog) scanline.fogF += scanline.dFogF;
  }
}

function shadeUniformTint(
  pixel: GouraudTexPixel,
  color: GouraudTexColor,
): void {
  const litR = clampUnit(pixel.lr);
  const litG = clampUnit(pixel.lg);
  const litB = clampUnit(pixel.lb);
  const litFactor = (litR + litG + litB) * 0.3333333333333333;
  const brightnessLevels = pixel.state.brightnessLevels;
  if (brightnessLevels !== undefined) {
    const brightnessData =
      brightnessLevels[
        brightnessLevel(litFactor, pixel.d, brightnessLevels.length)
      ];
    color.r =
      (brightnessData[pixel.texIdx] * pixel.state.textureColorR + pixel.d) | 0;
    color.g =
      (brightnessData[pixel.texIdx + 1] * pixel.state.textureColorG + pixel.d) |
      0;
    color.b =
      (brightnessData[pixel.texIdx + 2] * pixel.state.textureColorB + pixel.d) |
      0;
  } else {
    color.r =
      (pixel.texD[pixel.texIdx] * litR * pixel.state.textureColorR + pixel.d) |
      0;
    color.g =
      (pixel.texD[pixel.texIdx + 1] * litG * pixel.state.textureColorG +
        pixel.d) |
      0;
    color.b =
      (pixel.texD[pixel.texIdx + 2] * litB * pixel.state.textureColorB +
        pixel.d) |
      0;
  }
}

function shadeCombinedTint(
  pixel: GouraudTexPixel,
  color: GouraudTexColor,
): void {
  const state = pixel.state;
  const tintR = clampUnit(pixel.lr);
  const tintG = clampUnit(pixel.lg);
  const tintB = clampUnit(pixel.lb);
  color.r =
    (pixel.texD[pixel.texIdx] * tintR * state.textureMaterialR + pixel.d) | 0;
  color.g =
    (pixel.texD[pixel.texIdx + 1] * tintG * state.textureMaterialG + pixel.d) |
    0;
  color.b =
    (pixel.texD[pixel.texIdx + 2] * tintB * state.textureMaterialB + pixel.d) |
    0;
}

function shadeVertexTint(pixel: GouraudTexPixel, color: GouraudTexColor): void {
  const state = pixel.state;
  const litR = clampUnit(pixel.lr);
  const litG = clampUnit(pixel.lg);
  const litB = clampUnit(pixel.lb);
  const litFactor = (litR + litG + litB) * 0.3333333333333333;
  const brightnessLevels = state.brightnessLevels;
  let sampleR: number;
  let sampleG: number;
  let sampleB: number;
  if (brightnessLevels !== undefined) {
    const brightnessData =
      brightnessLevels[
        brightnessLevel(litFactor, pixel.d, brightnessLevels.length)
      ];
    sampleR = brightnessData[pixel.texIdx];
    sampleG = brightnessData[pixel.texIdx + 1];
    sampleB = brightnessData[pixel.texIdx + 2];
  } else {
    sampleR = pixel.texD[pixel.texIdx] * litFactor;
    sampleG = pixel.texD[pixel.texIdx + 1] * litFactor;
    sampleB = pixel.texD[pixel.texIdx + 2] * litFactor;
  }
  color.r = (sampleR * pixel.tr * state.textureMaterialR + pixel.d) | 0;
  color.g = (sampleG * pixel.tg * state.textureMaterialG + pixel.d) | 0;
  color.b = (sampleB * pixel.tb * state.textureMaterialB + pixel.d) | 0;
}

function shadeNoTint(pixel: GouraudTexPixel, color: GouraudTexColor): void {
  const state = pixel.state;
  const cr = (state.baseR * clampUnit(pixel.lr) + pixel.d) | 0;
  const cg = (state.baseG * clampUnit(pixel.lg) + pixel.d) | 0;
  const cb = (state.baseB * clampUnit(pixel.lb) + pixel.d) | 0;
  const litFactor = (cr + cg + cb) * 0.00130718954248366;
  const brightnessLevels = state.brightnessLevels;
  if (brightnessLevels !== undefined) {
    const brightnessData =
      brightnessLevels[
        brightnessLevel(litFactor, pixel.d, brightnessLevels.length)
      ];
    color.r = brightnessData[pixel.texIdx];
    color.g = brightnessData[pixel.texIdx + 1];
    color.b = brightnessData[pixel.texIdx + 2];
  } else {
    color.r = (pixel.texD[pixel.texIdx] * litFactor + pixel.d) | 0;
    color.g = (pixel.texD[pixel.texIdx + 1] * litFactor + pixel.d) | 0;
    color.b = (pixel.texD[pixel.texIdx + 2] * litFactor + pixel.d) | 0;
  }
}

/** Rasterizes a textured scanline with interpolated lighting and a uniform texture tint. */
export function fillGouraudTexUniformTint(
  state: RasterizerState,
  ...args: GouraudTexScanlineArgs
): void {
  fillGouraudTexScanline(
    state,
    createGouraudTexScanline(state, args),
    shadeUniformTint,
  );
}

/** Rasterizes a textured scanline with interpolated lighting and a combined material texture tint. */
export function fillGouraudTexCombinedTint(
  state: RasterizerState,
  ...args: GouraudTexScanlineArgs
): void {
  fillGouraudTexScanline(
    state,
    createGouraudTexScanline(state, args),
    shadeCombinedTint,
  );
}

/** Rasterizes a textured scanline with interpolated lighting and per-vertex texture tint. */
export function fillGouraudTexVertexTint(
  state: RasterizerState,
  ...args: GouraudTexScanlineArgs
): void {
  fillGouraudTexScanline(
    state,
    createGouraudTexScanline(state, args),
    shadeVertexTint,
  );
}

/** Rasterizes a textured scanline with interpolated lighting and no additional tint. */
export function fillGouraudTexNoTint(
  state: RasterizerState,
  ...args: GouraudTexScanlineArgs
): void {
  fillGouraudTexScanline(
    state,
    createGouraudTexScanline(state, args),
    shadeNoTint,
  );
}
