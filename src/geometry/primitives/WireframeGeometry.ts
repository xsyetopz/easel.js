import { Geometry } from "../Geometry.ts";

/** Builds non-indexed line segments for each unique triangle edge. */
export class WireframeGeometry extends Geometry {
  /** Serialization discriminator for this runtime type. */
  override type: string = "WireframeGeometry";
  /** Primitive-construction parameters retained for serialization. */
  override parameters: Record<string, unknown> = {};

  /** Extracts unique triangle edges as non-indexed line segments. */
  constructor(geometry: Geometry) {
    super();

    this.parameters = { geometry };

    const posAttr = geometry.getAttribute("position");
    if (!posAttr) {
      this.setPositions(new Float32Array(0));
      return;
    }

    const srcPositions = posAttr.array;
    const srcIndex = geometry.index;

    const indexList = srcIndex
      ? Array.from(srcIndex)
      : Array.from({ length: srcPositions.length / 3 }, (_, i) => i);

    const seen = new Set<string>();
    const positions: number[] = [];

    function addEdge(a: number, b: number): void {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      if (seen.has(key)) return;
      seen.add(key);
      positions.push(
        srcPositions[a * 3],
        srcPositions[a * 3 + 1],
        srcPositions[a * 3 + 2],
        srcPositions[b * 3],
        srcPositions[b * 3 + 1],
        srcPositions[b * 3 + 2],
      );
    }

    for (let i = 0; i < indexList.length; i += 3) {
      const a = indexList[i];
      const b = indexList[i + 1];
      const c = indexList[i + 2];
      addEdge(a, b);
      addEdge(b, c);
      addEdge(c, a);
    }

    this.setPositions(new Float32Array(positions));
  }
}
