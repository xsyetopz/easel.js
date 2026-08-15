import { textureCoordinateToTexel } from "../texture/TextureWrapping.ts";
import { BAYER4, type RasterizerState } from "./_RasterizerTypes.ts";

type ScanlineArgs = [
  y: number,
  xStart: number,
  xEnd: number,
  u: number,
  v: number,
  duDx: number,
  dvDx: number,
];

interface Scanline {
  y: number;
  xStart: number;
  xEnd: number;
  u: number;
  v: number;
  duDx: number;
  dvDx: number;
}

interface DepthInterpolation {
  index: number;
  ndcZ: number;
  dNdcZ: number;
  depth16F: number;
  dDepth16: number;
}

interface TextureInterpolation {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  u: number;
  v: number;
  du: number;
  dv: number;
  wrapS: RasterizerState["wrapS"];
  wrapT: RasterizerState["wrapT"];
}

interface GouraudInterpolation {
  r: number;
  g: number;
  b: number;
  dr: number;
  dg: number;
  db: number;
}

interface FogInterpolation {
  factor: number;
  delta: number;
}

interface Fragment {
  r: number;
  g: number;
  b: number;
  dither: number;
  fogFactor: number | undefined;
}

function createScanline(args: ScanlineArgs): Scanline {
  const [y, xStart, xEnd, u, v, duDx, dvDx] = args;
  return { y, xStart, xEnd, u, v, duDx, dvDx };
}

function createDepth(
  state: RasterizerState,
  line: Scanline,
): DepthInterpolation {
  const w = 1 - line.u - line.v;
  const dNdcZ =
    line.duDx * (state.ndcZ0 - state.ndcZ2) +
    line.dvDx * (state.ndcZ1 - state.ndcZ2);
  const ndcZ = line.u * state.ndcZ0 + line.v * state.ndcZ1 + w * state.ndcZ2;
  return {
    index: line.y * state.dbWidth + line.xStart,
    ndcZ,
    dNdcZ,
    depth16F: (ndcZ + 1) * 32767.5 + 0.5,
    dDepth16: dNdcZ * 32767.5,
  };
}

function createTexture(
  state: RasterizerState,
  line: Scanline,
): TextureInterpolation {
  const w = 1 - line.u - line.v;
  const data = state.texData as Uint8ClampedArray;
  return {
    data,
    width: state.texW,
    height: state.texH,
    u: line.u * state.uv0u + line.v * state.uv1u + w * state.uv2u,
    v: line.u * state.uv0v + line.v * state.uv1v + w * state.uv2v,
    du:
      line.duDx * (state.uv0u - state.uv2u) +
      line.dvDx * (state.uv1u - state.uv2u),
    dv:
      line.duDx * (state.uv0v - state.uv2v) +
      line.dvDx * (state.uv1v - state.uv2v),
    wrapS: state.wrapS,
    wrapT: state.wrapT,
  };
}

function createGouraud(
  state: RasterizerState,
  line: Scanline,
): GouraudInterpolation {
  const data = state.gouraudData as Float32Array;
  const base = state.gouraudBase;
  const w = 1 - line.u - line.v;
  return {
    r: line.u * data[base] + line.v * data[base + 3] + w * data[base + 6],
    g: line.u * data[base + 1] + line.v * data[base + 4] + w * data[base + 7],
    b: line.u * data[base + 2] + line.v * data[base + 5] + w * data[base + 8],
    dr:
      line.duDx * (data[base] - data[base + 6]) +
      line.dvDx * (data[base + 3] - data[base + 6]),
    dg:
      line.duDx * (data[base + 1] - data[base + 7]) +
      line.dvDx * (data[base + 4] - data[base + 7]),
    db:
      line.duDx * (data[base + 2] - data[base + 8]) +
      line.dvDx * (data[base + 5] - data[base + 8]),
  };
}

function createFog(
  state: RasterizerState,
  line: Scanline,
): FogInterpolation | undefined {
  if (!state.hasFog) return undefined;
  const w = 1 - line.u - line.v;
  return {
    factor: line.u * state.fogF0 + line.v * state.fogF1 + w * state.fogF2,
    delta:
      line.duDx * (state.fogF0 - state.fogF2) +
      line.dvDx * (state.fogF1 - state.fogF2),
  };
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(value, 1));
}

function passesDepth(
  state: RasterizerState,
  index: number,
  depth16: number,
): boolean {
  return !state.depthTest || depth16 <= state.dbData[index];
}

function writeDepth(
  state: RasterizerState,
  index: number,
  depth16: number,
): void {
  if (state.depthWrite) state.dbData[index] = depth16;
}

