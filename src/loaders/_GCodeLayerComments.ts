type GCodeCaptureGroups = { value?: string };

const numericPattern = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/u;
const layerPattern = /(?:^|\b)LAYER\s*[:=]?\s*(?<value>[^\s]+)/iu;
const layerCountPattern = /LAYER_COUNT/iu;
const layerZPattern = /\bZ\s*[:=]?\s*(?<value>[^\s]+)/iu;

/** Extracts a layer index and Z height from a slicer comment. */
export function readLayerComment(
  comment: string,
): { index?: number; z?: number } | undefined {
  const layer = layerPattern.exec(comment);
  if (!layer || layerCountPattern.test(comment)) return;
  const layerGroups = layer.groups as GCodeCaptureGroups | undefined;
  const value = Number(
    numericPattern.exec(layerGroups?.value ?? "")?.[0] ?? "NaN",
  );
  const zMatch = layerZPattern.exec(comment);
  const zGroups = zMatch?.groups as GCodeCaptureGroups | undefined;
  const z = Number(numericPattern.exec(zGroups?.value ?? "")?.[0] ?? "NaN");
  if (!(Number.isFinite(value) || Number.isFinite(z))) return;
  const result: { index?: number; z?: number } = {};
  if (Number.isFinite(value)) result.index = Math.trunc(value);
  if (Number.isFinite(z)) result.z = z;
  return result;
}
