import type { Intersection, Raycaster } from "../core/Raycaster.ts";
import { Node } from "../core/Node.ts";
import type { Material } from "../materials/Material.ts";
import { Vector2 } from "../math/Vector2.ts";
import { Vector3 } from "../math/Vector3.ts";

const _spriteCenter = new Vector3();
const _spriteRelative = new Vector3();
const _spriteNormal = new Vector3();
const _spriteRight = new Vector3();
const _spriteUp = new Vector3();
const _spriteIntersection = new Vector3();

/** Camera-facing quad rasterized with a texture-bearing material. */
export class Sprite extends Node {
  /** Serialization discriminator for this runtime type. */
  override type: string = "Sprite";

  /** Type guard identifying this concrete object type. */
  get isSprite(): true {
    return true;
  }

  /** Material used to rasterize the camera-facing quad. */
  material: Material | undefined;

  /** Normalized anchor in sprite-local coordinates; `(0.5, 0.5)` is centered. */
  center: Vector2 = new Vector2(0.5, 0.5);

  /** Number of times the object is rendered by instance-aware consumers. */
  count: number = 1;

  /** Constructs a sprite with the supplied material. */
  constructor(material: Material | undefined = void 0) {
    super();
    this.material = material;
  }

  /** Appends an intersection when the prepared ray crosses the sprite quad. */
  raycast(raycaster: Raycaster, intersects: Intersection[]): void {
    const camera = raycaster.camera;
    if (camera === undefined) return;

    const world = this.matrixWorld.elements;
    _spriteCenter.set(world[12] ?? 0, world[13] ?? 0, world[14] ?? 0);
    _spriteRight.set(world[0] ?? 0, world[1] ?? 0, world[2] ?? 0);
    _spriteUp.set(world[4] ?? 0, world[5] ?? 0, world[6] ?? 0);
    const scaleX = _spriteRight.length || 1;
    const scaleY = _spriteUp.length || 1;
    _spriteRight.multiplyScalar(1 / scaleX);
    _spriteUp.multiplyScalar(1 / scaleY);

    const cameraWorld = camera.matrixWorld.elements;
    _spriteNormal.set(
      -(cameraWorld[8] ?? 0),
      -(cameraWorld[9] ?? 0),
      -(cameraWorld[10] ?? 0),
    );
    if (_spriteNormal.lengthSq === 0) _spriteNormal.set(0, 0, 1);
    else _spriteNormal.normalize();

    const denominator = raycaster.ray.direction.dot(_spriteNormal);
    if (Math.abs(denominator) < 1e-8) return;
    const t =
      _spriteCenter.clone().sub(raycaster.ray.origin).dot(_spriteNormal) /
      denominator;
    if (t < 0) return;

    raycaster.ray.at(t, _spriteIntersection);
    const distance = raycaster.ray.origin.distanceTo(_spriteIntersection);
    if (distance < raycaster.near || distance > raycaster.far) return;

    _spriteRelative.copy(_spriteIntersection).sub(_spriteCenter);
    const localX = _spriteRelative.dot(_spriteRight) / scaleX;
    const localY = _spriteRelative.dot(_spriteUp) / scaleY;
    const minX = -this.center.x;
    const maxX = 1 - this.center.x;
    const minY = -this.center.y;
    const maxY = 1 - this.center.y;
    if (localX < minX || localX > maxX || localY < minY || localY > maxY) {
      return;
    }

    const hit = {
      distance,
      point: _spriteIntersection.clone(),
      uv: new Vector2(localX + this.center.x, localY + this.center.y),
      object: this,
    } as Intersection & { uv: Vector2 };
    intersects.push(hit);
  }

  /** Returns an independent copy with cloned mutable state. */
  override clone(): Sprite {
    return new Sprite(this.material).copy(this);
  }

  /** Copies material, normalized anchor, instance count, and node state. */
  override copy(source: Sprite, recursive: boolean = true): this {
    super.copy(source, recursive);
    this.center.copy(source.center);
    this.count = source.count;
    this.material = source.material;
    return this;
  }
}
