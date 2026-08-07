import { Color } from "../math/Color.ts";
import type { Material } from "../materials/Material.ts";
import type { Fog, FogJSON } from "../scenes/Fog.ts";
import { Texture, type TextureJSON } from "../textures/Texture.ts";
import { Node, type NodeJSON } from "./Node.ts";

/** Serialized node state with optional Canvas2D background and bounded fog. */
export interface SceneJSON extends NodeJSON {
  /** Packed color or serialized screen-space texture background. */
  background?: number | TextureJSON;
  /** Serialized bounded scene fog. */
  fog?: FogJSON;
}

/** Root node holding Canvas2D background and bounded CPU fog state. */
export class Scene extends Node {
  /** Runtime class label used by scene serialization and dispatch. */
  override type: string = "Scene";

  #fog: Fog | undefined;
  #background: Color | number | Texture | undefined;
  #environment: Texture | null = null;
  #overrideMaterial: Material | null = null;

  /** Constant type guard identifying this node as a scene. */
  get isScene(): true {
    return true;
  }

  /** Scene fog configuration; `undefined` disables fog. */
  get fog(): Fog | undefined {
    return this.#fog;
  }

  /** Assigns scene fog; traversal prepares renderer state only when needed. */
  set fog(value: Fog | undefined) {
    this.#fog = value;
  }

  /**
   * Background painted before geometry. A Color or packed hex number selects a
   * uniform Canvas2D color; a Texture selects a bounded screen-space image.
   * Undefined leaves the renderer clear color in place.
   */
  get background(): Color | number | Texture | undefined {
    return this.#background;
  }

  /** Assigns a color, packed RGB value, screen-space texture, or `undefined`. */
  set background(value: Color | number | Texture | undefined) {
    this.#background = value;
  }

  /** Environment map for PBR; retained for API parity and ignored by the CPU renderer. */
  get environment(): Texture | null {
    return this.#environment;
  }

  /** Assigns or clears the environment map. */
  set environment(value: Texture | null) {
    this.#environment = value;
  }

  /** Material that overrides all others during traversal, or `null` to disable. */
  get overrideMaterial(): Material | null {
    return this.#overrideMaterial;
  }

  /** Assigns or clears the traversal override material. */
  set overrideMaterial(value: Material | null) {
    this.#overrideMaterial = value;
  }

  /** Returns a scene copy with cloned children, fog, and background state. */
  override clone(): Scene {
    return new Scene().copy(this);
  }

  /** Copies node hierarchy and clones the source fog and background state. */
  override copy(source: Scene, recursive: boolean = true): this {
    super.copy(source, recursive);
    this.#fog = source.#fog?.clone();
    const background = source.#background;
    this.#background =
      background instanceof Color || background instanceof Texture
        ? background.clone()
        : background;
    this.#environment = source.#environment;
    this.#overrideMaterial = source.#overrideMaterial;
    return this;
  }

  /** Serializes node state plus Canvas2D background and bounded fog state. */
  override toJSON(_meta?: object | string): SceneJSON {
    const json: SceneJSON = super.toJSON();
    const background = this.#background;
    if (background instanceof Color) {
      json.background = background.toJSON();
    } else if (background instanceof Texture) {
      json.background = background.toJSON();
    } else if (background !== undefined) {
      if (!Number.isFinite(background)) {
        throw new RangeError("Scene.toJSON requires finite background color.");
      }
      json.background = background;
    }
    if (this.#fog !== undefined) json.fog = this.#fog.toJSON();
    return json;
  }
}