function getTexelIndex(
  texture: TextureInterpolation,
  u: number,
  v: number,
): number {
  const tx = textureCoordinateToTexel(u, texture.width, texture.wrapS);
  const ty = textureCoordinateToTexel(v, texture.height, texture.wrapT);
  return (ty * texture.width + tx) << 2;
}

function setFlatColor(state: RasterizerState, fragment: Fragment): void {
  fragment.r = state.flatR;
  fragment.g = state.flatG;
  fragment.b = state.flatB;
}

function setGouraudColor(
  state: RasterizerState,
  lighting: GouraudInterpolation,
  fragment: Fragment,
): void {
  const d = fragment.dither;
  fragment.r = (state.baseR * clampUnit(lighting.r) + d) | 0;
  fragment.g = (state.baseG * clampUnit(lighting.g) + d) | 0;
  fragment.b = (state.baseB * clampUnit(lighting.b) + d) | 0;
}

function setFlatTextureColor(
  state: RasterizerState,
  texture: TextureInterpolation,
  texelIndex: number,
  fragment: Fragment,
): void {
  const d = fragment.dither;
  const brightTex = state.selectedBrightTex;
  if (state.hasTextureColorTint) {
    let sampleR: number;
    let sampleG: number;
    let sampleB: number;
    if (brightTex === undefined) {
      sampleR = texture.data[texelIndex] * state.flatTextureLightR;
      sampleG = texture.data[texelIndex + 1] * state.flatTextureLightG;
      sampleB = texture.data[texelIndex + 2] * state.flatTextureLightB;
    } else {
      sampleR = brightTex[texelIndex];
      sampleG = brightTex[texelIndex + 1];
      sampleB = brightTex[texelIndex + 2];
    }
    fragment.r = (sampleR * state.textureColorR + d) | 0;
    fragment.g = (sampleG * state.textureColorG + d) | 0;
    fragment.b = (sampleB * state.textureColorB + d) | 0;
    return;
  }
  if (brightTex !== undefined) {
    fragment.r = brightTex[texelIndex];
    fragment.g = brightTex[texelIndex + 1];
    fragment.b = brightTex[texelIndex + 2];
    return;
  }
  fragment.r = (texture.data[texelIndex] * state.flatLitFactor + d) | 0;
  fragment.g = (texture.data[texelIndex + 1] * state.flatLitFactor + d) | 0;
  fragment.b = (texture.data[texelIndex + 2] * state.flatLitFactor + d) | 0;
}

function setUnlitTextureColor(
  state: RasterizerState,
  texture: TextureInterpolation,
  texelIndex: number,
  fragment: Fragment,
): void {
  const d = fragment.dither;
  const scale = 0.00392156862745098;
  fragment.r = (texture.data[texelIndex] * state.baseR * scale + d) | 0;
  fragment.g = (texture.data[texelIndex + 1] * state.baseG * scale + d) | 0;
  fragment.b = (texture.data[texelIndex + 2] * state.baseB * scale + d) | 0;
}

function writeFragment(
  state: RasterizerState,
  index: number,
  fragment: Fragment,
): void {
  let { r, g, b } = fragment;
  const fogFactor = fragment.fogFactor;
  if (fogFactor !== undefined) {
    const d = fragment.dither;
    const f = clampUnit(fogFactor);
    r = (r + (state.fogR - r) * f + d) | 0;
    g = (g + (state.fogG - g) * f + d) | 0;
    b = (b + (state.fogB - b) * f + d) | 0;
  }
  if (state.blend) {
    const dstPx = state.fbU32[index];
    const sw = state.srcWeight;
    const dw = 1 - sw;
    state.fbU32[index] =
      0xff000000 |
      (((b * sw + ((dstPx >> 16) & 0xff) * dw + 0.5) | 0) << 16) |
      (((g * sw + ((dstPx >> 8) & 0xff) * dw + 0.5) | 0) << 8) |
      ((r * sw + (dstPx & 0xff) * dw + 0.5) | 0);
    return;
  }
  state.fbU32[index] = 0xff000000 | (b << 16) | (g << 8) | r;
}

function advanceFog(fog: FogInterpolation | undefined): void {
  if (fog !== undefined) fog.factor += fog.delta;
}

