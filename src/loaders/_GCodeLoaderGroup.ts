import { Geometry } from "../geometry/Geometry.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import { Group } from "../objects/Group.ts";
import { LineSegments } from "../objects/LineSegments.ts";
import type { GCodeLayer, GCodeMode } from "./_GCodeLoaderHelpers.ts";

/** Builds a rotated line-segment group from parsed G-code layer data. */
export function createGroup(
  layers: readonly GCodeLayer[],
  feedRates: readonly number[],
  splitLayer: boolean,
  mode: GCodeMode,
): Group {
  const group = new Group();
  group.name = "gcode";
  group.rotation.set(-Math.PI / 2, 0, 0);
  Object.assign(group.userData, {
    layers: layers.map((layer) => ({
      index: layer.index,
      z: layer.z,
    })),
    feedRates: [...feedRates],
    mode,
  });
  const pathMaterial = new LineMaterial({ color: 0xff6b6b });
  pathMaterial.name = mode === "toolpath" ? "travel" : "path";
  const extrudingMaterial = new LineMaterial({ color: 0x4ade80 });
  extrudingMaterial.name = mode === "toolpath" ? "cut" : "extruded";

  if (splitLayer) {
    for (const [index, layer] of layers.entries()) {
      addObject(group, layer.vertex, extrudingMaterial, `layer${index}`);
      addObject(group, layer.pathVertex, pathMaterial, `layer${index}`);
    }
    return group;
  }
  const vertex: number[] = [];
  const pathVertex: number[] = [];
  for (const layer of layers) {
    vertex.push(...layer.vertex);
    pathVertex.push(...layer.pathVertex);
  }
  addObject(group, vertex, extrudingMaterial, `layer${layers.length}`);
  addObject(group, pathVertex, pathMaterial, `layer${layers.length}`);
  return group;
}

function addObject(
  group: Group,
  vertices: readonly number[],
  material: LineMaterial,
  name: string,
): void {
  const geometry = new Geometry().setPositions([...vertices]);
  const segments = new LineSegments(geometry, material);
  segments.name = name;
  group.add(segments);
}
