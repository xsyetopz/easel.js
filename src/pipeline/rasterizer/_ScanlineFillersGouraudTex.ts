import { textureCoordinateToTexel } from "../texture/TextureWrapping.ts";
import { BAYER4, type RasterizerState } from "./_RasterizerTypes.ts";

export function fillGouraudTexUniformTint(
  state: RasterizerState,
  y: number,
  xStart: number,
  xEnd: number,
  u: number,
  v: number,
  duDx: number,
  dvDx: number,
): void {
  const w = 1 - u - v;
  const dNdcZ =
    duDx * (state.ndcZ0 - state.ndcZ2) + dvDx * (state.ndcZ1 - state.ndcZ2);
  const dTexU =
    duDx * (state.uv0u - state.uv2u) + dvDx * (state.uv1u - state.uv2u);
  const dTexV =
    duDx * (state.uv0v - state.uv2v) + dvDx * (state.uv1v - state.uv2v);
  const gd = state.gouraudData as Float32Array;
  const b0 = state.gouraudBase;
  const dLR = duDx * (gd[b0] - gd[b0 + 6]) + dvDx * (gd[b0 + 3] - gd[b0 + 6]);
  const dLG =
    duDx * (gd[b0 + 1] - gd[b0 + 7]) + dvDx * (gd[b0 + 4] - gd[b0 + 7]);
  const dLB =
    duDx * (gd[b0 + 2] - gd[b0 + 8]) + dvDx * (gd[b0 + 5] - gd[b0 + 8]);
  const uniformColorR = state.textureColorR;
  const uniformColorG = state.textureColorG;
  const uniformColorB = state.textureColorB;
  let ndcZ = u * state.ndcZ0 + v * state.ndcZ1 + w * state.ndcZ2;
  let texU = u * state.uv0u + v * state.uv1u + w * state.uv2u;
  let texV = u * state.uv0v + v * state.uv1v + w * state.uv2v;
  let lr = u * gd[b0] + v * gd[b0 + 3] + w * gd[b0 + 6];
  let lg = u * gd[b0 + 1] + v * gd[b0 + 4] + w * gd[b0 + 7];
  let lb = u * gd[b0 + 2] + v * gd[b0 + 5] + w * gd[b0 + 8];
  const dbData = state.dbData;
  const dbW = state.dbWidth;
  const texD = state.texData as Uint8ClampedArray;
  const texH = state.texH;
  const texW = state.texW;
  const hasFog = state.hasFog;
  const fbU32 = state.fbU32;
  let dIdx = y * dbW + xStart;
  const bl = state.brightnessLevels;
  const hasBL = bl !== undefined;
  const blCount = hasBL ? (bl as Uint8ClampedArray[]).length : 0;
  const wS = state.wrapS;
  const wT = state.wrapT;
  let dFogF = 0;
  let fogF = 0;
  let fogR = 0;
  let fogG = 0;
  let fogB = 0;
  if (hasFog) {
    dFogF =
      duDx * (state.fogF0 - state.fogF2) + dvDx * (state.fogF1 - state.fogF2);
    fogF = u * state.fogF0 + v * state.fogF1 + w * state.fogF2;
    fogR = state.fogR;
    fogG = state.fogG;
    fogB = state.fogB;
  }
  const blend = state.blend;
  const depthTest = state.depthTest;
  const depthWrite = state.depthWrite;
  const srcWeight = state.srcWeight;
  const dDepth16 = dNdcZ * 32767.5;
  let depth16F = (ndcZ + 1) * 32767.5 + 0.5;
  for (
    let x = xStart;
    x <= xEnd;
    x++,
      dIdx++,
      ndcZ += dNdcZ,
      texU += dTexU,
      texV += dTexV,
      lr += dLR,
      lg += dLG,
      lb += dLB
  ) {
    depth16F += dDepth16;
    const depth16 = depth16F | 0;
    if (depthTest && depth16 > dbData[dIdx]) continue;
    const tx = textureCoordinateToTexel(texU, texW, wS);
    const ty = textureCoordinateToTexel(texV, texH, wT);
    const tidx = (ty * texW + tx) << 2;
    if (texD[tidx + 3] === 0) continue;
    if (depthWrite) dbData[dIdx] = depth16;
    const d = BAYER4[((y & 3) << 2) | (x & 3)];
    const litR = lr < 0 ? 0 : lr > 1 ? 1 : lr;
    const litG = lg < 0 ? 0 : lg > 1 ? 1 : lg;
    const litB = lb < 0 ? 0 : lb > 1 ? 1 : lb;
    const litFactor = (litR + litG + litB) * 0.3333333333333333;
    let sampleR: number;
    let sampleG: number;
    let sampleB: number;
    if (hasBL) {
      const level = (litFactor * blCount + d) | 0;
      const li = level < 0 ? 0 : level >= blCount ? blCount - 1 : level;
      const bd = (bl as Uint8ClampedArray[])[li];
      sampleR = bd[tidx];
      sampleG = bd[tidx + 1];
      sampleB = bd[tidx + 2];
    } else {
      sampleR = texD[tidx] * litR;
      sampleG = texD[tidx + 1] * litG;
      sampleB = texD[tidx + 2] * litB;
    }
    let r = (sampleR * uniformColorR + d) | 0;
    let g = (sampleG * uniformColorG + d) | 0;
    let b = (sampleB * uniformColorB + d) | 0;
    if (hasFog) {
      const f = fogF < 0 ? 0 : fogF > 1 ? 1 : fogF;
      r = (r + (fogR - r) * f + d) | 0;
      g = (g + (fogG - g) * f + d) | 0;
      b = (b + (fogB - b) * f + d) | 0;
    }
    if (blend) {
      const dstPx = fbU32[dIdx];
      const sw = srcWeight;
      const dw = 1 - sw;
      fbU32[dIdx] =
        0xff000000 |
        (((b * sw + ((dstPx >> 16) & 0xff) * dw + 0.5) | 0) << 16) |
        (((g * sw + ((dstPx >> 8) & 0xff) * dw + 0.5) | 0) << 8) |
        ((r * sw + (dstPx & 0xff) * dw + 0.5) | 0);
    } else {
      fbU32[dIdx] = 0xff000000 | (b << 16) | (g << 8) | r;
    }
    if (hasFog) fogF += dFogF;
  }
}

