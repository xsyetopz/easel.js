import { Loader } from "./Loader.ts";
import type { LoadingManager } from "./LoadingManager.ts";
import { DefaultLoadingManager } from "./LoadingManager.ts";

/** Loads an image as an HTMLImageElement. */
export class ImageLoader extends Loader {
	constructor(manager: LoadingManager | undefined = undefined) {
		super(manager);
	}

	override load(
		url: string,
		onLoad?: ((image: HTMLImageElement) => void) | undefined,
		_onProgress?: ((event: ProgressEvent) => void) | undefined,
		onError?: ((err: Event | string) => void) | undefined,
	): void {
		const manager = this.manager ?? DefaultLoadingManager;
		const fullUrl = this.path + url;

		manager.itemStart(fullUrl);

		const image = new Image();
		if (this.crossOrigin) {
			image.crossOrigin = this.crossOrigin;
		}

		image.onload = () => {
			onLoad?.(image);
			manager.itemEnd(fullUrl);
		};

		image.onerror = (err) => {
			onError?.(err);
			manager.itemError(fullUrl);
		};

		image.src = fullUrl;
	}
}
