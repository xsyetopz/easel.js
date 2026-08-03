import type { Framebuffer } from "./Framebuffer.ts";

/** Copies the framebuffer contents to a canvas ImageData. */
export class FramebufferUpload {
  upload(framebuffer: Framebuffer, context: CanvasRenderingContext2D): void {
    context.putImageData(framebuffer.imageData as ImageData, 0, 0);
  }
}