export function fillGouraudTexCombinedTint(
  state: RasterizerState,
  y: number,
  xStart: number,
  xEnd: number,
  u: number,
  v: number,
  duDx: number,
  dvDx: number,
): void {
  const w = 1 - u - v;
  const dNdcZ =
    duDx * (state.ndcZ0 - state.ndcZ2) + dvDx * (state.ndcZ1 - state.ndcZ2);
  const dTexU =
    duDx * (state.uv0u - state.uv2u) + dvDx * (state.uv1u - state.uv2u);
  const dTexV =
    duDx * (state.uv0v - state.uv2v) + dvDx * (state.uv1v - state.uv2v);
  const gd = state.gouraudData as Float32Array;
  const b0 = state.gouraudBase;
  const dLR = duDx * (gd[b0] - gd[b0 + 6]) + dvDx * (gd[b0 + 3] - gd[b0 + 6]);
  const dLG =
    duDx * (gd[b0 + 1] - gd[b0 + 7]) + dvDx * (gd[b0 + 4] - gd[b0 + 7]);
  const dLB =
    duDx * (gd[b0 + 2] - gd[b0 + 8]) + dvDx * (gd[b0 + 5] - gd[b0 + 8]);
  const materialR = state.textureMaterialR;
  const materialG = state.textureMaterialG;
  const materialB = state.textureMaterialB;
  let ndcZ = u * state.ndcZ0 + v * state.ndcZ1 + w * state.ndcZ2;
  let texU = u * state.uv0u + v * state.uv1u + w * state.uv2u;
  let texV = u * state.uv0v + v * state.uv1v + w * state.uv2v;
  let lr = u * gd[b0] + v * gd[b0 + 3] + w * gd[b0 + 6];
  let lg = u * gd[b0 + 1] + v * gd[b0 + 4] + w * gd[b0 + 7];
  let lb = u * gd[b0 + 2] + v * gd[b0 + 5] + w * gd[b0 + 8];
  const dbData = state.dbData;
  const dbW = state.dbWidth;
  const texD = state.texData as Uint8ClampedArray;
  const texH = state.texH;
  const texW = state.texW;
  const hasFog = state.hasFog;
  const fbU32 = state.fbU32;
  let dIdx = y * dbW + xStart;
  const wS = state.wrapS;
  const wT = state.wrapT;
  let dFogF = 0;
  let fogF = 0;
  let fogR = 0;
  let fogG = 0;
  let fogB = 0;
  if (hasFog) {
    dFogF =
      duDx * (state.fogF0 - state.fogF2) + dvDx * (state.fogF1 - state.fogF2);
    fogF = u * state.fogF0 + v * state.fogF1 + w * state.fogF2;
    fogR = state.fogR;
    fogG = state.fogG;
    fogB = state.fogB;
  }
  const blend = state.blend;
  const depthTest = state.depthTest;
  const depthWrite = state.depthWrite;
  const srcWeight = state.srcWeight;
  const dDepth16 = dNdcZ * 32767.5;
  let depth16F = (ndcZ + 1) * 32767.5 + 0.5;
  for (
    let x = xStart;
    x <= xEnd;
    x++,
      dIdx++,
      ndcZ += dNdcZ,
      texU += dTexU,
      texV += dTexV,
      lr += dLR,
      lg += dLG,
      lb += dLB
  ) {
    depth16F += dDepth16;
    const depth16 = depth16F | 0;
    if (depthTest && depth16 > dbData[dIdx]) continue;
    const tx = textureCoordinateToTexel(texU, texW, wS);
    const ty = textureCoordinateToTexel(texV, texH, wT);
    const tidx = (ty * texW + tx) << 2;
    if (texD[tidx + 3] === 0) continue;
    if (depthWrite) dbData[dIdx] = depth16;
    const d = BAYER4[((y & 3) << 2) | (x & 3)];
    const tintR = lr < 0 ? 0 : lr > 1 ? 1 : lr;
    const tintG = lg < 0 ? 0 : lg > 1 ? 1 : lg;
    const tintB = lb < 0 ? 0 : lb > 1 ? 1 : lb;
    let r = (texD[tidx] * tintR * materialR + d) | 0;
    let g = (texD[tidx + 1] * tintG * materialG + d) | 0;
    let b = (texD[tidx + 2] * tintB * materialB + d) | 0;
    if (hasFog) {
      const f = fogF < 0 ? 0 : fogF > 1 ? 1 : fogF;
      r = (r + (fogR - r) * f + d) | 0;
      g = (g + (fogG - g) * f + d) | 0;
      b = (b + (fogB - b) * f + d) | 0;
    }
    if (blend) {
      const dstPx = fbU32[dIdx];
      const sw = srcWeight;
      const dw = 1 - sw;
      fbU32[dIdx] =
        0xff000000 |
        (((b * sw + ((dstPx >> 16) & 0xff) * dw + 0.5) | 0) << 16) |
        (((g * sw + ((dstPx >> 8) & 0xff) * dw + 0.5) | 0) << 8) |
        ((r * sw + (dstPx & 0xff) * dw + 0.5) | 0);
    } else {
      fbU32[dIdx] = 0xff000000 | (b << 16) | (g << 8) | r;
    }
    if (hasFog) fogF += dFogF;
  }
}

