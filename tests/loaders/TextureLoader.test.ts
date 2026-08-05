import { describe, expect, it } from "bun:test";
import { TextureLoader as THREETextureLoader } from "three";
import { Loader } from "@/loaders/Loader.js";
import { TextureLoader } from "@/loaders/TextureLoader.js";

describe("TextureLoader", () => {
  it("Extending", () => {
    expect(new TextureLoader()).toBeInstanceOf(Loader);
  });

  it("Instancing", () => {
    expect(new TextureLoader()).toBeTruthy();
    expect(new THREETextureLoader()).toBeTruthy();
  });
});
