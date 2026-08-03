import { Texture } from "../textures/Texture.ts";
import { ImageBitmapLoader } from "./ImageBitmapLoader.ts";
import { Loader } from "./Loader.ts";
import type { LoadingManager } from "./LoadingManager.ts";

/**
 * Loads an image URL and wraps it in a Texture.
 *
 * Uses fetch + createImageBitmap internally, which avoids canvas taint
 * issues that occur with HTMLImageElement + crossOrigin on 2D canvas
 * renderers that call getImageData().
 */
export class TextureLoader extends Loader {
  constructor(manager: LoadingManager | undefined = void 0) {
    super(manager);
  }

  override load(
    url: string,
    onLoad?: ((texture: Texture) => void) | undefined,
    onProgress?: ((event: ProgressEvent) => void) | undefined,
    onError?: ((err: unknown) => void) | undefined,
  ): void {
    const loader = new ImageBitmapLoader(this.manager);
    loader.setPath(this.path);
    loader.setRequestHeader(this.requestHeader);

    loader.load(
      url,
      (bitmap) => {
        const texture = new Texture(bitmap);
        texture.needsUpdate = true;
        onLoad?.(texture);
      },
      onProgress,
      onError,
    );
  }
}