export function fillGouraudTexVertexTint(
  state: RasterizerState,
  y: number,
  xStart: number,
  xEnd: number,
  u: number,
  v: number,
  duDx: number,
  dvDx: number,
): void {
  const w = 1 - u - v;
  const dNdcZ =
    duDx * (state.ndcZ0 - state.ndcZ2) + dvDx * (state.ndcZ1 - state.ndcZ2);
  const dTexU =
    duDx * (state.uv0u - state.uv2u) + dvDx * (state.uv1u - state.uv2u);
  const dTexV =
    duDx * (state.uv0v - state.uv2v) + dvDx * (state.uv1v - state.uv2v);
  const gd = state.gouraudData as Float32Array;
  const b0 = state.gouraudBase;
  const dLR = duDx * (gd[b0] - gd[b0 + 6]) + dvDx * (gd[b0 + 3] - gd[b0 + 6]);
  const dLG =
    duDx * (gd[b0 + 1] - gd[b0 + 7]) + dvDx * (gd[b0 + 4] - gd[b0 + 7]);
  const dLB =
    duDx * (gd[b0 + 2] - gd[b0 + 8]) + dvDx * (gd[b0 + 5] - gd[b0 + 8]);
  const tint = state.vertexTintData as Float32Array;
  const materialR = state.textureMaterialR;
  const materialG = state.textureMaterialG;
  const materialB = state.textureMaterialB;
  const dTR = duDx * (tint[0] - tint[6]) + dvDx * (tint[3] - tint[6]);
  const dTG = duDx * (tint[1] - tint[7]) + dvDx * (tint[4] - tint[7]);
  const dTB = duDx * (tint[2] - tint[8]) + dvDx * (tint[5] - tint[8]);
  let ndcZ = u * state.ndcZ0 + v * state.ndcZ1 + w * state.ndcZ2;
  let texU = u * state.uv0u + v * state.uv1u + w * state.uv2u;
  let texV = u * state.uv0v + v * state.uv1v + w * state.uv2v;
  let lr = u * gd[b0] + v * gd[b0 + 3] + w * gd[b0 + 6];
  let lg = u * gd[b0 + 1] + v * gd[b0 + 4] + w * gd[b0 + 7];
  let lb = u * gd[b0 + 2] + v * gd[b0 + 5] + w * gd[b0 + 8];
  let tr = u * tint[0] + v * tint[3] + w * tint[6];
  let tg = u * tint[1] + v * tint[4] + w * tint[7];
  let tb = u * tint[2] + v * tint[5] + w * tint[8];
  const dbData = state.dbData;
  const dbW = state.dbWidth;
  const texD = state.texData as Uint8ClampedArray;
  const texH = state.texH;
  const texW = state.texW;
  const hasFog = state.hasFog;
  const fbU32 = state.fbU32;
  let dIdx = y * dbW + xStart;
  const bl = state.brightnessLevels;
  const hasBL = bl !== undefined;
  const blCount = hasBL ? (bl as Uint8ClampedArray[]).length : 0;
  const wS = state.wrapS;
  const wT = state.wrapT;
  let dFogF = 0;
  let fogF = 0;
  let fogR = 0;
  let fogG = 0;
  let fogB = 0;
  if (hasFog) {
    dFogF =
      duDx * (state.fogF0 - state.fogF2) + dvDx * (state.fogF1 - state.fogF2);
    fogF = u * state.fogF0 + v * state.fogF1 + w * state.fogF2;
    fogR = state.fogR;
    fogG = state.fogG;
    fogB = state.fogB;
  }
  const blend = state.blend;
  const depthTest = state.depthTest;
  const depthWrite = state.depthWrite;
  const srcWeight = state.srcWeight;
  const dDepth16 = dNdcZ * 32767.5;
  let depth16F = (ndcZ + 1) * 32767.5 + 0.5;
  for (
    let x = xStart;
    x <= xEnd;
    x++,
      dIdx++,
      ndcZ += dNdcZ,
      texU += dTexU,
      texV += dTexV,
      lr += dLR,
      lg += dLG,
      lb += dLB,
      tr += dTR,
      tg += dTG,
      tb += dTB
  ) {
    depth16F += dDepth16;
    const depth16 = depth16F | 0;
    if (depthTest && depth16 > dbData[dIdx]) continue;
    const tx = textureCoordinateToTexel(texU, texW, wS);
    const ty = textureCoordinateToTexel(texV, texH, wT);
    const tidx = (ty * texW + tx) << 2;
    if (texD[tidx + 3] === 0) continue;
    if (depthWrite) dbData[dIdx] = depth16;
    const d = BAYER4[((y & 3) << 2) | (x & 3)];
    const litR = lr < 0 ? 0 : lr > 1 ? 1 : lr;
    const litG = lg < 0 ? 0 : lg > 1 ? 1 : lg;
    const litB = lb < 0 ? 0 : lb > 1 ? 1 : lb;
    const litFactor = (litR + litG + litB) * 0.3333333333333333;
    let sampleR: number;
    let sampleG: number;
    let sampleB: number;
    if (hasBL) {
      const level = (litFactor * blCount + d) | 0;
      const li = level < 0 ? 0 : level >= blCount ? blCount - 1 : level;
      const bd = (bl as Uint8ClampedArray[])[li];
      sampleR = bd[tidx];
      sampleG = bd[tidx + 1];
      sampleB = bd[tidx + 2];
    } else {
      sampleR = texD[tidx] * litFactor;
      sampleG = texD[tidx + 1] * litFactor;
      sampleB = texD[tidx + 2] * litFactor;
    }
    let r = (sampleR * tr * materialR + d) | 0;
    let g = (sampleG * tg * materialG + d) | 0;
    let b = (sampleB * tb * materialB + d) | 0;
    if (hasFog) {
      const f = fogF < 0 ? 0 : fogF > 1 ? 1 : fogF;
      r = (r + (fogR - r) * f + d) | 0;
      g = (g + (fogG - g) * f + d) | 0;
      b = (b + (fogB - b) * f + d) | 0;
    }
    if (blend) {
      const dstPx = fbU32[dIdx];
      const sw = srcWeight;
      const dw = 1 - sw;
      fbU32[dIdx] =
        0xff000000 |
        (((b * sw + ((dstPx >> 16) & 0xff) * dw + 0.5) | 0) << 16) |
        (((g * sw + ((dstPx >> 8) & 0xff) * dw + 0.5) | 0) << 8) |
        ((r * sw + (dstPx & 0xff) * dw + 0.5) | 0);
    } else {
      fbU32[dIdx] = 0xff000000 | (b << 16) | (g << 8) | r;
    }
    if (hasFog) fogF += dFogF;
  }
}

