import type { Camera } from "../cameras/Camera.ts";
import type { Scene } from "../core/Scene.ts";
import { Color } from "../math/Color.ts";
import { FogCuller } from "../pipeline/FogCuller.ts";
import { Framebuffer } from "../pipeline/framebuffer/Framebuffer.ts";
import { FramebufferClear } from "../pipeline/framebuffer/FramebufferClear.ts";
import { FramebufferUpload } from "../pipeline/framebuffer/FramebufferUpload.ts";
import { PainterSort } from "../pipeline/PainterSort.ts";
import { Rasterizer } from "../pipeline/rasterizer/Rasterizer.ts";
import { SceneTraversal } from "../pipeline/SceneTraversal.ts";
import { LightBaker } from "../pipeline/shading/LightBaker.ts";

/** Construction options for the CPU framebuffer and optional canvas target. */
export interface RendererOptions {
  /** Initial framebuffer width in CSS-independent pixels. */
  width?: number;
  /** Initial framebuffer height in CSS-independent pixels. */
  height?: number;
  /** Canvas receiving the final ImageData upload. */
  canvas?: HTMLCanvasElement;
  /** Whether painter sorting is enabled before CPU rasterization. */
  sortObjects?: boolean;
}

interface TextureBackgroundLike {
  data?: { data: Uint8ClampedArray; width: number; height: number } | undefined;
  width: number;
  height: number;
}

/** Optional timing fields populated by Renderer.render when profiling is enabled. */
export interface RenderTimings {
  /** Time spent clearing color and depth buffers, in milliseconds. */
  clearMs?: number;
  /** Time spent traversing the scene graph, in milliseconds. */
  traversalMs?: number;
  /** Time spent culling draw calls against fog, in milliseconds. */
  fogCullMs?: number;
  /** Time spent sorting draw calls, in milliseconds. */
  sortMs?: number;
  /** Time spent baking lighting and rasterizing draw calls, in milliseconds. */
  shadeRasterMs?: number;
  /** Time spent uploading ImageData to Canvas2D, in milliseconds. */
  uploadMs?: number;
  /** Total render time across all measured stages, in milliseconds. */
  totalMs?: number;
  // Optional detailed traversal breakdown (enabled by setting timings.profileTraversal = true).
  /** Enables the detailed scene-traversal timing fields. */
  profileTraversal?: boolean;
  /** Time spent updating world matrices during traversal, in milliseconds. */
  travUpdateWorldMs?: number;
  /** Time spent walking scene nodes during traversal, in milliseconds. */
  travWalkMs?: number;
  /** Time spent projecting geometry during traversal, in milliseconds. */
  travProjectMs?: number;
  /** Time spent assembling draw calls during traversal, in milliseconds. */
  travAssembleMs?: number;
  /** Number of draw calls assembled during traversal. */
  travDrawCalls?: number;
}

/** Canvas2D software renderer orchestrating the full pipeline. */
export class Renderer {
  #width: number;
  #height: number;

  #canvas: HTMLCanvasElement | undefined;
  #context: CanvasRenderingContext2D | undefined;
  #framebuffer: Framebuffer;

  #traversal: SceneTraversal;
  #fogCuller: FogCuller;
  #painterSort: PainterSort;
  #lightBaker: LightBaker;
  #rasterizer: Rasterizer;

  /** Whether render() sorts draw calls before CPU rasterization. */
  sortObjects: boolean = true;

  #clearColor = { r: 0, g: 0, b: 0 };
  #clear: FramebufferClear;
  #upload: FramebufferUpload;

  /** Constructs a CPU framebuffer renderer with an optional Canvas2D target. */
  constructor(options: RendererOptions = {}) {
    const { width = 300, height = 150, canvas, sortObjects = true } = options;

    this.#width = width;
    this.#height = height;
    this.sortObjects = sortObjects;

    if (canvas) {
      this.#canvas = canvas;
    } else if (typeof document === "undefined") {
      this.#canvas = undefined;
    } else {
      this.#canvas = document.createElement("canvas");
    }

    if (this.#canvas) {
      this.#canvas.width = width;
      this.#canvas.height = height;
      this.#context = this.#canvas.getContext("2d") ?? undefined;
      if (this.#context) {
        this.#context.imageSmoothingEnabled = false;
      }
    }

    this.#framebuffer = new Framebuffer(width, height);

    this.#traversal = new SceneTraversal();
    this.#fogCuller = new FogCuller();
    this.#painterSort = new PainterSort();
    this.#lightBaker = new LightBaker();
    this.#rasterizer = new Rasterizer();
    this.#clear = new FramebufferClear();
    this.#upload = new FramebufferUpload();
  }

  /** Canvas element receiving framebuffer uploads, when available. */
  get domElement(): HTMLCanvasElement | undefined {
    return this.#canvas;
  }

  /** Framebuffer width in pixels. */
  get width(): number {
    return this.#width;
  }

  /** Framebuffer height in pixels. */
  get height(): number {
    return this.#height;
  }

  /** Explicitly rebuilds scene world matrices and the camera view matrix. */
  prepare(scene: Scene, camera: Camera, force: boolean = false): void {
    scene.updateMatrixWorld(true, true, force);
    camera.updateViewMatrix(true, false, force);
  }

  /** Renders a scene from a camera's perspective. */
  render(scene: Scene, camera: Camera, timings?: RenderTimings): void {
    if (timings) {
      const perf = globalThis.performance;
      const now =
        typeof perf?.now === "function" ? perf.now.bind(perf) : Date.now;
      const t0 = now();

      // 1. Clear framebuffer + depth buffer
      this.#clearSceneBackground(scene);
      const fog = scene.fog;

      const tClear = now();

      // 2. Scene traversal -> DrawList
      const drawList = this.#traversal.traverse(
        scene as never,
        camera as never,
        this.#width,
        this.#height,
        timings,
      );

      const tTrav = now();

      // 3. Fog culling
      if (scene.fog) {
        this.#fogCuller.cull(
          drawList,
          scene.fog as never,
          camera.position as never,
        );
      }

