import { Wrapping } from "../../core/Constants.ts";
import type { DepthBuffer } from "../framebuffer/DepthBuffer.ts";
import type { TriangleBuffer } from "../TriangleBuffer.ts";
import { LineRasterizer } from "./LineRasterizer.ts";
import { ScanlineFill } from "./ScanlineFill.ts";
import { WireframeRasterizer } from "./WireframeRasterizer.ts";
import type {
  RasterDrawCall,
  RasterFramebuffer,
  RasterMaterial,
  RasterizerState,
  ScanlineCallback,
  TextureData,
} from "./_RasterizerTypes.ts";
import {
  fillFlat,
  fillGouraud,
  fillFlatTex,
  fillUnlitTex,
} from "./_ScanlineFillersBasic.ts";
import {
  fillGouraudTexCombinedTint,
  fillGouraudTexNoTint,
  fillGouraudTexUniformTint,
  fillGouraudTexVertexTint,
} from "./_ScanlineFillersGouraudTex.ts";
import { rasterizePoint, writePoint } from "./_RasterizerPoint.ts";

/** Scanline triangle rasterizer with texture sampling and shading. */
export class Rasterizer {
  #scanlineFill = new ScanlineFill();
  #wireframe = new WireframeRasterizer();
  #lineRasterizer = new LineRasterizer();

  #state: RasterizerState = {
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

  // Callback type enum: select per triangle, bind at the call site.
  // Storing .bind(this) as class fields changes V8's hidden class layout
  // and deoptimizes the entire class (-48% on all workloads, finding #7).

