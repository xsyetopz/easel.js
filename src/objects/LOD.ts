import type { Camera } from "../cameras/Camera.ts";
import { Node } from "../core/Node.ts";
import type { Intersection, Raycaster } from "../core/Raycaster.ts";
import { Vector3 } from "../math/Vector3.ts";

const _cameraPosition = new Vector3();
const _lodPosition = new Vector3();

// LODs reached, in pre-order, by the scene matrix pass of `Renderer.prepare`.
// Recording rides on that existing pass, so scenes without LODs pay nothing.
const _recordedLODs: LOD[] = [];
let _recording = false;

/**
 * Starts (`true`) or stops (`false`) recording the LODs whose world matrices
 * are updated, so `Renderer.prepare` can auto-update them without another
 * scene walk. Starting clears the previous record.
 */
export function recordLODsForAutoUpdate(enabled: boolean): void {
  if (enabled) _recordedLODs.length = 0;
  _recording = enabled;
}

/**
 * Calls `update(camera)` on each recorded LOD that three.js r186's renderer
 * would reach while projecting the scene: `autoUpdate` is on, the LOD and all
 * its ancestors are visible, and its layers match the camera's. Clears the
 * record afterwards.
 */
export function autoUpdateRecordedLODs(camera: Camera): void {
  // Pre-order lets an outer LOD hide the level that holds an inner one first.
  for (let index = 0; index < _recordedLODs.length; index++) {
    const lod = _recordedLODs[index];
    if (
      lod?.autoUpdate &&
      lod.layers.test(camera.layers) &&
      isVisibleInScene(lod)
    ) {
      lod.update(camera);
    }
  }
  _recordedLODs.length = 0;
}

/** Whether a node and every ancestor are visible, as r186's `projectObject` requires. */
function isVisibleInScene(node: Node): boolean {
  for (
    let current: Node | undefined = node;
    current;
    current = current.parent
  ) {
    if (!current.visible) return false;
  }
  return true;
}

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

  /**
   * Whether `Renderer.prepare` calls `update(camera)` once per frame, as
   * three.js r186's renderer does. Defaults to `true`.
   */
  autoUpdate = true;

  /** Read-only levels sorted by ascending distance; use `addLevel` or `removeLevel` to mutate. */
  get levels(): readonly LODLevel[] {
    return this.#levels;
  }

  /** Index selected by the most recent `update()` call, explicit or from `Renderer.prepare`. */
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
        ? level.distance - level.distance * level.hysteresis
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

  /**
   * Selects the visible level from already-prepared world matrices. Like
   * three.js r186, it changes nothing unless there are at least two levels.
   */
  update(camera: Camera): this {
    if (this.#levels.length <= 1) return this;

    _cameraPosition.setFromMatrixPosition(camera.matrixWorld);
    _lodPosition.setFromMatrixPosition(this.matrixWorld);
    const zoom = (camera as Camera & { readonly zoom?: number }).zoom ?? 1;
    const distance = _cameraPosition.distanceTo(_lodPosition) / zoom;

    let selectedIndex = 0;
    for (let index = 1; index < this.#levels.length; index++) {
      const level = this.#levels[index];
      const threshold = level.object.visible
        ? level.distance - level.distance * level.hysteresis
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

  /** Records this LOD for auto-update during `Renderer.prepare`, then updates matrices. */
  override updateMatrixWorld(
    updateParents: boolean = false,
    updateChildren: boolean = true,
    force: boolean = false,
  ): void {
    if (_recording) _recordedLODs.push(this);
    super.updateMatrixWorld(updateParents, updateChildren, force);
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
    this.autoUpdate = source.autoUpdate;
    return this;
  }
}
