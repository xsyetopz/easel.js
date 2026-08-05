import { describe, expect, it } from "bun:test";
import { Loader as THREELoader } from "three";
import { Loader } from "@/loaders/Loader.js";
import { LoadingManager } from "@/loaders/LoadingManager.js";

describe("Loader", () => {
  it("Instancing", () => {
    expect(new Loader()).toBeTruthy();
  });

  it("manager", () => {
    expect(new Loader().manager).toBeInstanceOf(LoadingManager);
  });

  for (const property of [
    "crossOrigin",
    "withCredentials",
    "path",
    "resourcePath",
    "requestHeader",
  ] as const) {
    it(property, () => {
      const EASEL = new Loader();
      const THREE = new THREELoader();
      expect(EASEL[property]).toEqual(THREE[property]);
    });
  }
});
