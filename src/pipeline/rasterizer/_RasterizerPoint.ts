import type { PointRasterState } from "./_RasterizerTypes.ts";

export function rasterizePoint(
  state: PointRasterState,
  cx: number,
  cy: number,
  radius: number,
  width: number,
  height: number,
  depth16: number,
  packed: number,
): void {
  const yMin = Math.max(0, Math.ceil(cy - radius));
  const yMax = Math.min(height - 1, Math.floor(cy + radius));
  const dbData = state.dbData;
  const dbWidth = state.dbWidth;
  const fbU32 = state.fbU32;
  const depthTest = state.depthTest;
  const depthWrite = state.depthWrite;

  if (!state.blend) {
    if (radius === 1) {
      for (let y = yMin; y <= yMax; y++) {
        const dy = y - cy;
        const xMin = Math.max(0, Math.ceil(cx - 1));
        const xMax = Math.min(width - 1, Math.floor(cx + 1));
        for (let x = xMin; x <= xMax; x++) {
          const dx = x - cx;
          if (dx * dx + dy * dy > 1) continue;
          const idx = y * dbWidth + x;
          if (depthTest && depth16 > dbData[idx]) continue;
          if (depthWrite) dbData[idx] = depth16;
          fbU32[idx] = packed;
        }
      }
      return;
    }

    const r2 = radius * radius;
    for (let y = yMin; y <= yMax; y++) {
      const dy = y - cy;
      const halfWidth = Math.sqrt(Math.max(0, r2 - dy * dy));
      const xMin = Math.max(0, Math.ceil(cx - halfWidth));
      const xMax = Math.min(width - 1, Math.floor(cx + halfWidth));
      let idx = y * dbWidth + xMin;
      for (let x = xMin; x <= xMax; x++, idx++) {
        if (depthTest && depth16 > dbData[idx]) continue;
        if (depthWrite) dbData[idx] = depth16;
        fbU32[idx] = packed;
      }
    }
    return;
  }

  const sw = state.srcWeight;
  const dw = 1 - sw;
  const srcR = packed & 0xff;
  const srcG = (packed >> 8) & 0xff;
  const srcB = (packed >> 16) & 0xff;

  if (radius === 1) {
    for (let y = yMin; y <= yMax; y++) {
      const dy = y - cy;
      const xMin = Math.max(0, Math.ceil(cx - 1));
      const xMax = Math.min(width - 1, Math.floor(cx + 1));
      for (let x = xMin; x <= xMax; x++) {
        const dx = x - cx;
        if (dx * dx + dy * dy > 1) continue;
        const idx = y * dbWidth + x;
        if (depthTest && depth16 > dbData[idx]) continue;
        if (depthWrite) dbData[idx] = depth16;
        const dstPx = fbU32[idx];
        fbU32[idx] =
          0xff000000 |
          (((srcB * sw + ((dstPx >> 16) & 0xff) * dw + 0.5) | 0) << 16) |
          (((srcG * sw + ((dstPx >> 8) & 0xff) * dw + 0.5) | 0) << 8) |
          ((srcR * sw + (dstPx & 0xff) * dw + 0.5) | 0);
      }
    }
    return;
  }

  const r2 = radius * radius;
  for (let y = yMin; y <= yMax; y++) {
    const dy = y - cy;
    const halfW = Math.sqrt(Math.max(0, r2 - dy * dy));
    const xMin = Math.max(0, Math.ceil(cx - halfW));
    const xMax = Math.min(width - 1, Math.floor(cx + halfW));
    let idx = y * dbWidth + xMin;
    for (let x = xMin; x <= xMax; x++, idx++) {
      if (depthTest && depth16 > dbData[idx]) continue;
      if (depthWrite) dbData[idx] = depth16;
      const dstPx = fbU32[idx];
      fbU32[idx] =
        0xff000000 |
        (((srcB * sw + ((dstPx >> 16) & 0xff) * dw + 0.5) | 0) << 16) |
        (((srcG * sw + ((dstPx >> 8) & 0xff) * dw + 0.5) | 0) << 8) |
        ((srcR * sw + (dstPx & 0xff) * dw + 0.5) | 0);
    }
  }
}

export function writePoint(
  state: PointRasterState,
  px: number,
  py: number,
  depth16: number,
  packed: number,
): void {
  const idx = py * state.dbWidth + px;
  if (state.depthTest && depth16 > state.dbData[idx]) return;
  if (state.depthWrite) state.dbData[idx] = depth16;
  if (!state.blend) {
    state.fbU32[idx] = packed;
    return;
  }
  const dstPx = state.fbU32[idx];
  const sw = state.srcWeight;
  const dw = 1 - sw;
  const r = packed & 0xff;
  const g = (packed >> 8) & 0xff;
  const b = (packed >> 16) & 0xff;
  state.fbU32[idx] =
    0xff000000 |
    (((b * sw + ((dstPx >> 16) & 0xff) * dw + 0.5) | 0) << 16) |
    (((g * sw + ((dstPx >> 8) & 0xff) * dw + 0.5) | 0) << 8) |
    ((r * sw + (dstPx & 0xff) * dw + 0.5) | 0);
}
