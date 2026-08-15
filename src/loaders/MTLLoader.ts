import { BasicMaterial } from "../materials/BasicMaterial.ts";
import type { Material } from "../materials/Material.ts";
import { LambertMaterial } from "../materials/LambertMaterial.ts";
import { Color } from "../math/Color.ts";
import type { Texture } from "../textures/Texture.ts";
import { FileLoader } from "./FileLoader.ts";
import { extractUrlBase, resolveUrl } from "./LoaderUtils.ts";
import { Loader } from "./Loader.ts";
import type { LoadingManager } from "./LoadingManager.ts";

/** CPU material implementation selected for parsed MTL records. */
export type MTLMaterialType = "basic" | "lambert";

/** A deterministic reference to a texture named by a `map_Kd` record. */
export interface MTLTextureReference {
  /** Path exactly as written in the MTL record, excluding map options. */
  readonly path: string;
  /** Path resolved against the MTL resource base when one was supplied. */
  readonly url: string;
  /** Optional raw map options retained from the source record. */
  readonly raw: string;
  /** Three-component texture scale from the `-s` option. */
  readonly scale: readonly [number, number, number];
  /** Three-component texture offset from the `-o` option. */
  readonly offset: readonly [number, number, number];
  /** Optional clamp mode from the `-clamp` option. */
  readonly clamp: boolean | undefined;
  /** Optional bump multiplier from the `-bm` option. */
  readonly bumpMultiplier: number | undefined;
  /** Optional brightness base and gain from the `-mm` option. */
  readonly brightness: readonly [number, number] | undefined;
}

/** Parsed, source-grounded values for one named MTL material. */
export interface MTLMaterialDefinition {
  /** Name supplied by the `newmtl` record. */
  readonly name: string;
  /** Material instance used by the CPU OBJ integration. */
  readonly material: Material;
  /** Ambient RGB value from `Ka`, when valid. */
  readonly ambientColor: Color | undefined;
  /** Diffuse RGB value from `Kd`, when valid. */
  readonly diffuseColor: Color | undefined;
  /** Base color selected for the CPU material. */
  readonly baseColor: Color;
  /** Effective normalized opacity after applying `d` or `Tr`. */
  readonly opacity: number;
  /** Effective normalized transparency, equal to `1 - opacity`. */
  readonly transparency: number;
  /** Discrete EASEL opacity level in the inclusive range [0, 8]. */
  readonly opacityLevel: number;
  /** Raw dissolve value from `d`, when present. */
  readonly dissolve: number | undefined;
  /** Raw transparency value from `Tr`, when present. */
  readonly transparencyValue: number | undefined;
  /** Illumination model number from `illum`, when valid. */
  readonly illum: number | undefined;
  /** Diffuse texture metadata from `map_Kd`, when present. */
  readonly mapKd: MTLTextureReference | undefined;
  /** Other normalized MTL properties retained without inventing renderer state. */
  readonly properties: Readonly<Record<string, string | readonly number[]>>;
}

/** Source-shaped material record retained for THREE-style `materialsInfo`. */
export interface MTLMaterialInfo {
  /** Name supplied by the `newmtl` record. */
  readonly name: string;
  /** Ambient RGB source values from `Ka`. */
  readonly ka?: readonly [number, number, number];
  /** Diffuse RGB source values from `Kd`. */
  readonly kd?: readonly [number, number, number];
  /** Dissolve source value from `d`. */
  readonly d?: number;
  /** Transparency source value from `Tr`. */
  readonly tr?: number;
  /** Illumination model source value from `illum`. */
  readonly illum?: number;
  /** Raw diffuse map record, including any map options. */
  readonly map_kd?: string;
  /** Additional standard or vendor-specific MTL records. */
  readonly [key: string]: string | number | readonly number[] | undefined;
}

