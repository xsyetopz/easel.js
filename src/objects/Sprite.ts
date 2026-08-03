import { Node } from "../core/Node.ts";
import type { Material } from "../materials/Material.ts";

/** Camera-facing quad rendered from a texture. */
export class Sprite extends Node {
  override type = "Sprite";

  material: Material | undefined;

  constructor(material: Material | undefined = void 0) {
    super();
    this.material = material;
  }

  override clone(): Sprite {
    return new Sprite(this.material).copy(this);
  }

  override copy(source: Sprite, recursive = true): this {
    super.copy(source, recursive);
    this.material = source.material;
    return this;
  }
}
