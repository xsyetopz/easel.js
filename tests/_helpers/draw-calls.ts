import type { DrawCall } from "@/pipeline/DrawCall.js";
import { DrawList } from "@/pipeline/DrawList.js";

export type DrawCallPosition = [x: number, y: number, z?: number];

export function makeDrawCall(xOrId: number | string, y = 0, z = 0): DrawCall {
  return {
    id: xOrId,
    centroid: { x: typeof xOrId === "number" ? xOrId : 0, y, z },
    material: {},
  } as unknown as DrawCall;
}

export function makeDrawList(...positions: DrawCallPosition[]): DrawList {
  const list = new DrawList();
  for (const [x, y, z] of positions) list.add(makeDrawCall(x, y, z ?? 0));
  return list;
}