/** Options controlling MTL parsing and CPU material construction. */
export interface MTLMaterialOptions {
  /** CPU material class to instantiate; defaults to `lambert`. */
  readonly materialType?: MTLMaterialType;
  /** Divides MTL RGB channels by 255 for exporters using byte colors. */
  readonly normalizeRGB?: boolean;
  /** Ignores all-zero RGB records instead of replacing the current color. */
  readonly ignoreZeroRGBs?: boolean;
  /** Existing CPU textures keyed by source or resolved map paths. */
  readonly textures?:
    | ReadonlyMap<string, Texture>
    | Readonly<Record<string, Texture>>;
}

/** Alias for callers that name options after the loader rather than materials. */
export type MTLLoaderOptions = MTLMaterialOptions;

/** Typed material table returned by {@link MTLLoader.parse}. */
export interface MTLLoaderResult {
  /** CPU materials keyed by their `newmtl` names. */
  readonly materials: Readonly<Record<string, Material>>;
  /** Parsed metadata keyed by their `newmtl` names. */
  readonly definitions: Readonly<Record<string, MTLMaterialDefinition>>;
  /** Source-shaped alias matching THREE's `materialsInfo` terminology. */
  readonly materialsInfo: Readonly<Record<string, MTLMaterialInfo>>;
  /** Base path used when resolving `map_Kd` references. */
  readonly path: string;
  /** Non-fatal malformed or unsupported source-line diagnostics. */
  readonly warnings: readonly string[];
  /** Looks up a CPU material by `newmtl` name. */
  get(name: string): Material | undefined;
  /** Returns a CPU material by name or throws for an unknown declaration. */
  create(name: string): Material;
  /** Looks up parsed metadata by `newmtl` name. */
  getDefinition(name: string): MTLMaterialDefinition | undefined;
  /** Returns materials in deterministic source declaration order. */
  toArray(): Material[];
  /** Returns the source-order index for a material name. */
  getIndex(name: string): number | undefined;
  /** Eagerly validates that every definition has a CPU material. */
  preload(): this;
}

/** Concrete immutable wrapper around parsed MTL CPU materials and metadata. */
export class MTLMaterialTable implements MTLLoaderResult {
  /** CPU materials keyed by their `newmtl` names. */
  readonly materials: Readonly<Record<string, Material>>;
  /** Parsed metadata keyed by their `newmtl` names. */
  readonly definitions: Readonly<Record<string, MTLMaterialDefinition>>;
  /** Source-shaped alias matching THREE's `materialsInfo` terminology. */
  readonly materialsInfo: Readonly<Record<string, MTLMaterialInfo>>;
  /** Base path used when resolving `map_Kd` references. */
  readonly path: string;
  /** Non-fatal malformed or unsupported source-line diagnostics. */
  readonly warnings: readonly string[];

  /** Constructs a material table from parser-owned records. */
  constructor(
    materials: Readonly<Record<string, Material>>,
    definitions: Readonly<Record<string, MTLMaterialDefinition>>,
    path: string,
    warnings: readonly string[],
    materialsInfo: Readonly<Record<string, MTLMaterialInfo>> = {},
  ) {
    this.materials = Object.freeze({ ...materials });
    this.definitions = Object.freeze({ ...definitions });
    this.materialsInfo = Object.freeze({ ...materialsInfo });
    this.path = path;
    this.warnings = Object.freeze([...warnings]);
  }

  /** Looks up a CPU material by `newmtl` name. */
  get(name: string): Material | undefined {
    return this.materials[name];
  }

  /** Returns a CPU material by name or throws for an unknown declaration. */
  create(name: string): Material {
    const material = this.materials[name];
    if (material === undefined) {
      throw new Error(`MTLMaterialTable: unknown material "${name}".`);
    }
    return material;
  }

  /** Looks up parsed metadata by `newmtl` name. */
  getDefinition(name: string): MTLMaterialDefinition | undefined {
    return this.definitions[name];
  }

  /** Returns materials in deterministic source declaration order. */
  toArray(): Material[] {
    return Object.keys(this.materials)
      .map((name) => this.materials[name])
      .filter((material): material is Material => material !== undefined);
  }