  #fillFlat(
    y: number,
    xStart: number,
    xEnd: number,
    u: number,
    v: number,
    duDx: number,
    dvDx: number,
  ): void {
    fillFlat(this.#state, y, xStart, xEnd, u, v, duDx, dvDx);
  }

  #fillGouraud(
    y: number,
    xStart: number,
    xEnd: number,
    u: number,
    v: number,
    duDx: number,
    dvDx: number,
  ): void {
    fillGouraud(this.#state, y, xStart, xEnd, u, v, duDx, dvDx);
  }

  #fillFlatTex(
    y: number,
    xStart: number,
    xEnd: number,
    u: number,
    v: number,
    duDx: number,
    dvDx: number,
  ): void {
    fillFlatTex(this.#state, y, xStart, xEnd, u, v, duDx, dvDx);
  }

  #fillGouraudTexUniformTint(
    y: number,
    xStart: number,
    xEnd: number,
    u: number,
    v: number,
    duDx: number,
    dvDx: number,
  ): void {
    fillGouraudTexUniformTint(this.#state, y, xStart, xEnd, u, v, duDx, dvDx);
  }

  #fillGouraudTexCombinedTint(
    y: number,
    xStart: number,
    xEnd: number,
    u: number,
    v: number,
    duDx: number,
    dvDx: number,
  ): void {
    fillGouraudTexCombinedTint(this.#state, y, xStart, xEnd, u, v, duDx, dvDx);
  }

  #fillGouraudTexVertexTint(
    y: number,
    xStart: number,
    xEnd: number,
    u: number,
    v: number,
    duDx: number,
    dvDx: number,
  ): void {
    fillGouraudTexVertexTint(this.#state, y, xStart, xEnd, u, v, duDx, dvDx);
  }

  #fillGouraudTexNoTint(
    y: number,
    xStart: number,
    xEnd: number,
    u: number,
    v: number,
    duDx: number,
    dvDx: number,
  ): void {
    fillGouraudTexNoTint(this.#state, y, xStart, xEnd, u, v, duDx, dvDx);
  }

  #fillUnlitTex(
    y: number,
    xStart: number,
    xEnd: number,
    u: number,
    v: number,
    duDx: number,
    dvDx: number,
  ): void {
    fillUnlitTex(this.#state, y, xStart, xEnd, u, v, duDx, dvDx);
  }

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
    this.#state.hasFog = !!fogColor;
    if (fogColor) {
      this.#state.fogR = Math.round(fogColor.r * 255);
      this.#state.fogG = Math.round(fogColor.g * 255);
      this.#state.fogB = Math.round(fogColor.b * 255);
    }
    const { width, height } = framebuffer;
    const { wireframe, points, size: pointRadius = 2 } = drawCall.material;

    const matColor = drawCall.material.color;
    const baseR = matColor
      ? Math.round(matColor.r * (drawCall.instanceColorR ?? 1) * 255)
      : 255;
    const baseG = matColor
      ? Math.round(matColor.g * (drawCall.instanceColorG ?? 1) * 255)
      : 255;
    const baseB = matColor
      ? Math.round(matColor.b * (drawCall.instanceColorB ?? 1) * 255)
      : 255;

    const texture = drawCall.material.map?.data ?? undefined;

    this.#state.baseR = baseR;
    this.#state.baseG = baseG;
    this.#state.baseB = baseB;
    this.#state.depthBuf = framebuffer.depthBuffer;
    this.#state.dbData = this.#state.depthBuf.data;
    this.#state.dbWidth = this.#state.depthBuf.width;
    this.#state.fbU32 = framebuffer.u32;

    if (texture) {
      this.#state.texData = texture.data;
      this.#state.texW = texture.width;
      this.#state.texH = texture.height;
    }

    this.#state.opacity = (drawCall.material as RasterMaterial).opacity ?? 0;
    this.#state.blend =
      drawCall.material.transparent === true && this.#state.opacity > 0;
    this.#state.srcWeight = this.#state.blend
      ? (8 - this.#state.opacity) / 8
      : 1;
    this.#state.depthTest = drawCall.material.depthTest !== false;
    this.#state.depthWrite =
      this.#state.depthTest && drawCall.material.depthWrite !== false;

    this.#state.brightnessLevels = drawCall.material.map?.brightnessLevels;
    this.#state.wrapS = drawCall.material.map?.wrapS ?? Wrapping.ClampToEdge;
    this.#state.wrapT = drawCall.material.map?.wrapT ?? Wrapping.ClampToEdge;

    const shadedColorData = drawCall.shadedColorData;
    const shadedColorStride = drawCall.shadedColorStride ?? 0;
    this.#state.vertexColorData = drawCall.vertexColorData;
    this.#state.vertexColorItemSize = drawCall.vertexColorItemSize ?? 0;

    const tb = drawCall.triangles;
    if (!tb) return;
    const sortOrder = tb.sortOrder;
    const useSortOrder = tb.sortOrderActive && sortOrder.length === tb.length;
    for (let i = 0; i < tb.length; i++) {
      const physIdx = useSortOrder ? sortOrder[i] : i;
      this.#rasterizeTriangleFromBuffer(
        tb,
        physIdx,
        shadedColorData,
        shadedColorStride,
        i,
        baseR,
        baseG,
        baseB,
        texture,
        wireframe,
        points,
        pointRadius,
        width,
        height,
      );
    }
  }

  #rasterizeTriangleFromBuffer(
    tb: TriangleBuffer,
    physIdx: number,
    shadedColorData: Float32Array | undefined,
    shadedColorStride: number,
    iterIdx: number,
    baseR: number,
    baseG: number,
    baseB: number,
    texture: TextureData | undefined,
    wireframe: boolean | undefined,
    points: boolean | undefined,
    pointRadius: number,
    width: number,
    height: number,
  ): void {
    const v = physIdx * 3;
    const x1 = tb.screenX[v];
    const y1 = tb.screenY[v];
    const x2 = tb.screenX[v + 1];
    const y2 = tb.screenY[v + 1];
    const x3 = tb.screenX[v + 2];
    const y3 = tb.screenY[v + 2];

    const isFlat = shadedColorStride === 3;
    const isGouraud = shadedColorStride === 9;
    const base = iterIdx * shadedColorStride;

    let hasVertexColor = false;
    let mixedVertexColor = false;
    let c0r = 1;
    let c0g = 1;
    let c0b = 1;
    let c1r = 1;
    let c1g = 1;
    let c1b = 1;
    let c2r = 1;
    let c2g = 1;
    let c2b = 1;
    const vertexColors = this.#state.vertexColorData;
    if (vertexColors && this.#state.vertexColorItemSize === 3) {
      const vi0 = tb.vertexIndex[v];
      const vi1 = tb.vertexIndex[v + 1];
      const vi2 = tb.vertexIndex[v + 2];
      const c0 = vi0 * 3;
      const c1 = vi1 * 3;
      const c2 = vi2 * 3;
      if (
        c0 >= 0 &&
        c1 >= 0 &&
        c2 >= 0 &&
        c0 + 2 < vertexColors.length &&
        c1 + 2 < vertexColors.length &&
        c2 + 2 < vertexColors.length
      ) {
        c0r =
          vertexColors[c0] < 0
            ? 0
            : vertexColors[c0] > 1
              ? 1
              : vertexColors[c0];
        c0g =
          vertexColors[c0 + 1] < 0
            ? 0
            : vertexColors[c0 + 1] > 1
              ? 1
              : vertexColors[c0 + 1];
        c0b =
          vertexColors[c0 + 2] < 0
            ? 0
            : vertexColors[c0 + 2] > 1
              ? 1
              : vertexColors[c0 + 2];
        c1r =
          vertexColors[c1] < 0
            ? 0
            : vertexColors[c1] > 1
              ? 1
              : vertexColors[c1];
        c1g =
          vertexColors[c1 + 1] < 0
            ? 0
            : vertexColors[c1 + 1] > 1
              ? 1
              : vertexColors[c1 + 1];
        c1b =
          vertexColors[c1 + 2] < 0
            ? 0
            : vertexColors[c1 + 2] > 1
              ? 1
              : vertexColors[c1 + 2];
        c2r =
          vertexColors[c2] < 0
            ? 0
            : vertexColors[c2] > 1
              ? 1
              : vertexColors[c2];
        c2g =
          vertexColors[c2 + 1] < 0
            ? 0
            : vertexColors[c2 + 1] > 1
              ? 1
              : vertexColors[c2 + 1];
        c2b =
          vertexColors[c2 + 2] < 0
            ? 0
            : vertexColors[c2 + 2] > 1
              ? 1
              : vertexColors[c2 + 2];
        hasVertexColor = true;
        mixedVertexColor =
          c0r !== c1r ||
          c0g !== c1g ||
          c0b !== c1b ||
          c0r !== c2r ||
          c0g !== c2g ||
          c0b !== c2b;
      }
    }

    this.#state.vertexTintData = undefined;
    this.#state.hasTextureColorTint = false;
    this.#state.hasCombinedTextureTint = false;
    this.#state.textureColorR = 1;
    this.#state.textureColorG = 1;
    this.#state.textureColorB = 1;
    this.#state.textureMaterialR = baseR / 255;
    this.#state.textureMaterialG = baseG / 255;
    this.#state.textureMaterialB = baseB / 255;
    let effectiveBaseR = baseR;
    let effectiveBaseG = baseG;
    let effectiveBaseB = baseB;
    if (hasVertexColor && !mixedVertexColor) {
      effectiveBaseR = Math.round(baseR * c0r);
      effectiveBaseG = Math.round(baseG * c0g);
      effectiveBaseB = Math.round(baseB * c0b);
      if (texture) {
        this.#state.hasTextureColorTint = true;
        this.#state.textureColorR = effectiveBaseR / 255;
        this.#state.textureColorG = effectiveBaseG / 255;
        this.#state.textureColorB = effectiveBaseB / 255;
      }
    }

    let flatR = effectiveBaseR;
    let flatG = effectiveBaseG;
    let flatB = effectiveBaseB;
    if (hasVertexColor && mixedVertexColor) {
      flatR = Math.round((baseR * (c0r + c1r + c2r)) / 3);
      flatG = Math.round((baseG * (c0g + c1g + c2g)) / 3);
      flatB = Math.round((baseB * (c0b + c1b + c2b)) / 3);
    }
    if (isFlat && shadedColorData) {
      flatR = Math.round(effectiveBaseR * shadedColorData[base]);
      flatG = Math.round(effectiveBaseG * shadedColorData[base + 1]);
      flatB = Math.round(effectiveBaseB * shadedColorData[base + 2]);
    }

    this.#state.ndcZ0 = tb.ndcZ[v];
    this.#state.ndcZ1 = tb.ndcZ[v + 1];
    this.#state.ndcZ2 = tb.ndcZ[v + 2];

    if (this.#state.hasFog) {
      this.#state.fogF0 = tb.fogFactor[v];
      this.#state.fogF1 = tb.fogFactor[v + 1];
      this.#state.fogF2 = tb.fogFactor[v + 2];
    }
    this.#state.baseR = effectiveBaseR;
    this.#state.baseG = effectiveBaseG;
    this.#state.baseB = effectiveBaseB;
    this.#state.flatR = flatR;
    this.#state.flatG = flatG;
    this.#state.flatB = flatB;

    if (isGouraud && shadedColorData) {
      this.#state.gouraudData = shadedColorData;
      this.#state.gouraudBase = base;
    }

    if (hasVertexColor && mixedVertexColor) {
      const scratch = this.#state.vertexColorScratch;
      if (
        texture &&
        (isFlat || isGouraud) &&
        this.#state.brightnessLevels !== undefined
      ) {
        const tint = this.#state.vertexTintScratch;
        tint[0] = c0r;
        tint[1] = c0g;
        tint[2] = c0b;
        tint[3] = c1r;
        tint[4] = c1g;
        tint[5] = c1b;
        tint[6] = c2r;
        tint[7] = c2g;
        tint[8] = c2b;
        this.#state.vertexTintData = tint;
        if (!(isGouraud && shadedColorData)) {
          const lightR = isFlat && shadedColorData ? shadedColorData[base] : 1;
          const lightG =
            isFlat && shadedColorData ? shadedColorData[base + 1] : 1;
          const lightB =
            isFlat && shadedColorData ? shadedColorData[base + 2] : 1;
          for (let k = 0; k < 3; k++) {
            scratch[k * 3] = lightR;
            scratch[k * 3 + 1] = lightG;
            scratch[k * 3 + 2] = lightB;
          }
          this.#state.gouraudData = scratch;
          this.#state.gouraudBase = 0;
        }
      } else {
        if (texture) this.#state.hasCombinedTextureTint = true;
        for (let k = 0; k < 3; k++) {
          const lightBase = k * 3;
          const lightR =
            isGouraud && shadedColorData
              ? shadedColorData[base + lightBase]
              : isFlat && shadedColorData
                ? shadedColorData[base]
                : 1;
          const lightG =
            isGouraud && shadedColorData
              ? shadedColorData[base + lightBase + 1]
              : isFlat && shadedColorData
                ? shadedColorData[base + 1]
                : 1;
          const lightB =
            isGouraud && shadedColorData
              ? shadedColorData[base + lightBase + 2]
              : isFlat && shadedColorData
                ? shadedColorData[base + 2]
                : 1;
          const colorR = k === 0 ? c0r : k === 1 ? c1r : c2r;
          const colorG = k === 0 ? c0g : k === 1 ? c1g : c2g;
          const colorB = k === 0 ? c0b : k === 1 ? c1b : c2b;
          scratch[lightBase] = lightR * colorR;
          scratch[lightBase + 1] = lightG * colorG;
          scratch[lightBase + 2] = lightB * colorB;
        }
        this.#state.gouraudData = scratch;
        this.#state.gouraudBase = 0;
      }
    }

    if (texture) {
      this.#state.uv0u = tb.uvU[v];
      this.#state.uv0v = tb.uvV[v];
      this.#state.uv1u = tb.uvU[v + 1];
      this.#state.uv1v = tb.uvV[v + 1];
      this.#state.uv2u = tb.uvU[v + 2];
      this.#state.uv2v = tb.uvV[v + 2];
    }

    // FlatTex optimization: select brightness level once per triangle
    if (isFlat && texture && !mixedVertexColor) {
      if (this.#state.hasTextureColorTint && shadedColorData) {
        this.#state.flatTextureLightR =
          shadedColorData[base] < 0
            ? 0
            : shadedColorData[base] > 1
              ? 1
              : shadedColorData[base];
        this.#state.flatTextureLightG =
          shadedColorData[base + 1] < 0
            ? 0
            : shadedColorData[base + 1] > 1
              ? 1
              : shadedColorData[base + 1];
        this.#state.flatTextureLightB =
          shadedColorData[base + 2] < 0
            ? 0
            : shadedColorData[base + 2] > 1
              ? 1
              : shadedColorData[base + 2];
      } else {
        this.#state.flatTextureLightR = 1;
        this.#state.flatTextureLightG = 1;
        this.#state.flatTextureLightB = 1;
      }
      const litFactor = this.#state.hasTextureColorTint
        ? shadedColorData
          ? (shadedColorData[base] +
              shadedColorData[base + 1] +
              shadedColorData[base + 2]) *
            0.3333333333333333
          : 1
        : (flatR + flatG + flatB) * 0.00130718954248366;
      this.#state.flatLitFactor = litFactor;
      const blLevels = this.#state.brightnessLevels;
      if (blLevels) {
        const level = (litFactor * blLevels.length + 0.5) | 0;
        const li =
          level < 0
            ? 0
            : level >= blLevels.length
              ? blLevels.length - 1
              : level;
        this.#state.selectedBrightTex = blLevels[li];
      } else {
        this.#state.selectedBrightTex = undefined;
      }
    } else {
      this.#state.selectedBrightTex = undefined;
    }

    if (wireframe) {
      const packed = 0xff000000 | (flatB << 16) | (flatG << 8) | flatR;
      const depth16 =
        (((this.#state.ndcZ0 + this.#state.ndcZ1 + this.#state.ndcZ2) / 3 + 1) *
          32767.5 +
          0.5) |
        0;
      this.#wireframe.rasterize(
        x1,
        y1,
        x2,
        y2,
        x3,
        y3,
        (px, py) => {
          this.#writePoint(px, py, depth16, packed);
        },
        width,
        height,
      );
    } else if (points) {
      const packed = 0xff000000 | (flatB << 16) | (flatG << 8) | flatR;
      const z1 = ((this.#state.ndcZ0 + 1) * 32767.5 + 0.5) | 0;
      const z2 = ((this.#state.ndcZ1 + 1) * 32767.5 + 0.5) | 0;
      const z3 = ((this.#state.ndcZ2 + 1) * 32767.5 + 0.5) | 0;
      this.#rasterizePoint(x1, y1, pointRadius, width, height, z1, packed);
      this.#rasterizePoint(x2, y2, pointRadius, width, height, z2, packed);
      this.#rasterizePoint(x3, y3, pointRadius, width, height, z3, packed);
    } else {
      const cb = this.#selectCallback(
        isGouraud || mixedVertexColor,
        isFlat && !mixedVertexColor,
        !!texture,
      );
      this.#scanlineFill.fill(x1, y1, x2, y2, x3, y3, width, height, cb);
    }
  }

  #rasterizePoint(
    cx: number,
    cy: number,
    radius: number,
    width: number,
    height: number,
    depth16: number,
    packed: number,
  ): void {
    rasterizePoint(this.#state, cx, cy, radius, width, height, depth16, packed);
  }

  #writePoint(px: number, py: number, depth16: number, packed: number): void {
    writePoint(this.#state, px, py, depth16, packed);
  }

  /** Selects the scanline callback for the current triangle's shading mode. */
  #selectCallback(
    isGouraud: boolean,
    isFlat: boolean,
    hasTexture: boolean,
  ): ScanlineCallback {
    if (hasTexture) {
      if (isGouraud) {
        if (this.#state.hasTextureColorTint)
          return this.#fillGouraudTexUniformTint.bind(this);
        if (this.#state.hasCombinedTextureTint)
          return this.#fillGouraudTexCombinedTint.bind(this);
        if (this.#state.vertexTintData !== undefined)
          return this.#fillGouraudTexVertexTint.bind(this);
        return this.#fillGouraudTexNoTint.bind(this);
      }
      if (isFlat) return this.#fillFlatTex.bind(this);
      return this.#fillUnlitTex.bind(this);
    }
    if (isGouraud) return this.#fillGouraud.bind(this);
    return this.#fillFlat.bind(this);
  }
}
