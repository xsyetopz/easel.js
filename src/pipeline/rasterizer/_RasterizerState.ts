import { Wrapping } from "../../core/Constants.ts";
import { encodeSrgbByte } from "../color/SrgbEncode.ts";
import { isLitMaterialType } from "../shading/LightBaker.ts";
import type {
  RasterDrawCall,
  RasterFramebuffer,
  RasterizerState,
  TextureData,
} from "./_RasterizerTypes.ts";

/** Base color and texture data prepared for a rasterizer draw call. */
export interface RasterizerStateSetup {
  /** Effective red material channel, including instance tint. */
  baseR: number;
  /** Effective green material channel, including instance tint. */
  baseG: number;
  /** Effective blue material channel, including instance tint. */
  baseB: number;
  /** Texture selected by the draw call, when one is available. */
  texture: TextureData | undefined;
}

function configureFog(
  state: RasterizerState,
  fogColor: { r: number; g: number; b: number } | undefined,
): void {
  state.hasFog = Boolean(fogColor);
  if (!fogColor) return;
  // three.js blends fog after the sRGB output encode, with the fog color
  // converted to the output color space.
  state.fogR = encodeSrgbByte(fogColor.r);
  state.fogG = encodeSrgbByte(fogColor.g);
  state.fogB = encodeSrgbByte(fogColor.b);
}

function configureFramebuffer(
  state: RasterizerState,
  framebuffer: RasterFramebuffer,
  texture: TextureData | undefined,
): void {
  state.depthBuf = framebuffer.depthBuffer;
  state.dbData = state.depthBuf.data;
  state.dbWidth = state.depthBuf.width;
  state.fbU32 = framebuffer.u32;
  if (!texture) return;
  state.texData = texture.data;
  state.texW = texture.width;
  state.texH = texture.height;
}

function configureMaterial(
  state: RasterizerState,
  drawCall: RasterDrawCall,
): void {
  state.opacity = drawCall.material.opacity ?? 0;
  state.blend = drawCall.material.transparent === true && state.opacity > 0;
  state.srcWeight = state.blend ? (8 - state.opacity) / 8 : 1;
  state.depthTest = drawCall.material.depthTest !== false;
  state.depthWrite = state.depthTest && drawCall.material.depthWrite !== false;
  state.brightnessLevels = drawCall.material.map?.brightnessLevels;
  state.wrapS = drawCall.material.map?.wrapS ?? Wrapping.ClampToEdge;
  state.wrapT = drawCall.material.map?.wrapT ?? Wrapping.ClampToEdge;
  state.vertexColorData = drawCall.vertexColorData;
  state.vertexColorItemSize = drawCall.vertexColorItemSize ?? 0;
}

/** Loads framebuffer, fog, material, and texture inputs into rasterizer state. */
export function configureRasterizerState(
  state: RasterizerState,
  drawCall: RasterDrawCall,
  framebuffer: RasterFramebuffer,
  fogColor: { r: number; g: number; b: number } | undefined,
): RasterizerStateSetup {
  configureFog(state, fogColor);
  let baseR = 255;
  let baseG = 255;
  let baseB = 255;
  if ((drawCall.shadedColorStride ?? 0) > 0) {
    // Baked lighting already carries the material and instance color.
  } else if (isLitMaterialType(drawCall.material.type)) {
    // A lit material that no light or emissive color reaches renders black.
    baseR = 0;
    baseG = 0;
    baseB = 0;
  } else {
    const matColor = drawCall.material.color;
    if (matColor) {
      baseR = encodeSrgbByte(matColor.r * (drawCall.instanceColorR ?? 1));
      baseG = encodeSrgbByte(matColor.g * (drawCall.instanceColorG ?? 1));
      baseB = encodeSrgbByte(matColor.b * (drawCall.instanceColorB ?? 1));
    }
  }
  const texture = drawCall.material.map?.data ?? undefined;
  state.baseR = baseR;
  state.baseG = baseG;
  state.baseB = baseB;
  configureFramebuffer(state, framebuffer, texture);
  configureMaterial(state, drawCall);
  return { baseR, baseG, baseB, texture };
}
