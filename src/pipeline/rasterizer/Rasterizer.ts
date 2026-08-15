import { Wrapping } from "../../core/Constants.ts";
import type { DepthBuffer } from "../framebuffer/DepthBuffer.ts";
import type { TriangleBuffer } from "../TriangleBuffer.ts";
import { configureRasterizerState } from "./_RasterizerState.ts";
import { rasterizeTriangle } from "./_RasterizerTriangle.ts";
import type {
  RasterDrawCall,
  RasterFramebuffer,
  RasterizerState,
  TextureData,
} from "./_RasterizerTypes.ts";
import { LineRasterizer } from "./LineRasterizer.ts";
import { ScanlineFill } from "./ScanlineFill.ts";
import { WireframeRasterizer } from "./WireframeRasterizer.ts";

/** Scanline triangle rasterizer with texture sampling and shading. */
export class Rasterizer {
  readonly #scanlineFill = new ScanlineFill();
  readonly #wireframe = new WireframeRasterizer();
  readonly #lineRasterizer = new LineRasterizer();

  readonly #state: RasterizerState = {
    depthBuf: undefined as unknown as DepthBuffer,
    dbData: undefined as unknown as Uint16Array,
    dbWidth: 0,
    ndcZ0: 0,
    ndcZ1: 0,
    ndcZ2: 0,
    flatR: 0,
    flatG: 0,
    flatB: 0,
    gouraudData: undefined,
    gouraudBase: 0,
    vertexColorData: undefined,
    vertexColorItemSize: 0,
    vertexTintData: undefined,
    vertexColorScratch: new Float32Array(9),
    vertexTintScratch: new Float32Array(9),
    hasTextureColorTint: false,
    hasCombinedTextureTint: false,
    textureColorR: 1,
    textureColorG: 1,
    textureColorB: 1,
    textureMaterialR: 1,
    textureMaterialG: 1,
    textureMaterialB: 1,
    baseR: 255,
    baseG: 255,
    baseB: 255,
    texData: undefined,
    texW: 0,
    texH: 0,
    uv0u: 0,
    uv0v: 0,
    uv1u: 0,
    uv1v: 0,
    uv2u: 0,
    uv2v: 0,
    fbU32: undefined as unknown as Uint32Array,
    hasFog: false,
    fogR: 0,
    fogG: 0,
    fogB: 0,
    fogF0: 0,
    fogF1: 0,
    fogF2: 0,
    brightnessLevels: undefined,
    selectedBrightTex: undefined,
    flatLitFactor: 1,
    flatTextureLightR: 1,
    flatTextureLightG: 1,
    flatTextureLightB: 1,
    wrapS: Wrapping.ClampToEdge,
    wrapT: Wrapping.ClampToEdge,
    opacity: 0,
    srcWeight: 1,
    blend: false,
    depthTest: true,
    depthWrite: true,
  };

  /** Rasterizes a draw call to the framebuffer by dispatching to the appropriate sub-rasterizer. */
  rasterize(
    drawCall: RasterDrawCall,
    framebuffer: RasterFramebuffer,
    _colorTable: unknown,
    fogColor?: { r: number; g: number; b: number },
  ): void {
    if (drawCall.primitive === "lines") {
      if (!drawCall.lines) return;
      this.#lineRasterizer.rasterize(
        drawCall.lines,
        drawCall.material,
        framebuffer,
        fogColor,
        drawCall.vertexColorData,
        drawCall.vertexColorItemSize,
      );
      return;
    }
    const { width, height } = framebuffer;
    const { wireframe, points, size: pointRadius = 2 } = drawCall.material;
    const { baseR, baseG, baseB, texture } = configureRasterizerState(
      this.#state,
      drawCall,
      framebuffer,
      fogColor,
    );
    const tb = drawCall.triangles;
    if (!tb) return;
    this.#rasterizeTriangles({
      tb,
      shadedColorData: drawCall.shadedColorData,
      shadedColorStride: drawCall.shadedColorStride ?? 0,
      baseR,
      baseG,
      baseB,
      texture,
      wireframe,
      points,
      pointRadius,
      width,
      height,
    });
  }

  #rasterizeTriangles(options: {
    tb: TriangleBuffer;
    shadedColorData: Float32Array | undefined;
    shadedColorStride: number;
    baseR: number;
    baseG: number;
    baseB: number;
    texture: TextureData | undefined;
    wireframe: boolean | undefined;
    points: boolean | undefined;
    pointRadius: number;
    width: number;
    height: number;
  }): void {
    const { tb, ...triangleOptions } = options;
    const sortOrder = tb.sortOrder;
    const sortOrderActive = (
      tb as TriangleBuffer & { sortOrderActive: boolean }
    ).sortOrderActive;
    const useSortOrder = sortOrderActive && sortOrder.length === tb.length;
    for (let i = 0; i < tb.length; i++) {
      const physIdx = useSortOrder ? sortOrder[i] : i;
      rasterizeTriangle({
        state: this.#state,
        scanlineFill: this.#scanlineFill,
        wireframeRasterizer: this.#wireframe,
        tb,
        physIdx,
        iterIdx: i,
        ...triangleOptions,
      });
    }
  }
}
