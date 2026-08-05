import type { DrawCall } from "../DrawCall.ts";

interface SortableDrawList {
  calls: DrawCall[];
}

function compareBackToFront(a: DrawCall, b: DrawCall): number {
  return b.tileDistance - a.tileDistance;
}

/** Sorts draw calls by tile distance from camera. */
export class TileDistanceSorter {
  /** Sorts draw calls back-to-front by Manhattan tile distance from camera. */
  sort(
    drawList: SortableDrawList,
    cameraPosition: { x: number; y: number },
  ): void {
    const calls = drawList.calls;
    const n = calls.length;

    const cx = cameraPosition.x;
    const cy = cameraPosition.y;
    for (let i = 0; i < n; i++) {
      const call = calls[i];
      const c = call.centroid;
      call.tileDistance = Math.abs(c.x - cx) + Math.abs(c.y - cy);
    }

    calls.sort(compareBackToFront);
  }
}