export function fillGouraudTexNoTint(
  state: RasterizerState,
  y: number,
  xStart: number,
  xEnd: number,
  u: number,
  v: number,
  duDx: number,
  dvDx: number,
): void {
  const w = 1 - u - v;
  const dNdcZ =
    duDx * (state.ndcZ0 - state.ndcZ2) + dvDx * (state.ndcZ1 - state.ndcZ2);
  const dTexU =
    duDx * (state.uv0u - state.uv2u) + dvDx * (state.uv1u - state.uv2u);
  const dTexV =
    duDx * (state.uv0v - state.uv2v) + dvDx * (state.uv1v - state.uv2v);
  const gd = state.gouraudData as Float32Array;
  const b0 = state.gouraudBase;
  const dLR = duDx * (gd[b0] - gd[b0 + 6]) + dvDx * (gd[b0 + 3] - gd[b0 + 6]);
  const dLG =
    duDx * (gd[b0 + 1] - gd[b0 + 7]) + dvDx * (gd[b0 + 4] - gd[b0 + 7]);
  const dLB =
    duDx * (gd[b0 + 2] - gd[b0 + 8]) + dvDx * (gd[b0 + 5] - gd[b0 + 8]);
  let ndcZ = u * state.ndcZ0 + v * state.ndcZ1 + w * state.ndcZ2;
  let texU = u * state.uv0u + v * state.uv1u + w * state.uv2u;
  let texV = u * state.uv0v + v * state.uv1v + w * state.uv2v;
  let lr = u * gd[b0] + v * gd[b0 + 3] + w * gd[b0 + 6];
  let lg = u * gd[b0 + 1] + v * gd[b0 + 4] + w * gd[b0 + 7];
  let lb = u * gd[b0 + 2] + v * gd[b0 + 5] + w * gd[b0 + 8];
  const dbData = state.dbData;
  const dbW = state.dbWidth;
  const texD = state.texData as Uint8ClampedArray;
  const texH = state.texH;
  const texW = state.texW;
  const baseR = state.baseR;
  const baseG = state.baseG;
  const baseB = state.baseB;
  const hasFog = state.hasFog;
  const fbU32 = state.fbU32;
  let dIdx = y * dbW + xStart;
  const bl = state.brightnessLevels;
  const hasBL = bl !== undefined;
  const blCount = hasBL ? (bl as Uint8ClampedArray[]).length : 0;
  const wS = state.wrapS;
  const wT = state.wrapT;
  let dFogF = 0;
  let fogF = 0;
  let fogR = 0;
  let fogG = 0;
  let fogB = 0;
  if (hasFog) {
    dFogF =
      duDx * (state.fogF0 - state.fogF2) + dvDx * (state.fogF1 - state.fogF2);
    fogF = u * state.fogF0 + v * state.fogF1 + w * state.fogF2;
    fogR = state.fogR;
    fogG = state.fogG;
    fogB = state.fogB;
  }
  const blend = state.blend;
  const depthTest = state.depthTest;
  const depthWrite = state.depthWrite;
  const srcWeight = state.srcWeight;
  const dDepth16 = dNdcZ * 32767.5;
  let depth16F = (ndcZ + 1) * 32767.5 + 0.5;
  for (
    let x = xStart;
    x <= xEnd;
    x++,
      dIdx++,
      ndcZ += dNdcZ,
      texU += dTexU,
      texV += dTexV,
      lr += dLR,
      lg += dLG,
      lb += dLB
  ) {
    depth16F += dDepth16;
    const depth16 = depth16F | 0;
    if (depthTest && depth16 > dbData[dIdx]) continue;
    const tx = textureCoordinateToTexel(texU, texW, wS);
    const ty = textureCoordinateToTexel(texV, texH, wT);
    const tidx = (ty * texW + tx) << 2;
    if (texD[tidx + 3] === 0) continue;
    if (depthWrite) dbData[dIdx] = depth16;
    const d = BAYER4[((y & 3) << 2) | (x & 3)];
    const cr = (baseR * (lr < 0 ? 0 : lr > 1 ? 1 : lr) + d) | 0;
    const cg = (baseG * (lg < 0 ? 0 : lg > 1 ? 1 : lg) + d) | 0;
    const cb = (baseB * (lb < 0 ? 0 : lb > 1 ? 1 : lb) + d) | 0;
    const litFactor = (cr + cg + cb) * 0.00130718954248366;
    let r: number;
    let g: number;
    let b: number;
    if (hasBL) {
      const level = (litFactor * blCount + d) | 0;
      const li = level < 0 ? 0 : level >= blCount ? blCount - 1 : level;
      const bd = (bl as Uint8ClampedArray[])[li];
      r = bd[tidx];
      g = bd[tidx + 1];
      b = bd[tidx + 2];
    } else {
      r = (texD[tidx] * litFactor + d) | 0;
      g = (texD[tidx + 1] * litFactor + d) | 0;
      b = (texD[tidx + 2] * litFactor + d) | 0;
    }
    if (hasFog) {
      const f = fogF < 0 ? 0 : fogF > 1 ? 1 : fogF;
      r = (r + (fogR - r) * f + d) | 0;
      g = (g + (fogG - g) * f + d) | 0;
      b = (b + (fogB - b) * f + d) | 0;
    }
    if (blend) {
      const dstPx = fbU32[dIdx];
      const sw = srcWeight;
      const dw = 1 - sw;
      fbU32[dIdx] =
        0xff000000 |
        (((b * sw + ((dstPx >> 16) & 0xff) * dw + 0.5) | 0) << 16) |
        (((g * sw + ((dstPx >> 8) & 0xff) * dw + 0.5) | 0) << 8) |
        ((r * sw + (dstPx & 0xff) * dw + 0.5) | 0);
    } else {
      fbU32[dIdx] = 0xff000000 | (b << 16) | (g << 8) | r;
    }
    if (hasFog) fogF += dFogF;
  }
}