      const tFogCull = now();

      // 4. Painter's sort
      this.#painterSort.sort(drawList, camera.position, this.sortObjects);

      const tSort = now();

      // 5. Light baking + 6. Rasterize per draw call
      const lights = drawList.lights;
      const fb = this.#framebuffer;
      const fogColor = fog ? fog.color : undefined;
      for (const drawCall of drawList) {
        if (drawCall.primitive !== "lines") {
          this.#lightBaker.bake(drawCall as never, lights);
        }
        this.#rasterizer.rasterize(
          drawCall as never,
          fb as never,
          undefined,
          fogColor,
        );
      }

      const tShadeRaster = now();

      // 7. Upload to canvas
      if (this.#context) {
        this.#upload.upload(this.#framebuffer, this.#context);
      }

      const tUpload = now();

      timings.clearMs = tClear - t0;
      timings.traversalMs = tTrav - tClear;
      timings.fogCullMs = tFogCull - tTrav;
      timings.sortMs = tSort - tFogCull;
      timings.shadeRasterMs = tShadeRaster - tSort;
      timings.uploadMs = tUpload - tShadeRaster;
      timings.totalMs = tUpload - t0;
      return;
    }

    // 1. Clear framebuffer + depth buffer
    this.#clearSceneBackground(scene);
    const fog = scene.fog;

    // 2. Scene traversal -> DrawList
    const drawList = this.#traversal.traverse(
      scene as never,
      camera as never,
      this.#width,
      this.#height,
    );

    // 3. Fog culling
    if (scene.fog) {
      this.#fogCuller.cull(
        drawList,
        scene.fog as never,
        camera.position as never,
      );
    }

    // 4. Painter's sort
    this.#painterSort.sort(drawList, camera.position, this.sortObjects);

    // 5. Light baking + 6. Rasterize per draw call
    const lights = drawList.lights;
    const fb = this.#framebuffer;
    const fogColor = fog ? fog.color : undefined;
    for (const drawCall of drawList) {
      if (drawCall.primitive !== "lines") {
        this.#lightBaker.bake(drawCall as never, lights);
      }
      this.#rasterizer.rasterize(
        drawCall as never,
        fb as never,
        undefined,
        fogColor,
      );
    }

    // 7. Upload to canvas
    if (this.#context) {
      this.#upload.upload(this.#framebuffer, this.#context);
    }
  }

  #clearSceneBackground(scene: Scene): void {
    const fog = scene.fog;
    if (fog) {
      this.#clear.clear(
        this.#framebuffer,
        Math.round(fog.color.r * 255),
        Math.round(fog.color.g * 255),
        Math.round(fog.color.b * 255),
      );
      this.#framebuffer.depthBuffer.clear();
      return;
    }

    const background = scene.background;
    if (isTextureBackground(background)) {
      const data = background.data;
      if (data) {
        this.#clear.clearTexture(this.#framebuffer, data);
      } else {
        this.#clear.clear(
          this.#framebuffer,
          this.#clearColor.r,
          this.#clearColor.g,
          this.#clearColor.b,
        );
      }
      this.#framebuffer.depthBuffer.clear();
      return;
    }

    if (background === undefined) {
      this.#clear.clear(
        this.#framebuffer,
        this.#clearColor.r,
        this.#clearColor.g,
        this.#clearColor.b,
      );
      this.#framebuffer.depthBuffer.clear();
      return;
    }

    if (typeof background === "object" && background !== null) {
      this.#clear.clear(
        this.#framebuffer,
        Math.round(background.r * 255),
        Math.round(background.g * 255),
        Math.round(background.b * 255),
      );
    } else {
      this.#clear.clear(
        this.#framebuffer,
        (background >> 16) & 0xff,
        (background >> 8) & 0xff,
        background & 0xff,
      );
    }
    this.#framebuffer.depthBuffer.clear();
  }

  /** Updates the viewport dimensions and retained projection state. */
  setSize(width: number, height: number): void {
    this.#width = width;
    this.#height = height;
    this.#framebuffer.resize(width, height);
    if (this.#canvas) {
      this.#canvas.width = width;
      this.#canvas.height = height;
    }
  }

  /** Packed clear color used when the scene supplies no background or fog. */
  get clearColor(): number {
    return (
      (this.#clearColor.r << 16) |
      (this.#clearColor.g << 8) |
      this.#clearColor.b
    );
  }

  /** Sets the packed RGB clear color used when no scene background or fog overrides it. */
  set clearColor(value: Color | number) {
    if (value instanceof Color) {
      this.#clearColor.r = Math.round(value.r * 255);
      this.#clearColor.g = Math.round(value.g * 255);
      this.#clearColor.b = Math.round(value.b * 255);
      return;
    }
    if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffff) {
      throw new RangeError("Renderer.clearColor must be a 24-bit integer.");
    }
    this.#clearColor.r = (value >> 16) & 0xff;
    this.#clearColor.g = (value >> 8) & 0xff;
    this.#clearColor.b = value & 0xff;
  }

  /** Detaches the Canvas2D target and releases renderer-side references. */
  dispose(): void {
    if (this.#canvas && !this.#canvas.isConnected) {
      this.#canvas = undefined;
    }
    this.#context = undefined;
  }
}

function isTextureBackground(value: unknown): value is TextureBackgroundLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    "width" in value &&
    "height" in value
  );
}
