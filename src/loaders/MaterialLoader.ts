import { BasicMaterial } from "../materials/BasicMaterial.ts";
import { DashedLineMaterial } from "../materials/DashedLineMaterial.ts";
import { LambertMaterial } from "../materials/LambertMaterial.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import {
  Material,
  type MaterialJSON,
  type MaterialOptions,
} from "../materials/Material.ts";
import { PointsMaterial } from "../materials/PointsMaterial.ts";
import { ToonMaterial } from "../materials/ToonMaterial.ts";
import type { Texture } from "../textures/Texture.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";

type MaterialRecord = Record<string, unknown>;

function optionalFiniteNumber(
  json: MaterialRecord,
  key: string,
): number | undefined {
  const value = json[key];
  if (value === undefined) return;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`MaterialLoader: ${key} must be a finite number.`);
  }
  return value;
}

function optionalBoolean(
  json: MaterialRecord,
  key: string,
): boolean | undefined {
  const value = json[key];
  if (value === undefined) return;
  if (typeof value !== "boolean") {
    throw new TypeError(`MaterialLoader: ${key} must be a boolean.`);
  }
  return value;
}

function optionalString(json: MaterialRecord, key: string): string | undefined {
  const value = json[key];
  if (value === undefined) return;
  if (typeof value !== "string") {
    throw new TypeError(`MaterialLoader: ${key} must be a string.`);
  }
  return value;
}

function commonOptions(json: MaterialRecord): MaterialOptions {
  const name = optionalString(json, "name");
  const layer = optionalFiniteNumber(json, "layer");
  const opacity = optionalFiniteNumber(json, "opacity");
  const transparent = optionalBoolean(json, "transparent");
  const depthTest = optionalBoolean(json, "depthTest");
  const depthWrite = optionalBoolean(json, "depthWrite");
  const shading = optionalFiniteNumber(json, "shading");
  const side = optionalFiniteNumber(json, "side");
  const visible = optionalBoolean(json, "visible");
  const wireframe = optionalBoolean(json, "wireframe");
  const vertexColors = optionalBoolean(json, "vertexColors");
  return {
    ...(name === undefined ? {} : { name }),
    ...(layer === undefined ? {} : { layer }),
    ...(opacity === undefined ? {} : { opacity }),
    ...(transparent === undefined ? {} : { transparent }),
    ...(depthTest === undefined ? {} : { depthTest }),
    ...(depthWrite === undefined ? {} : { depthWrite }),
    ...(shading === undefined ? {} : { shading }),
    ...(side === undefined ? {} : { side }),
    ...(visible === undefined ? {} : { visible }),
    ...(wireframe === undefined ? {} : { wireframe }),
    ...(vertexColors === undefined ? {} : { vertexColors }),
  };
}

/** Loads canonical EASEL material records into concrete material instances. */
export class MaterialLoader extends Loader {
  #textures: ReadonlyMap<string, Texture> = new Map();

  /** Texture references available while parsing material maps. */
  get textures(): ReadonlyMap<string, Texture> {
    return this.#textures;
  }

  /** Installs texture references used to resolve material map identifiers. */
  set textures(value: ReadonlyMap<string, Texture>) {
    this.#textures = value;
  }

  /** Loads a material from a JSON resource. */
  override load(
    url: string,
    onLoad?: ((material: Material) => void) | undefined,
    onProgress?: ((event: ProgressEvent) => void) | undefined,
    onError?: ((err: unknown) => void) | undefined,
  ): void {
    const fileLoader = new FileLoader(this.manager);
    fileLoader.cache = this.cache;
    fileLoader.path = this.path;
    fileLoader.responseType = "json";
    fileLoader.requestHeader = this.requestHeader;

    fileLoader.load(
      url,
      (json) => {
        onLoad?.(this.parse(json as MaterialRecord));
      },
      onProgress,
      onError,
    );
  }

  /** Parses a canonical material record into its concrete material class. */
  override parse(json: MaterialJSON | MaterialRecord): Material {
    const record = json as MaterialRecord;
    const type = optionalString(record, "type") ?? "Material";
    const common = commonOptions(record);
    const color = optionalFiniteNumber(record, "color");
    const map = this.#texture(record, "map");

    switch (type) {
      case "Material":
        return new Material(common);
      case "BasicMaterial":
        return new BasicMaterial({
          ...common,
          ...(color === undefined ? {} : { color }),
          ...(map === undefined ? {} : { map }),
        });
      case "LambertMaterial":
        return new LambertMaterial({
          ...common,
          ...(color === undefined ? {} : { color }),
          ...(map === undefined ? {} : { map }),
        });
      case "ToonMaterial": {
        const gradientMap = this.#texture(record, "gradientMap");
        return new ToonMaterial({
          ...common,
          ...(color === undefined ? {} : { color }),
          ...(map === undefined ? {} : { map }),
          ...(gradientMap === undefined ? {} : { gradientMap }),
        });
      }
      case "LineMaterial": {
        const linewidth = optionalFiniteNumber(record, "linewidth");
        return new LineMaterial({
          ...common,
          ...(color === undefined ? {} : { color }),
          ...(linewidth === undefined ? {} : { linewidth }),
        });
      }
      case "DashedLineMaterial": {
        const linewidth = optionalFiniteNumber(record, "linewidth");
        const dashSize = optionalFiniteNumber(record, "dashSize");
        const gapSize = optionalFiniteNumber(record, "gapSize");
        return new DashedLineMaterial({
          ...common,
          ...(color === undefined ? {} : { color }),
          ...(linewidth === undefined ? {} : { linewidth }),
          ...(dashSize === undefined ? {} : { dashSize }),
          ...(gapSize === undefined ? {} : { gapSize }),
        });
      }
      case "PointsMaterial": {
        const size = optionalFiniteNumber(record, "size");
        return new PointsMaterial({
          ...common,
          ...(color === undefined ? {} : { color }),
          ...(map === undefined ? {} : { map }),
          ...(size === undefined ? {} : { size }),
        });
      }
      default:
        console.warn(
          `MaterialLoader: unsupported type "${type}", creating Material`,
        );
        return new Material(common);
    }
  }

  #texture(json: MaterialRecord, key: string): Texture | undefined {
    const uuid = optionalString(json, key);
    if (uuid === undefined) return;
    const texture = this.#textures.get(uuid);
    if (texture === undefined) {
      throw new Error(`MaterialLoader: unknown ${key} texture "${uuid}".`);
    }
    return texture;
  }
}
