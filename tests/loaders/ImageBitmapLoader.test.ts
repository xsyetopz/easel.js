import { afterEach, describe, expect, it } from "bun:test";
import { ImageBitmapLoader as THREEImageBitmapLoader } from "three";
import { ImageBitmapLoader } from "@/loaders/ImageBitmapLoader.js";
import { Loader } from "@/loaders/Loader.js";
import { LoadingManager } from "@/loaders/LoadingManager.js";

const originalFetch: typeof fetch = globalThis.fetch;
const originalCreateImageBitmap: typeof createImageBitmap =
  globalThis.createImageBitmap;

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.createImageBitmap = originalCreateImageBitmap;
});

describe("ImageBitmapLoader official surface", () => {
  it("Extending", () => {
    expect(new ImageBitmapLoader()).toBeInstanceOf(Loader);
  });

  it("Instancing", () => {
    expect(new ImageBitmapLoader()).toBeTruthy();
    expect(new THREEImageBitmapLoader()).toBeTruthy();
  });

  it("options", () => {
    const EASEL = new ImageBitmapLoader();
    const THREE = new THREEImageBitmapLoader();
    expect(EASEL.options.premultiplyAlpha).toBe(THREE.options.premultiplyAlpha);
    expect(EASEL.options.colorSpaceConversion).toBe("none");
  });

  it("isImageBitmapLoader", () => {
    expect(new ImageBitmapLoader().isImageBitmapLoader).toBe(true);
    expect(new THREEImageBitmapLoader().isImageBitmapLoader).toBe(true);
  });
});

describe("ImageBitmapLoader lifecycle", () => {
  it("copies and normalizes assigned options once", () => {
    const source: ImageBitmapOptions = { imageOrientation: "flipY" };
    const loader = new ImageBitmapLoader();
    loader.options = source;
    source.imageOrientation = "none";

    expect(loader.options).toEqual({
      colorSpaceConversion: "none",
      imageOrientation: "flipY",
    });
    expect(Object.isFrozen(loader.options)).toBe(true);
  });

  it("finishes the manager lifecycle after a fetch error", async () => {
    globalThis.fetch = ((_input: RequestInfo | URL, _init?: RequestInit) =>
      Promise.reject(new Error("network error"))) as typeof fetch;
    let errors = 0;
    let completed = 0;
    const manager = new LoadingManager(
      () => completed++,
      undefined,
      () => errors++,
    );
    const loader = new ImageBitmapLoader(manager);

    await new Promise<void>((resolve) => {
      loader.load("missing.png", undefined, undefined, () => resolve());
    });
    await Promise.resolve();

    expect(errors).toBe(1);
    expect(completed).toBe(1);
    expect(manager.isLoading).toBe(false);
  });

  it("abort cancels the active Fetch signal", () => {
    let signal: AbortSignal | undefined;
    globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return new Promise<Response>(() => {
        // The signal is inspected directly; the request stays pending.
      });
    }) as typeof fetch;
    const loader = new ImageBitmapLoader();

    loader.load("pending.png");
    expect(signal?.aborted).toBe(false);
    expect(loader.abort()).toBe(loader);
    expect(signal?.aborted).toBe(true);
  });
});
