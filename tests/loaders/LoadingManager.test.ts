import { describe, expect, it } from "bun:test";
import {
  Loader as THREELoader,
  LoadingManager as THREELoadingManager,
} from "three";
import { Loader } from "@/loaders/Loader.js";
import { LoadingManager } from "@/loaders/LoadingManager.js";

describe("LoadingManager", () => {
  it("Instancing", () => {
    expect(new LoadingManager()).toBeTruthy();
  });

  it("handler registration matches THREE.js", () => {
    const EASEL = new LoadingManager();
    const THREE = new THREELoadingManager();
    const EASELLoader = new Loader();
    const THREELoaderInstance = new THREELoader();
    const regex = /\.jpg$/iu;
    const globalRegex = /\.jpg$/giu;

    EASEL.registerHandler(regex, EASELLoader);
    THREE.addHandler(regex, THREELoaderInstance);
    for (const file of ["foo.jpg", "foo.jpg.png", "foo.jpeg"]) {
      expect(EASEL.handlerFor(file) === EASELLoader).toBe(
        THREE.getHandler(file) === THREELoaderInstance,
      );
    }

    expect(EASEL.unregisterHandler(regex)).toBe(true);
    THREE.removeHandler(regex);
    EASEL.registerHandler(globalRegex, EASELLoader);
    THREE.addHandler(globalRegex, THREELoaderInstance);
    for (let iteration = 0; iteration < 2; iteration++) {
      expect(EASEL.handlerFor("foo.jpg") === EASELLoader).toBe(
        THREE.getHandler("foo.jpg") === THREELoaderInstance,
      );
    }
  });

  it("abort controller allocation and reset match THREE.js", () => {
    const EASEL = new LoadingManager();
    const THREE = new THREELoadingManager();
    const EASELFirst = EASEL.abortController;
    const THREEFirst = THREE.abortController;

    expect(EASEL.abortController).toBe(EASELFirst);
    expect(THREE.abortController).toBe(THREEFirst);
    EASEL.abort();
    THREE.abort();
    expect(EASELFirst.signal.aborted).toBe(THREEFirst.signal.aborted);

    const EASELSecond = EASEL.abortController;
    const THREESecond = THREE.abortController;
    expect(EASELSecond).not.toBe(EASELFirst);
    expect(THREESecond).not.toBe(THREEFirst);
    expect(EASELSecond.signal.aborted).toBe(THREESecond.signal.aborted);
  });
});
