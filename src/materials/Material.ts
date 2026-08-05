import { Shading, Side } from "../core/Constants.ts";
import { Color, type ColorValue } from "../math/Color.ts";

let _materialId = 0;

/** Values accepted by a material constructor. */
export interface MaterialOptions {
  /** Optional display name. */
  readonly name?: string;
  /** Draw order within a tile. Higher values draw later. */
  readonly layer?: number;
  /** Discrete translucency level from 0 (opaque) through 8 (transparent). */
  readonly opacity?: number;
  /** Enables the renderer's discrete translucent blend path. */
  readonly transparent?: boolean;
  /** Enables depth testing against the framebuffer depth buffer. */
  readonly depthTest?: boolean;
  /** Enables depth writes after a passing depth test. */
  readonly depthWrite?: boolean;
  /** Shading model: {@link Shading.Flat} or {@link Shading.Gouraud}. */
  readonly shading?: number;
  /** Face culling: {@link Side.Front}, {@link Side.Back}, or {@link Side.Double}. */
  readonly side?: number;
  /** Whether the material participates in scene traversal. */
  readonly visible?: boolean;
  /** Renders triangle edges instead of filled faces. */
  readonly wireframe?: boolean;
  /** Multiplies geometry vertex colors into the material color. Defaults to true for EASEL geometry-color compatibility. */
  readonly vertexColors?: boolean;
}

/** Canonical serialized state shared by every EASEL material. */
export interface MaterialJSON {
  /** String identifier used by runtime type checks and serialization. */
  type: string;
  /** Optional display name. */
  name?: string;
  /** Draw order within a tile. */
  layer?: number;
  /** Discrete translucency level. */
  opacity?: number;
  /** Whether discrete blending is enabled. */
  transparent?: boolean;
  /** Whether depth testing is disabled. */
  depthTest?: boolean;
  /** Whether depth writes are disabled. */
  depthWrite?: boolean;
  /** Shading model. */
  shading?: number;
  /** Face culling side. */
  side?: number;
  /** Whether scene traversal should draw the material. */
  visible?: boolean;
  /** Whether triangle edges are rendered. */
  wireframe?: boolean;
  /** Whether geometry vertex colors are multiplied into the material color. */
  vertexColors?: boolean;
}

