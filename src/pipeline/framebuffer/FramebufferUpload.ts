import type { Framebuffer } from "./Framebuffer.ts";

/** Copies the framebuffer contents to a canvas ImageData. */
export class FramebufferUpload {
  /** Copies the CPU framebuffer into the target Canvas2D ImageData. */
  upload(framebuffer: Framebuffer, context: CanvasRenderingContext2D): void {
    context.putImageData(framebuffer.imageData as ImageData, 0, 0);
  }
}