/** Rasterizes a flat-shaded scanline. */
export function fillFlat(state: RasterizerState, ...args: ScanlineArgs): void {
  const line = createScanline(args);
  const depth = createDepth(state, line);
  const fog = createFog(state, line);
  const fragment: Fragment = {
    r: 0,
    g: 0,
    b: 0,
    dither: 0,
    fogFactor: undefined,
  };
  for (
    let x = line.xStart;
    x <= line.xEnd;
    x++, depth.index++, depth.ndcZ += depth.dNdcZ
  ) {
    depth.depth16F += depth.dDepth16;
    const depth16 = depth.depth16F | 0;
    if (!passesDepth(state, depth.index, depth16)) continue;
    writeDepth(state, depth.index, depth16);
    fragment.dither = BAYER4[((line.y & 3) << 2) | (x & 3)];
    setFlatColor(state, fragment);
    fragment.fogFactor = fog?.factor;
    writeFragment(state, depth.index, fragment);
    advanceFog(fog);
  }
}

/** Rasterizes a Gouraud-shaded scanline. */
export function fillGouraud(
  state: RasterizerState,
  ...args: ScanlineArgs
): void {
  const line = createScanline(args);
  const depth = createDepth(state, line);
  const lighting = createGouraud(state, line);
  const fog = createFog(state, line);
  const fragment: Fragment = {
    r: 0,
    g: 0,
    b: 0,
    dither: 0,
    fogFactor: undefined,
  };
  for (
    let x = line.xStart;
    x <= line.xEnd;
    x++,
      depth.index++,
      depth.ndcZ += depth.dNdcZ,
      lighting.r += lighting.dr,
      lighting.g += lighting.dg,
      lighting.b += lighting.db
  ) {
    depth.depth16F += depth.dDepth16;
    const depth16 = depth.depth16F | 0;
    if (!passesDepth(state, depth.index, depth16)) continue;
    writeDepth(state, depth.index, depth16);
    fragment.dither = BAYER4[((line.y & 3) << 2) | (x & 3)];
    setGouraudColor(state, lighting, fragment);
    fragment.fogFactor = fog?.factor;
    writeFragment(state, depth.index, fragment);
    advanceFog(fog);
  }
}

/** Rasterizes a flat-shaded textured scanline. */
export function fillFlatTex(
  state: RasterizerState,
  ...args: ScanlineArgs
): void {
  const line = createScanline(args);
  const depth = createDepth(state, line);
  const texture = createTexture(state, line);
  const fog = createFog(state, line);
  const fragment: Fragment = {
    r: 0,
    g: 0,
    b: 0,
    dither: 0,
    fogFactor: undefined,
  };
  for (
    let x = line.xStart;
    x <= line.xEnd;
    x++,
      depth.index++,
      depth.ndcZ += depth.dNdcZ,
      texture.u += texture.du,
      texture.v += texture.dv
  ) {
    depth.depth16F += depth.dDepth16;
    const depth16 = depth.depth16F | 0;
    if (!passesDepth(state, depth.index, depth16)) continue;
    const texelIndex = getTexelIndex(texture, texture.u, texture.v);
    if (texture.data[texelIndex + 3] === 0) continue;
    writeDepth(state, depth.index, depth16);
    fragment.dither = BAYER4[((line.y & 3) << 2) | (x & 3)];
    setFlatTextureColor(state, texture, texelIndex, fragment);
    fragment.fogFactor = fog?.factor;
    writeFragment(state, depth.index, fragment);
    advanceFog(fog);
  }
}

/** Rasterizes an unlit textured scanline. */
export function fillUnlitTex(
  state: RasterizerState,
  ...args: ScanlineArgs
): void {
  const line = createScanline(args);
  const depth = createDepth(state, line);
  const texture = createTexture(state, line);
  const fog = createFog(state, line);
  const fragment: Fragment = {
    r: 0,
    g: 0,
    b: 0,
    dither: 0,
    fogFactor: undefined,
  };
  for (
    let x = line.xStart;
    x <= line.xEnd;
    x++,
      depth.index++,
      depth.ndcZ += depth.dNdcZ,
      texture.u += texture.du,
      texture.v += texture.dv
  ) {
    depth.depth16F += depth.dDepth16;
    const depth16 = depth.depth16F | 0;
    if (!passesDepth(state, depth.index, depth16)) continue;
    const texelIndex = getTexelIndex(texture, texture.u, texture.v);
    if (texture.data[texelIndex + 3] === 0) continue;
    writeDepth(state, depth.index, depth16);
    fragment.dither = BAYER4[((line.y & 3) << 2) | (x & 3)];
    setUnlitTextureColor(state, texture, texelIndex, fragment);
    fragment.fogFactor = fog?.factor;
    writeFragment(state, depth.index, fragment);
    advanceFog(fog);
  }
}