function assertFiniteMaterialNumber(value: number, path: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Material.toJSON requires finite ${path}.`);
  }
}

function assertOpacity(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 8) {
    throw new RangeError(
      "Material.opacity must be a finite integer from 0 (opaque) through 8 (transparent)",
    );
  }
}

/** Base material shared by all CPU/Canvas2D material variants. */
export class Material {
  /** Numeric identifier. */
  readonly id: number = _materialId++;

  /** Returns `true` for this concrete type. */
  get isMaterial(): true {
    return true;
  }

  /** Display name. */
  name: string = "";

  /** String identifier used by runtime type checks and serialization. */
  type: string = "Material";

  /** Draw order within a tile. Higher values draw later. */
  layer: number = 0;

  #opacity = 0;

  /**
   * Discrete translucency. 0 is fully opaque and 8 is fully transparent.
   * Continuous floating-point alpha is intentionally outside the CPU renderer
   * contract; changing this boundary would require coordinated raster tests.
   */
  get opacity(): number {
    return this.#opacity;
  }

  /** Sets discrete opacity in [0, 8]; 0 is opaque and 8 is fully transparent. */
  set opacity(value: number) {
    assertOpacity(value);
    this.#opacity = value;
  }

  /** Enables translucent blending. Opacity blends only when this is true. */
  transparent: boolean = false;

  /** Enables depth testing against the framebuffer depth buffer. */
  depthTest: boolean = true;

  /** Enables depth writes after a passing depth test. */
  depthWrite: boolean = true;

  /** Shading model: {@link Shading.Flat} or {@link Shading.Gouraud}. */
  shading: number = Shading.Flat;

  /** Face culling: {@link Side.Front}, {@link Side.Back}, or {@link Side.Double}. */
  side: number = Side.Front;

  /** Whether the material participates in scene traversal. */
  visible: boolean = true;

  /** Renders triangle edges instead of filled faces. */
  wireframe: boolean = false;

  /** Multiplies geometry vertex colors into the material color. */
  vertexColors: boolean = true;

  /** Tracks caller-requested material updates without renderer work. */
  needsUpdate: boolean = false;

  /** Constructs a material with the supplied CPU/Canvas2D rendering options. */
  constructor(options: MaterialOptions = {}) {
    if (options.name !== undefined) this.name = options.name;
    if (options.layer !== undefined) this.layer = options.layer;
    if (options.opacity !== undefined) this.opacity = options.opacity;
    if (options.transparent !== undefined) {
      this.transparent = options.transparent;
    }
    if (options.depthTest !== undefined) this.depthTest = options.depthTest;
    if (options.depthWrite !== undefined) {
      this.depthWrite = options.depthWrite;
    } else if (options.transparent === true) {
      this.depthWrite = false;
    }
    if (options.shading !== undefined) this.shading = options.shading;
    if (options.side !== undefined) this.side = options.side;
    if (options.visible !== undefined) this.visible = options.visible;
    if (options.wireframe !== undefined) this.wireframe = options.wireframe;
    if (options.vertexColors !== undefined) {
      this.vertexColors = options.vertexColors;
    }
  }

  /** Applies supported material values and returns this material. */
  assign(values?: Readonly<Record<string, unknown>>): this {
    if (values === undefined) return this;

    for (const key of Object.keys(values)) {
      const value = values[key];
      if (value === undefined) continue;
      if (!(key in this)) {
        console.warn(`Material: '${key}' is not a property of ${this.type}.`);
        continue;
      }

      const current = Reflect.get(this, key) as unknown;
      if (current instanceof Color) {
        current.set(value as ColorValue);
      } else {
        Reflect.set(this, key, value);
      }
    }
    return this;
  }

  /** Creates an independent copy with cloned owned state. */
  clone(): Material {
    return new Material().copy(this);
  }

  /** Copies public state from `source` into this instance and returns `this`. */
  copy(source: Material): this {
    this.name = source.name;
    this.layer = source.layer;
    this.opacity = source.opacity;
    this.transparent = source.transparent;
    this.depthTest = source.depthTest;
    this.depthWrite = source.depthWrite;
    this.shading = source.shading;
    this.side = source.side;
    this.visible = source.visible;
    this.wireframe = source.wireframe;
    this.vertexColors = source.vertexColors;
    return this;
  }

  /** Serializes canonical material state without renderer-specific metadata. */
  toJSON(): MaterialJSON {
    assertFiniteMaterialNumber(this.layer, `${this.type}.layer`);
    assertFiniteMaterialNumber(this.opacity, `${this.type}.opacity`);
    assertFiniteMaterialNumber(this.shading, `${this.type}.shading`);
    assertFiniteMaterialNumber(this.side, `${this.type}.side`);

    const json: MaterialJSON = { type: this.type };
    if (this.name !== "") json.name = this.name;
    if (this.layer !== 0) json.layer = this.layer;
    if (this.opacity !== 0) json.opacity = this.opacity;
    if (this.transparent) json.transparent = true;
    if (!this.depthTest) json.depthTest = false;
    if (!this.depthWrite) json.depthWrite = false;
    if (this.shading !== Shading.Flat) json.shading = this.shading;
    if (this.side !== Side.Front) json.side = this.side;
    if (!this.visible) json.visible = false;
    if (this.wireframe) json.wireframe = true;
    if (!this.vertexColors) json.vertexColors = false;
    return json;
  }

  /** Releases material-owned texture and CPU resources. */
  dispose(): void {
    // Subclasses may override.
  }
}
