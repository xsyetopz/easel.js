import type { Camera } from "../cameras/Camera.ts";
import type { Intersection, Raycaster } from "../core/Raycaster.ts";
import { Node } from "../core/Node.ts";
import { Vector3 } from "../math/Vector3.ts";

const _cameraPosition = new Vector3();
const _lodPosition = new Vector3();

/** Distance threshold and hysteresis settings for one LOD object. */
export interface LODLevel {
  /** Scene-graph object displayed at this level. */
  readonly object: Node;
  /** Non-negative camera distance at which this level becomes active. */
  readonly distance: number;
  /** Fractional threshold hysteresis used while switching levels. */
  readonly hysteresis: number;
}

/** Explicit distance-based scene-graph level selection. */
export class LOD extends Node {
  /** Serialization discriminator for this runtime type. */
  override type: string = "LOD";

  /** Type guard identifying this concrete object type. */
  get isLOD(): true {
    return true;
  }

  readonly #levels: LODLevel[] = [];
  #currentLevel = 0;

  /** Read-only levels sorted by ascending distance; use `addLevel` or `removeLevel` to mutate. */
  get levels(): readonly LODLevel[] {
    return this.#levels;
  }

  /** Index selected by the most recent explicit `update()` call. */
  get currentLevel(): number {
    return this.#currentLevel;
  }

  /** Adds a distance threshold and its object, keeping levels sorted. */
  addLevel(object: Node, distance: number = 0, hysteresis: number = 0): this {
    if (!Number.isFinite(distance)) {
      throw new RangeError("LOD.addLevel: distance must be finite");
    }
    if (!Number.isFinite(hysteresis) || hysteresis < 0 || hysteresis > 1) {
      throw new RangeError("LOD.addLevel: hysteresis must be between 0 and 1");
    }

    const normalizedDistance = Math.abs(distance);
    const index = this.#levels.findIndex(
      (level) => normalizedDistance < level.distance,
    );
    const insertionIndex = index === -1 ? this.#levels.length : index;
    this.#levels.splice(insertionIndex, 0, {
      object,
      distance: normalizedDistance,
      hysteresis,
    });
    this.add(object);
    return this;
  }

  /** Removes the level at `distance`, returning whether one was found. */
  removeLevel(distance: number): boolean {
    if (!Number.isFinite(distance)) return false;
    const normalizedDistance = Math.abs(distance);
    const index = this.#levels.findIndex(
      (entry) => entry.distance === normalizedDistance,
    );
    if (index === -1) return false;

    const [removed] = this.#levels.splice(index, 1);
    if (removed) this.remove(removed.object);
    this.#currentLevel = Math.min(
      this.#currentLevel,
      Math.max(0, this.#levels.length - 1),
    );
    return true;
  }

  /** Returns the level object selected for an absolute camera distance. */
  getObjectForDistance(distance: number): Node | undefined {
    if (this.#levels.length === 0 || !Number.isFinite(distance)) return;

    const normalizedDistance = Math.abs(distance);
    let index = 1;
    for (; index < this.#levels.length; index++) {
      const level = this.#levels[index];
      const threshold = level.object.visible
        ? level.distance * (1 - level.hysteresis)
        : level.distance;
      if (normalizedDistance < threshold) break;
    }
    return this.#levels[index - 1]?.object;
  }

  /** Appends intersections from the selected level without traversing sibling levels. */
  raycast(raycaster: Raycaster, intersects: Intersection[]): void {
    if (this.#levels.length === 0) return;
    _lodPosition.setFromMatrixPosition(this.matrixWorld);
    const distance = raycaster.ray.origin.distanceTo(_lodPosition);
    const object = this.getObjectForDistance(distance);
    if (object === undefined) return;
    const raycast = (
      object as Node & {
        raycast?: (caster: Raycaster, results: Intersection[]) => void;
      }
    ).raycast;
    raycast?.call(object, raycaster, intersects);
  }

  /** Selects the visible level from already-prepared world matrices. */
  update(camera: Camera): this {
    if (this.#levels.length === 0) {
      this.#currentLevel = 0;
      return this;
    }

    _cameraPosition.setFromMatrixPosition(camera.matrixWorld);
    _lodPosition.setFromMatrixPosition(this.matrixWorld);
    const zoom = (camera as Camera & { readonly zoom?: number }).zoom ?? 1;
    const distance = _cameraPosition.distanceTo(_lodPosition) / zoom;

    let selectedIndex = 0;
    for (let index = 1; index < this.#levels.length; index++) {
      const level = this.#levels[index];
      const threshold = level.object.visible
        ? level.distance * (1 - level.hysteresis)
        : level.distance;
      if (distance < threshold) break;
      selectedIndex = index;
    }

    this.#currentLevel = selectedIndex;
    for (let index = 0; index < this.#levels.length; index++) {
      const level = this.#levels[index];
      if (level !== undefined) level.object.visible = index === selectedIndex;
    }
    return this;
  }

  /** Returns an independent copy with cloned mutable state. */
  override clone(): LOD {
    return new LOD().copy(this);
  }

  /** Copies level settings and clones each level object. */
  override copy(source: LOD): this {
    for (const level of this.#levels) this.remove(level.object);
    this.#levels.length = 0;
    super.copy(source, false);
    for (const level of source.levels) {
      this.addLevel(level.object.clone(), level.distance, level.hysteresis);
    }
    this.#currentLevel = source.currentLevel;
    return this;
  }
}
