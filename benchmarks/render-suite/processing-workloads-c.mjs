import { performance } from "node:perf_hooks";
import {
  createAnimationJson,
  createGeometryJson,
  createObjectJson,
  installBenchmarkOffscreenCanvas,
} from "./benchmark-helpers.mjs";

function createLoaderState(EASEL) {
  class RawTextureLoader extends EASEL.DataTextureLoader {
    parse(rawBuffer) {
      const bytes = new Uint8Array(rawBuffer);
      const width = 64;
      const height = 64;
      const data = new Uint8ClampedArray(width * height * 4);
      for (let i = 0; i < data.length; i++)
        data[i] = bytes[i & (bytes.length - 1)];
      return { data, width, height };
    }
  }
  const geometryLoader = new EASEL.GeometryLoader();
  const materialLoader = new EASEL.MaterialLoader();
  const objectLoader = new EASEL.ObjectLoader();
  const animationLoader = new EASEL.AnimationLoader();
  const textureLoader = new RawTextureLoader();
  const geometryJson = createGeometryJson(512);
  const objectJson = createObjectJson(4, 4);
  const animationJson = createAnimationJson(32, 24);
  const buffer = new Uint8Array(4096);
  for (let i = 0; i < buffer.length; i++) buffer[i] = (i * 37) & 255;
  return {
    geometryLoader,
    materialLoader,
    objectLoader,
    animationLoader,
    textureLoader,
    geometryJson,
    objectJson,
    animationJson,
    buffer,
  };
}

function runLoaderState(state, EASEL, frame) {
  const {
    geometryLoader,
    materialLoader,
    objectLoader,
    animationLoader,
    textureLoader,
    geometryJson,
    objectJson,
    animationJson,
    buffer,
  } = state;
  const geometry = geometryLoader.parse(geometryJson);
  const material = materialLoader.parse({
    type: (frame & 1) === 0 ? "BasicMaterial" : "LambertMaterial",
    color: 0xabcdef,
    opacity: frame & 7,
    transparent: (frame & 1) === 1,
  });
  const object = objectLoader.parse(objectJson);
  const clips = animationLoader.parse(animationJson);
  const parsed = textureLoader.parse(buffer.buffer);
  const texture = new EASEL.DataTexture(
    parsed.data,
    parsed.width,
    parsed.height,
  );
  return (
    (geometry.index?.length ?? 0) +
    Object.keys(material).length +
    object.children.length +
    clips.length +
    texture.width
  );
}

export function createLoaderSetupWorkload(EASEL) {
  return {
    name: "loader-parse-batch",
    description:
      "Geometry, material, object, animation, and raw data texture parse paths with deterministic in-memory inputs.",
    create() {
      const state = createLoaderState(EASEL);
      let sink = 0;
      return {
        metadata: {
          geometryVertices: 512,
          objectDepth: 4,
          objectWidth: 4,
          animationTracks: 32,
        },
        run(frame, timings) {
          const start = performance.now();
          sink += runLoaderState(state, EASEL, frame);
          timings.loaderSetupMs = performance.now() - start;
          timings.loaderSink = sink & 1;
        },
      };
    },
  };
}

export function createTexturePreprocessWorkload(EASEL) {
  return {
    name: "texture-preprocess-cache",
    description:
      "Texture source clamp/cache and brightness-level construction through deterministic OffscreenCanvas stub.",
    create() {
      installBenchmarkOffscreenCanvas();
      const image = { width: 256, height: 192, phase: 0 };
      let sink = 0;
      return {
        metadata: {
          sourceWidth: image.width,
          sourceHeight: image.height,
          maxTextureSize: 128,
        },
        run(frame, timings) {
          image.phase = frame;
          const start = performance.now();
          const texture = new EASEL.Texture(image);
          texture.needsUpdate = true;
          const levels = texture.brightnessLevels;
          timings.texturePreprocessMs = performance.now() - start;
          if (levels)
            sink += levels.at(-1)[(frame * 13) & (levels[0].length - 1)];
          timings.textureSink = sink & 1;
        },
      };
    },
  };
}
