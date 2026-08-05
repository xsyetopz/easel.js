import { afterEach, describe, expect, it } from "bun:test";
import { FileLoader as THREEFileLoader } from "three";
import { FileLoader } from "@/loaders/FileLoader.js";
import { Loader } from "@/loaders/Loader.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("FileLoader", () => {
  it("Extending", () => {
    expect(new FileLoader()).toBeInstanceOf(Loader);
  });

  it("Instancing", () => {
    expect(new FileLoader()).toBeTruthy();
  });

  it("defaults match THREE.js", () => {
    const EASEL = new FileLoader();
    const THREE = new THREEFileLoader();
    expect(EASEL.mimeType).toBe(THREE.mimeType);
    expect(EASEL.responseType).toBe(THREE.responseType);
  });

  it("abort cancels the active Fetch signal like THREE.js", () => {
    let signal: AbortSignal | undefined;
    globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return new Promise<Response>(() => {
        // Deliberately pending until abort updates the captured signal.
      });
    }) as typeof fetch;

    const loader = new FileLoader();
    loader.load("asset.bin");
    expect(signal?.aborted).toBe(false);
    expect(loader.abort()).toBe(loader);
    expect(signal?.aborted).toBe(true);
  });
});
