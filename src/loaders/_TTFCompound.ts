import type { BinaryReader } from "./_TTFBinaryReader.ts";
import type { GlyphData, OutlinePoint } from "./_TTFParser.ts";

const MORE_COMPONENTS = 0x0020;
const ARG_1_AND_2_ARE_WORDS = 0x0001;
const ARGS_ARE_XY_VALUES = 0x0002;
const WE_HAVE_A_SCALE = 0x0008;
const WE_HAVE_AN_X_AND_Y_SCALE = 0x0040;
const WE_HAVE_A_TWO_BY_TWO = 0x0080;
const WE_HAVE_INSTRUCTIONS = 0x0100;
const SCALED_COMPONENT_OFFSET = 0x0800;

interface ComponentTransform {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
}

/** Resolves component glyphs, transforms, and offsets into compound contours. */
export function readCompoundContours(
  reader: BinaryReader,
  readGlyph: (index: number) => GlyphData | undefined,
): OutlinePoint[][] {
  const contours: OutlinePoint[][] = [];
  let flags = 0;
  do {
    const component = readCompoundComponent(reader, readGlyph);
    flags = component.flags;
    if (component.contours.length === 0) continue;
    const { offsetX, offsetY } = resolveComponentOffset({
      flags,
      arg1: component.arg1,
      arg2: component.arg2,
      points: component.points,
      contours,
      transform: component.transform,
    });
    appendTransformedContours({
      target: contours,
      contours: component.contours,
      transform: component.transform,
      offsetX,
      offsetY,
    });
  } while (flags & MORE_COMPONENTS);
  if (flags & WE_HAVE_INSTRUCTIONS) {
    const instructionLength = reader.readUint16();
    reader.skip(instructionLength);
  }
  return contours;
}

interface CompoundComponent {
  readonly flags: number;
  readonly arg1: number;
  readonly arg2: number;
  readonly transform: ComponentTransform;
  readonly contours: readonly (readonly OutlinePoint[])[];
  readonly points: readonly OutlinePoint[];
}

function readCompoundComponent(
  reader: BinaryReader,
  readGlyph: (index: number) => GlyphData | undefined,
): CompoundComponent {
  const flags = reader.readUint16();
  const glyphIndex = reader.readUint16();
  const wordArguments = (flags & ARG_1_AND_2_ARE_WORDS) !== 0;
  const arg1 = wordArguments ? reader.readInt16() : reader.readInt8();
  const arg2 = wordArguments ? reader.readInt16() : reader.readInt8();
  const transform = readComponentTransform(reader, flags);
  const child = readGlyph(glyphIndex);
  const contours = child?.contours ?? [];
  const points = contours.flatMap((contour) =>
    contour.map((point) => transformPoint(point, transform)),
  );
  return { flags, arg1, arg2, transform, contours, points };
}

function readComponentTransform(
  reader: BinaryReader,
  flags: number,
): ComponentTransform {
  const transform = { a: 1, b: 0, c: 0, d: 1 };
  if (flags & WE_HAVE_A_SCALE) {
    transform.a = transform.d = readScale(reader);
  } else if (flags & WE_HAVE_AN_X_AND_Y_SCALE) {
    transform.a = readScale(reader);
    transform.d = readScale(reader);
  } else if (flags & WE_HAVE_A_TWO_BY_TWO) {
    transform.a = readScale(reader);
    transform.b = readScale(reader);
    transform.c = readScale(reader);
    transform.d = readScale(reader);
  }
  return transform;
}

function readScale(reader: BinaryReader): number {
  return reader.readInt16() / 16384;
}

interface ComponentOffsetInput {
  readonly flags: number;
  readonly arg1: number;
  readonly arg2: number;
  readonly points: readonly OutlinePoint[];
  readonly contours: readonly (readonly OutlinePoint[])[];
  readonly transform: ComponentTransform;
}

function resolveComponentOffset({
  flags,
  arg1,
  arg2,
  points,
  contours,
  transform,
}: ComponentOffsetInput): { offsetX: number; offsetY: number } {
  if (flags & ARGS_ARE_XY_VALUES) {
    let offsetX = arg1;
    let offsetY = arg2;
    if (flags & SCALED_COMPONENT_OFFSET) {
      const transformedX = transform.a * offsetX + transform.c * offsetY;
      const transformedY = transform.b * offsetX + transform.d * offsetY;
      offsetX = transformedX;
      offsetY = transformedY;
    }
    return { offsetX, offsetY };
  }
  const parent = contours.flat()[arg1];
  const component = points[arg2];
  return parent && component
    ? { offsetX: parent.x - component.x, offsetY: parent.y - component.y }
    : { offsetX: 0, offsetY: 0 };
}

interface AppendContoursInput {
  readonly target: OutlinePoint[][];
  readonly contours: readonly (readonly OutlinePoint[])[];
  readonly transform: ComponentTransform;
  readonly offsetX: number;
  readonly offsetY: number;
}

function appendTransformedContours({
  target,
  contours,
  transform,
  offsetX,
  offsetY,
}: AppendContoursInput): void {
  for (const contour of contours) {
    target.push(
      contour.map((point) => ({
        x: transform.a * point.x + transform.c * point.y + offsetX,
        y: transform.b * point.x + transform.d * point.y + offsetY,
        onCurve: point.onCurve,
      })),
    );
  }
}

function transformPoint(
  point: OutlinePoint,
  transform: ComponentTransform,
): OutlinePoint {
  return {
    x: transform.a * point.x + transform.c * point.y,
    y: transform.b * point.x + transform.d * point.y,
    onCurve: point.onCurve,
  };
}
