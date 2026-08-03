import type { DrawCall } from "./DrawCall.ts";
import type { DrawList } from "./DrawList.ts";
import { DrawPrioritySorter } from "./sorting/DrawPrioritySorter.ts";
import { PolygonSorter } from "./sorting/PolygonSorter.ts";
import { TileDistanceSorter } from "./sorting/TileDistanceSorter.ts";

/**
 * Painter's algorithm sorter with front-to-back opaque rendering.
 * Opaque meshes render first (front-to-back for early-Z rejection),
 * then transparent meshes render back-to-front for correct blending.
 */
export class PainterSort {
  #tileSorter = new TileDistanceSorter();
  #prioritySorter = new DrawPrioritySorter();
  #polygonSorter = new PolygonSorter();
  #opaque: DrawCall[] = [];
  #transparent: DrawCall[] = [];
  #layerKeys: number[] = [];
  #layerBuckets: Map<number, DrawCall[]> = new Map();

  /**
   * Runs the full painter's algorithm sort chain:
   * tile distance (back-to-front) -> material layer -> opaque/transparent split.
   * Opaques are reversed to front-to-back so early-Z rejects overdraw.
   * Transparents stay back-to-front for correct blending.
   */
  sort(
    drawList: DrawList,
    cameraPosition: { x: number; y: number },
    sortObjects = true,
  ): void {
    const calls = drawList.calls;
    const n = calls.length;
    if (!sortObjects) {
      this.#sortTransparentOnly(drawList, cameraPosition);
      return;
    }
    if (n < 2) {
      this.#sortPolygons(drawList);
      return;
    }

    // Fast path: when everything is fully opaque, ordering is a performance hint.
    // The depth buffer guarantees correctness, so avoid the expensive distance sort.
    let allOpaque = true;
    const firstLayer = calls[0].material.layer;
    let hasMultipleLayers = false;
    for (let i = 0; i < n; i++) {
      const mat = calls[i].material;
      if (isTransparent(mat)) {
        allOpaque = false;
        break;
      }
      if (mat.layer !== firstLayer) hasMultipleLayers = true;
    }

    if (allOpaque) {
      if (hasMultipleLayers) {
        const buckets = this.#layerBuckets;
        const keys = this.#layerKeys;
        keys.length = 0;

        for (let i = 0; i < n; i++) {
          const dc = calls[i];
          const layer = dc.material.layer;
          let bucket = buckets.get(layer);
          if (!bucket) {
            bucket = [];
            buckets.set(layer, bucket);
            keys.push(layer);
          }
          bucket.push(dc);
        }

        keys.sort((a, b) => a - b);
        let out = 0;
        for (const layer of keys) {
          const bucket = buckets.get(layer);
          if (!bucket) continue;
          for (const call of bucket) {
            calls[out++] = call;
          }
          bucket.length = 0;
        }
        calls.length = out;
        keys.length = 0;
      }

      this.#sortPolygons(drawList);
      return;
    }

    this.#tileSorter.sort(drawList, cameraPosition);
    this.#prioritySorter.sort(drawList);
    const opaque = this.#opaque;
    const transparent = this.#transparent;
    opaque.length = 0;
    transparent.length = 0;

    for (let i = 0; i < n; i++) {
      const dc = calls[i];
      if (isTransparent(dc.material)) {
        transparent.push(dc);
      } else {
        opaque.push(dc);
      }
    }

    // Reverse opaques within each layer group: back-to-front -> front-to-back
    const oLen = opaque.length;
    let groupStart = 0;
    while (groupStart < oLen) {
      const layer = opaque[groupStart].material.layer;
      let groupEnd = groupStart + 1;
      while (groupEnd < oLen && opaque[groupEnd].material.layer === layer) {
        groupEnd++;
      }
      for (let i = groupStart, j = groupEnd - 1; i < j; i++, j--) {
        const tmp = opaque[i];
        opaque[i] = opaque[j];
        opaque[j] = tmp;
      }
      groupStart = groupEnd;
    }

    // Rebuild calls: opaques first, then transparents
    let out = 0;
    for (const call of opaque) calls[out++] = call;
    for (const call of transparent) calls[out++] = call;
    calls.length = out;

    this.#sortPolygons(drawList);
  }

  #sortTransparentOnly(
    drawList: DrawList,
    cameraPosition: { x: number; y: number },
  ): void {
    const calls = drawList.calls;
    const n = calls.length;
    if (n === 0) return;

    const opaque = this.#opaque;
    const transparent = this.#transparent;
    opaque.length = 0;
    transparent.length = 0;

    const cx = cameraPosition.x;
    const cy = cameraPosition.y;
    for (let i = 0; i < n; i++) {
      const dc = calls[i];
      if (isTransparent(dc.material)) {
        const c = dc.centroid;
        dc._tileDistance = Math.abs(c.x - cx) + Math.abs(c.y - cy);
        transparent.push(dc);
      } else {
        opaque.push(dc);
      }
    }

    if (transparent.length === 0) {
      this.#sortPolygons(drawList);
      return;
    }

    transparent.sort(compareTransparentBackToFront);
    let out = 0;
    for (const call of opaque) calls[out++] = call;
    for (const call of transparent) {
      calls[out++] = call;
    }
    calls.length = out;
    this.#sortPolygons(drawList);
  }

  #sortPolygons(drawList: DrawList): void {
    const calls = drawList.calls;
    for (const call of calls) {
      this.#polygonSorter.sort(
        call as {
          material: {
            transparent?: boolean;
            depthTest?: boolean;
            depthWrite?: boolean;
          };
          triangles:
            | { length: number; buildSortOrder(): void; sort(): void }
            | undefined;
        },
      );
    }
  }
}

function isTransparent(material: { transparent?: boolean }): boolean {
  return material.transparent === true;
}

function compareTransparentBackToFront(a: DrawCall, b: DrawCall): number {
  const layer = a.material.layer - b.material.layer;
  return layer || b._tileDistance - a._tileDistance;
}