  /** Returns the source-order index for a material name. */
  getIndex(name: string): number | undefined {
    const index = Object.keys(this.materials).indexOf(name);
    return index === -1 ? undefined : index;
  }

  /** Eagerly validates that every definition has a CPU material. */
  preload(): this {
    for (const name of Object.keys(this.definitions)) {
      if (this.materials[name] === undefined) {
        throw new Error(`MTLMaterialTable: missing material "${name}".`);
      }
    }
    return this;
  }
}

interface RawMaterial {
  name: string;
  ambientColor: Color | undefined;
  diffuseColor: Color | undefined;
  dissolve: number | undefined;
  transparencyValue: number | undefined;
  opacitySource: "d" | "tr" | undefined;
  illum: number | undefined;
  mapKd: MTLTextureReference | undefined;
  properties: Map<string, string | readonly number[]>;
}

interface MapReferenceParts {
  path: string;
  scale: readonly [number, number, number];
  offset: readonly [number, number, number];
  clamp: boolean | undefined;
  bumpMultiplier: number | undefined;
  brightness: readonly [number, number] | undefined;
}

const COLOR_COMPONENTS = 3;
const RE_WHITESPACE = /\s+/u;
const RE_NEWLINE = /\r?\n/u;
const RE_RECORD = /^(?<key>\S+)(?:\s+(?<rest>.*))?$/u;

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function parseFiniteNumber(value: string | undefined): number | undefined {
  if (value === undefined || value === "") return;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseColor(
  value: string,
  options: MTLMaterialOptions,
): Color | undefined {
  const parts = value.trim().split(RE_WHITESPACE);
  if (parts.length < COLOR_COMPONENTS) return;
  const channels = parts
    .slice(0, COLOR_COMPONENTS)
    .map((part) => parseFiniteNumber(part));
  if (channels.some((channel) => channel === undefined)) return;
  const normalized = channels as [number, number, number];
  if (options.normalizeRGB) {
    normalized[0] /= 255;
    normalized[1] /= 255;
    normalized[2] /= 255;
  }
  if (
    options.ignoreZeroRGBs &&
    normalized[0] === 0 &&
    normalized[1] === 0 &&
    normalized[2] === 0
  ) {
    return;
  }
  return new Color(
    clampUnit(normalized[0]),
    clampUnit(normalized[1]),
    clampUnit(normalized[2]),
  );
}

function parsePropertyValue(value: string): string | readonly number[] {
  const parts = value.trim().split(RE_WHITESPACE).filter(Boolean);
  const numbers = parts.map((part) => parseFiniteNumber(part));
  if (parts.length > 0 && numbers.every((number) => number !== undefined)) {
    return numbers as number[];
  }
  return value.trim();
}

function tokenizeMapValue(value: string): string[] {
  const tokens = value.match(/"[^"]*"|'[^']*'|\S+/gu) ?? [];
  return tokens.map((token) => {
    if (
      (token.startsWith('"') && token.endsWith('"')) ||
      (token.startsWith("'") && token.endsWith("'"))
    ) {
      return token.slice(1, -1);
    }
    return token;
  });
}

function parseMapReference(value: string): MapReferenceParts | undefined {
  const tokens = tokenizeMapValue(value.trim());
  if (tokens.length === 0) return;
  const path: string[] = [];
  let scale: [number, number, number] = [1, 1, 1];
  let offset: [number, number, number] = [0, 0, 0];
  let clamp: boolean | undefined;
  let bumpMultiplier: number | undefined;
  let brightness: [number, number] | undefined;

  const readVector = (
    start: number,
    fallback: [number, number, number],
  ): { values: [number, number, number]; next: number } | undefined => {
    const values = [...fallback] as [number, number, number];
    let next = start;
    for (let axis = 0; axis < 3 && next < tokens.length; axis++) {
      if (
        tokens[next]?.startsWith("-") &&
        parseFiniteNumber(tokens[next]) === undefined
      )
        break;
      const number = parseFiniteNumber(tokens[next]);
      if (number === undefined) break;
      values[axis] = number;
      next++;
    }
    if (next === start) return;
    if (next - start === 1) values[1] = values[0];
    return { values, next };
  };

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    switch (token?.toLowerCase()) {
      case "-s": {
        const result = readVector(index + 1, scale);
        if (result === undefined) {
          path.push(token);
          break;
        }
        scale = result.values;
        index = result.next - 1;
        break;
      }
      case "-o": {
        const result = readVector(index + 1, offset);
        if (result === undefined) {
          path.push(token);
          break;
        }
        offset = result.values;
        index = result.next - 1;
        break;
      }
      case "-clamp": {
        const clampValue = tokens[index + 1]?.toLowerCase();
        if (clampValue === "on" || clampValue === "off") {
          clamp = clampValue === "on";
          index++;
        } else {
          path.push(token);
        }
        break;
      }
      case "-bm": {
        const number = parseFiniteNumber(tokens[index + 1]);
        if (number === undefined) {
          path.push(token);
          break;
        }
        bumpMultiplier = number;
        index++;
        break;
      }
      case "-mm": {
        const base = parseFiniteNumber(tokens[index + 1]);
        const gain = parseFiniteNumber(tokens[index + 2]);
        if (base === undefined || gain === undefined) {
          path.push(token);
          break;
        }
        brightness = [base, gain];
        index += 2;
        break;
      }
      default:
        if (token !== undefined) path.push(token);
    }
  }

  const pathValue = path.join(" ").trim();
  if (pathValue === "") return;
  return {
    path: pathValue,
    scale,
    offset,
    clamp,
    bumpMultiplier,
    brightness,
  };
}

