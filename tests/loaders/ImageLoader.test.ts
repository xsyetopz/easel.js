import { afterEach, describe, expect, it } from "bun:test";
import { ImageLoader as THREEImageLoader } from "three";
import { ImageLoader } from "@/loaders/ImageLoader.js";
import { Loader } from "@/loaders/Loader.js";
import { LoadingManager } from "@/loaders/LoadingManager.js";

const originalImage: typeof Image = globalThis.Image;

class TestImage {
  static latest: TestImage | undefined;
  onload: ((event: Event) => unknown) | null = null;
  onerror: ((event: Event | string) => unknown) | null = null;
  crossOrigin = "";
  #src = "";

  constructor() {
    TestImage.latest = this;
  }

  get src(): string {
    return this.#src;
  }

  set src(value: string) {
    this.#src = value;
  }
}

afterEach(() => {
  globalThis.Image = originalImage;
  TestImage.latest = undefined;
});

describe("ImageLoader", () => {
  it("Extending", () => {
    expect(new ImageLoader()).toBeInstanceOf(Loader);
  });

  it("Instancing", () => {
    expect(new ImageLoader()).toBeTruthy();
    expect(new THREEImageLoader()).toBeTruthy();
  });

  it("finishes the manager lifecycle after an image error", () => {
    globalThis.Image = TestImage as unknown as typeof Image;
    let errors = 0;
    let completed = 0;
    const manager = new LoadingManager(
      () => completed++,
      undefined,
      () => errors++,
    );
    const loader = new ImageLoader(manager);
    loader.path = "/assets/";
    manager.urlModifier = (url: string): string => `https://example.test${url}`;

    loader.load("missing.png");
    TestImage.latest?.onerror?.(new Event("error"));

    expect(TestImage.latest?.src).toBe(
      "https://example.test/assets/missing.png",
    );
    expect(errors).toBe(1);
    expect(completed).toBe(1);
    expect(manager.isLoading).toBe(false);
  });

  it("abort cancels active element work without polling", () => {
    globalThis.Image = TestImage as unknown as typeof Image;
    let errorName: string | undefined;
    const manager = new LoadingManager();
    const loader = new ImageLoader(manager);

    loader.load("pending.png", undefined, undefined, (error) => {
      errorName = error instanceof DOMException ? error.name : undefined;
    });

    expect(loader.abort()).toBe(loader);
    expect(errorName).toBe("AbortError");
    expect(TestImage.latest?.src).toBe("");
    expect(manager.isLoading).toBe(false);
  });
});
