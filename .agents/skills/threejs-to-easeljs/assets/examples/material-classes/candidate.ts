// EASEL 0.7.0: Mesh prefix dropped, LineBasic -> Line, LineDashed ->
// DashedLine. vertexColors defaults to true, so set false to match three.
import {
  BasicMaterial,
  DashedLineMaterial,
  LambertMaterial,
  LineMaterial,
  PointsMaterial,
} from "@xsyetopz/easel";

export function basic(): BasicMaterial {
  return new BasicMaterial({ color: 0xffffff, vertexColors: false });
}

export function points(): PointsMaterial {
  return new PointsMaterial({ color: 0xffffff, size: 2, vertexColors: false });
}

export function run() {
  const lambert = new LambertMaterial({ color: 0x44aa88 });
  const line = new LineMaterial({ color: 0xff0000 });
  const dashed = new DashedLineMaterial({ dashSize: 3, gapSize: 1 });
  const b = basic();
  return {
    types: [b.type, lambert.type, line.type, dashed.type],
    vertexColors: b.vertexColors,
  };
}