function resolveTexturePath(path: string, basePath: string): string {
  if (basePath === "") return path;
  try {
    return resolveUrl(path, basePath);
  } catch {
    return path;
  }
}

function colorToArray(
  color: Color | undefined,
): readonly [number, number, number] | undefined {
  return color === undefined ? undefined : [color.r, color.g, color.b];
}

function lookupTexture(
  reference: MTLTextureReference,
  textures: MTLMaterialOptions["textures"],
): Texture | undefined {
  if (textures === undefined) return;
  const candidates = [reference.path, reference.url];
  if ("get" in textures && typeof textures.get === "function") {
    const textureMap = textures as ReadonlyMap<string, Texture>;
    for (const candidate of candidates) {
      const texture = textureMap.get(candidate);
      if (texture !== undefined) return texture;
    }
    return;
  }
  const textureRecord = textures as Readonly<Record<string, Texture>>;
  for (const candidate of candidates) {
    const texture = textureRecord[candidate];
    if (texture !== undefined) return texture;
  }
  return textureRecord[candidates.at(-1) ?? ""];
}

function resolveOpacity(raw: RawMaterial): number {
  if (raw.opacitySource === "tr") {
    return 1 - clampUnit(raw.transparencyValue ?? 0);
  }
  if (raw.opacitySource === "d") {
    return clampUnit(raw.dissolve ?? 1);
  }
  return 1;
}

function createMaterial(
  raw: RawMaterial,
  options: MTLMaterialOptions,
  basePath: string,
): MTLMaterialDefinition {
  const baseColor =
    raw.diffuseColor?.clone() ??
    raw.ambientColor?.clone() ??
    new Color(0xffffff);
  const opacity = clampUnit(resolveOpacity(raw));
  const opacityLevel = Math.round((1 - opacity) * 8);
  const texture =
    raw.mapKd === undefined
      ? undefined
      : lookupTexture(raw.mapKd, options.textures);
  const materialOptions = {
    name: raw.name,
    color: baseColor,
    opacity: opacityLevel,
    transparent: opacityLevel > 0,
    ...(texture === undefined ? {} : { map: texture }),
  } as const;
  const material =
    (options.materialType ?? "lambert") === "basic"
      ? new BasicMaterial(materialOptions)
      : new LambertMaterial(materialOptions);
  const mapKd = raw.mapKd;
  const definition: MTLMaterialDefinition = {
    name: raw.name,
    material,
    ambientColor: raw.ambientColor?.clone(),
    diffuseColor: raw.diffuseColor?.clone(),
    baseColor: baseColor.clone(),
    opacity,
    transparency: 1 - opacity,
    opacityLevel,
    dissolve: raw.dissolve,
    transparencyValue: raw.transparencyValue,
    illum: raw.illum,
    mapKd:
      mapKd === undefined
        ? undefined
        : {
            ...mapKd,
            raw: mapKd.raw,
            url: resolveTexturePath(mapKd.path, basePath),
            scale: [...mapKd.scale] as [number, number, number],
            offset: [...mapKd.offset] as [number, number, number],
          },
    properties: Object.freeze(Object.fromEntries(raw.properties)),
  };
  return definition;
}

