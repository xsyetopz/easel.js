import type { Color } from "../math/Color.ts";
import type { Fog } from "../scenes/Fog.ts";
import type { Texture } from "../textures/Texture.ts";
import { Node } from "./Node.ts";

/** Root node of a scene graph, holds background and fog. */
export class Scene extends Node {
  override type = "Scene";

  /**
   * When true, the renderer calls updateMatrixWorld() on the scene
   * before traversal -- matching THREE.js behaviour.
   */
  autoUpdate = true;

  /** Scene-level fog. Set to a Fog instance or undefined. */
  fog: Fog | undefined = undefined;

  /**
   * Background painted before any geometry. Accepts a Color instance, a hex
   * number (e.g. 0xff0000), a screen-space Texture, or undefined (falls back
   * to setClearColor).
   */
  background: Color | number | Texture | undefined = undefined;

  override clone(): Scene {
    return new Scene().copy(this);
  }
}
