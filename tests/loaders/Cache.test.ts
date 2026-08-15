import { afterEach, describe, expect, it } from "bun:test";
import { Cache } from "@/loaders/Cache.js";
import { FileLoader } from "@/loaders/FileLoader.js";
import { GeometryLoader } from "@/loaders/GeometryLoader.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("Cache", () => {
  it("uses canonical Map operations without global enablement", () => {
    const cache = new Cache<string, number>();
    expect(cache.set("answer", 42)).toBe(cache);
    expect(cache.get("answer")).toBe(42);
    expect(cache.delete("answer")).toBe(true);
    expect(cache.has("answer")).toBe(false);
  });

  it("is used only after explicit assignment to a loader", async () => {
    let fetches = 0;
    globalThis.fetch = (() => {
      fetches++;
      return Promise.resolve(new Response(`response-${fetches}`));
    }) as unknown as typeof fetch;

    const uncached = new FileLoader();
    expect(await uncached.loadAsync("asset.txt")).toBe("response-1");
    expect(await uncached.loadAsync("asset.txt")).toBe("response-2");

    const cached = new FileLoader();
    cached.cache = new Cache();
    expect(await cached.loadAsync("asset.txt")).toBe("response-3");
    expect(await cached.loadAsync("asset.txt")).toBe("response-3");
    expect(fetches).toBe(3);
  });

  it("keeps cache hits asynchronous", async () => {
    globalThis.fetch = (() =>
      Promise.resolve(new Response("cached"))) as unknown as typeof fetch;
    const loader = new FileLoader();
    loader.cache = new Cache();
    await loader.loadAsync("asset.txt");

    let synchronous = true;
    let callbackWasSynchronous = false;
    const completed = new Promise<void>((resolve, reject) => {
      loader.load(
        "asset.txt",
        () => {
          callbackWasSynchronous = synchronous;
          resolve();
        },
        undefined,
        reject,
      );
      synchronous = false;
    });
    await completed;
    expect(callbackWasSynchronous).toBe(false);
  });

  it("separates entries by response type and normalized request headers", () => {
    const loader = new FileLoader();
    const textKey = loader.cacheKey("asset");
    loader.responseType = "json";
    const jsonKey = loader.cacheKey("asset");
    loader.requestHeader = { Z: "last", A: "first" };
    const headerKey = loader.cacheKey("asset");

    expect(textKey).not.toBe(jsonKey);
    expect(jsonKey).not.toBe(headerKey);
    expect(headerKey).toContain('[["A","first"],["Z","last"]]');
  });

  it("propagates an explicit cache through delegated file loaders", async () => {
    let fetches = 0;
    globalThis.fetch = (() => {
      fetches++;
      return Promise.resolve(
        Response.json({
          attributes: {
            position: { array: [0, 0, 0], itemSize: 3 },
          },
        }),
      );
    }) as unknown as typeof fetch;

    const loader = new GeometryLoader();
    loader.cache = new Cache();
    const first = await loader.loadAsync("geometry.json");
    const second = await loader.loadAsync("geometry.json");

    expect(first).not.toBe(second);
    expect(fetches).toBe(1);
  });
});