/** Loads Wavefront MTL files into CPU Canvas2D-compatible material tables. */
export class MTLLoader extends Loader {
  #options: MTLMaterialOptions;
  readonly #fileLoaders = new Set<FileLoader>();

  /** Constructs an MTL loader with optional CPU material options. */
  constructor(
    manager: LoadingManager | undefined = void 0,
    options: MTLMaterialOptions = {},
  ) {
    super(manager);
    this.#options = { ...options };
  }

  /** Replaces CPU material construction options and returns this loader. */
  setMaterialOptions(value: MTLMaterialOptions): this {
    this.#options = { ...value };
    return this;
  }

  /** Starts loading an MTL resource through the configured manager. */
  override load(
    url: string,
    onLoad?: (result: MTLMaterialTable) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (err: unknown) => void,
  ): void {
    const fileLoader = new FileLoader(this.manager);
    fileLoader.cache = this.cache;
    fileLoader.path = this.path;
    fileLoader.responseType = "text";
    fileLoader.requestHeader = this.requestHeader;
    fileLoader.withCredentials = this.withCredentials;
    this.#fileLoaders.add(fileLoader);
    const sourcePath =
      this.resourcePath || (this.path === "" ? extractUrlBase(url) : this.path);
    fileLoader.load(
      url,
      (text) => {
        let result: MTLMaterialTable;
        try {
          result = this.parse(String(text), sourcePath);
        } catch (error) {
          this.#fileLoaders.delete(fileLoader);
          onError?.(error);
          this.manager.itemError(this.manager.resolveUrl(this.path + url));
          return;
        }
        this.#fileLoaders.delete(fileLoader);
        onLoad?.(result);
      },
      onProgress,
      (error) => {
        this.#fileLoaders.delete(fileLoader);
        onError?.(error);
      },
    );
  }

  /** Aborts every active MTL text request owned by this loader. */
  override abort(): this {
    for (const fileLoader of this.#fileLoaders) fileLoader.abort();
    this.#fileLoaders.clear();
    return this;
  }

  /** Loads an MTL resource and resolves to its CPU material table. */
  override loadAsync(
    url: string,
    onProgress?: (event: ProgressEvent) => void,
  ): Promise<MTLMaterialTable> {
    return new Promise((resolve, reject) => {
      this.load(url, resolve, onProgress, reject);
    });
  }

  /**
   * Parses MTL source records into deterministic CPU materials and metadata.
   * Unsupported shading records remain in `properties`; they are never
   * converted into WebGL, shader, or PBR state.
   *
   * @param text Raw Wavefront MTL source.
   * @param path Base path used to resolve `map_Kd` references.
   */
  override parse(text: string, path = this.resourcePath): MTLMaterialTable {
    if (typeof text !== "string") {
      throw new TypeError("MTLLoader.parse requires a string.");
    }
    const materials = new Map<string, RawMaterial>();
    const warnings: string[] = [];
    let current: RawMaterial | undefined;
    const lines = text.split(RE_NEWLINE);

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const sourceLine = lines[lineIndex] ?? "";
      const line = sourceLine.trim();
      if (line === "" || line.startsWith("#")) continue;
      const match = line.match(RE_RECORD);
      if (match === null) {
        warnings.push(`line ${lineIndex + 1}: malformed record`);
        continue;
      }
      const groups = match.groups as
        | { key?: string; rest?: string }
        | undefined;
      const key = groups?.key?.toLowerCase();
      if (key === undefined) {
        warnings.push(`line ${lineIndex + 1}: malformed record`);
        continue;
      }
      const value = groups?.rest?.trim() ?? "";

      if (key === "newmtl") {
        if (value === "") {
          warnings.push(`line ${lineIndex + 1}: newmtl requires a name`);
          current = undefined;
          continue;
        }
        current = {
          name: value,
          ambientColor: undefined,
          diffuseColor: undefined,
          dissolve: undefined,
          transparencyValue: undefined,
          opacitySource: undefined,
          illum: undefined,
          mapKd: undefined,
          properties: new Map(),
        };
        materials.set(value, current);
        continue;
      }

      if (current === undefined) {
        warnings.push(`line ${lineIndex + 1}: record before newmtl ignored`);
        continue;
      }

      switch (key) {
        case "ka": {
          const color = parseColor(value, this.#options);
          if (color === undefined) {
            warnings.push(`line ${lineIndex + 1}: invalid Ka color`);
          } else {
            current.ambientColor = color;
          }
          break;
        }
        case "kd": {
          const color = parseColor(value, this.#options);
          if (color === undefined) {
            warnings.push(`line ${lineIndex + 1}: invalid Kd color`);
          } else {
            current.diffuseColor = color;
          }
          break;
        }
        case "d": {
          const dissolve = parseFiniteNumber(value);
          if (dissolve === undefined) {
            warnings.push(`line ${lineIndex + 1}: invalid d value`);
          } else {
            current.dissolve = clampUnit(dissolve);
            current.opacitySource = "d";
          }
          break;
        }
        case "tr": {
          const transparencyValue = parseFiniteNumber(value);
          if (transparencyValue === undefined) {
            warnings.push(`line ${lineIndex + 1}: invalid Tr value`);
          } else {
            current.transparencyValue = clampUnit(transparencyValue);
            current.opacitySource = "tr";
          }
          break;
        }
        case "illum": {
          const illum = parseFiniteNumber(value);
          if (illum === undefined) {
            warnings.push(`line ${lineIndex + 1}: invalid illum value`);
          } else {
            current.illum = illum;
          }
          break;
        }
        case "map_kd": {
          const parsed = parseMapReference(value);
          if (parsed === undefined) {
            warnings.push(`line ${lineIndex + 1}: invalid map_Kd path`);
          } else {
            current.mapKd = {
              ...parsed,
              raw: value,
              url: resolveTexturePath(parsed.path, path),
            };
          }
          break;
        }
        default:
          current.properties.set(key, parsePropertyValue(value));
      }
    }

    const materialRecords: Record<string, Material> = {};
    const definitionRecords: Record<string, MTLMaterialDefinition> = {};
    const infoRecords: Record<string, MTLMaterialInfo> = {};
    for (const [name, raw] of materials) {
      const definition = createMaterial(raw, this.#options, path);
      materialRecords[name] = definition.material;
      definitionRecords[name] = definition;
      const ambient = colorToArray(raw.ambientColor);
      const diffuse = colorToArray(raw.diffuseColor);
      const info: MTLMaterialInfo = {
        name,
        ...(ambient === undefined ? {} : { ka: ambient }),
        ...(diffuse === undefined ? {} : { kd: diffuse }),
        ...(raw.dissolve === undefined ? {} : { d: raw.dissolve }),
        ...(raw.transparencyValue === undefined
          ? {}
          : { tr: raw.transparencyValue }),
        ...(raw.illum === undefined ? {} : { illum: raw.illum }),
        ...(raw.mapKd === undefined ? {} : { map_kd: raw.mapKd.raw }),
        ...Object.fromEntries(raw.properties),
      };
      infoRecords[name] = info;
    }
    return new MTLMaterialTable(
      materialRecords,
      definitionRecords,
      path,
      warnings,
      infoRecords,
    );
  }
}
