import type { Curve } from "../curves/Curve.ts";
import { CubicBezierCurve } from "../curves/curves/CubicBezierCurve.ts";
import { LineCurve } from "../curves/curves/LineCurve.ts";
import { QuadraticBezierCurve } from "../curves/curves/QuadraticBezierCurve.ts";
import { Path } from "../curves/Path.ts";
import type { ShapePath } from "../curves/ShapePath.ts";
import { ShapePath as ShapePathBuilder } from "../curves/ShapePath.ts";
import { parseSVGPath } from "../curves/SVGPathParser.ts";
import { Matrix3 } from "../math/Matrix3.ts";
import { Vector2 } from "../math/Vector2.ts";
import { Color } from "../math/Color.ts";
import { Loader } from "./Loader.ts";

const RE_TOKEN = /<!--[\s\S]*?-->|<[^>]+>/gu;
const RE_CLOSING_TAG = /^<\s*\/\s*(?<name>[\w:-]+)/u;
const RE_OPENING_TAG =
  /^<\s*(?<name>[\w:-]+)\b(?<attrs>[\s\S]*?)(?<selfClose>\/?)\s*>$/u;
const RE_TRANSFORM = /(?<type>[a-z]+)\s*\((?<args>[^)]*)\)/giu;
const RE_NUMBER = /[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/gu;
const RE_ATTRIBUTE = /(?<key>[:\w-]+)\s*=\s*["'](?<value>[^"']*)["']/gu;

interface SVGAttributes {
  [key: string]: string | undefined;
  d?: string;
  points?: string;
  style?: string;
  transform?: string;
  fill?: string;
  stroke?: string;
  visibility?: string;
  x?: string;
  y?: string;
  width?: string;
  height?: string;
  rx?: string;
  ry?: string;
  cx?: string;
  cy?: string;
  r?: string;
  x1?: string;
  y1?: string;
  x2?: string;
  y2?: string;
  opacity?: string;
}
type ShapeParser = (attributes: SVGAttributes) => ShapePath | undefined;
type RegexGroupName =
  | "name"
  | "attrs"
  | "selfClose"
  | "type"
  | "args"
  | "key"
  | "value";
const group = (
  match: RegExpMatchArray,
  name: RegexGroupName,
): string | undefined => match.groups?.[name];
type RoundedCorner = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
const ELEMENT_PARSERS: Record<string, ShapeParser> = {};

/** Style properties retained from an SVG element or its ancestors. */
export interface SVGStyle {
  /** Fill paint value. */
  readonly fill?: string;
  /** Effective fill opacity. */
  readonly fillOpacity?: number;
  /** Fill winding rule. */
  readonly fillRule?: "nonzero" | "evenodd" | string;
  /** Effective inherited opacity. */
  readonly opacity?: number;
  /** Stroke paint value. */
  readonly stroke?: string;
  /** Effective stroke opacity. */
  readonly strokeOpacity?: number;
  /** Stroke width in source units. */
  readonly strokeWidth?: number;
  /** Visibility presentation value. */
  readonly visibility?: string;
}

/** Source metadata attached to each parsed SVG `ShapePath`. */
export interface SVGPathMetadata {
  /** SVG element name which produced this path. */
  readonly element: string;
  /** Original element attributes, excluding inherited styles. */
  readonly attributes: Readonly<SVGAttributes>;
  /** Effective style after inheriting the enclosing groups. */
  readonly style: SVGStyle;
  /** Column-major 2D transform baked into the path. */
  readonly transform: readonly number[];
  /** Original element source, useful for diagnostics and DOM adapters. */
  readonly source: string;
}

/** Parsed SVG paths ready for ShapeGeometry or SVGRenderer output. */
export interface SVGLoaderResult {
  /** Source paths in document order. */
  readonly paths: ShapePath[];
  /** Original XML source, retained for DOM/SVG comparison workflows. */
  readonly xml: string;
}

interface MutableSVGStyle {
  fill?: string;
  fillOpacity?: number;
  fillRule?: string;
  opacity?: number;
  stroke?: string;
  strokeOpacity?: number;
  strokeWidth?: number;
  visibility?: string;
}

interface ParseContext {
  element: string;
  attributes: SVGAttributes;
  style: MutableSVGStyle;
  transform: Matrix3;
  defs: boolean;
}

/**
 * CPU SVG loader for Canvas2D and DOM/SVG examples.
 *
 * The parser intentionally has no DOM dependency. It handles the same basic
 * shape vocabulary used by THREE.SVGLoader (`path`, `rect`, `circle`,
 * `ellipse`, `line`, `polyline`, and `polygon`), inherited presentation/style
 * attributes, and common affine transform lists. Paths are transformed into
 * CPU curve data before being handed to ShapeGeometry or a renderer.
 */
export class SVGLoader extends Loader {
  /** Default CSS pixel unit used by this DOM-free parser. */
  readonly defaultUnit = "px";
  /** Parses supported SVG elements in document order without a DOM. */
  override parse(text: string): SVGLoaderResult {
    if (typeof text !== "string")
      throw new TypeError("SVGLoader.parse requires SVG text");
    return { paths: parseDocument(text), xml: text };
  }

  /** Loads SVG text through fetch and completes the LoadingManager lifecycle. */
  override load(
    url: string,
    onLoad?: (result: SVGLoaderResult) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (error: unknown) => void,
  ): void {
    const request = `${this.path}${url}`;
    fetch(request, {
      headers: this.requestHeader,
      credentials: this.withCredentials ? "include" : "same-origin",
    })
      .then((response) => {
        if (!response.ok)
          throw new Error(
            `SVGLoader failed to load ${request}: ${response.status}`,
          );
        return response.text();
      })
      .then((source) => onLoad?.(this.parse(source)))
      .catch((error: unknown) => onError?.(error));
    void onProgress;
  }
}

function parseDocument(text: string): ShapePath[] {
  const paths: ShapePath[] = [],
    stack: ParseContext[] = [
      {
        element: "",
        attributes: {},
        style: {},
        transform: new Matrix3(),
        defs: false,
      },
    ];
  for (const token of text.matchAll(RE_TOKEN))
    processToken(token[0] ?? "", stack, paths);
  return paths;
}
function processToken(
  source: string,
  stack: ParseContext[],
  paths: ShapePath[],
): void {
  if (source.startsWith("<!--") || source.startsWith("<?")) return;
  if (RE_CLOSING_TAG.exec(source)) {
    if (stack.length > 1) stack.pop();
    return;
  }
  const opening = RE_OPENING_TAG.exec(source);
  if (!opening) return;
  const context = createContext(stack.at(-1) ?? stack[0], opening);
  if (!context.defs) addParsedPath(paths, context, source);
  if (group(opening, "selfClose") !== "/") stack.push(context);
}
function createContext(
  parent: ParseContext,
  opening: RegExpMatchArray,
): ParseContext {
  const element = group(opening, "name")?.toLowerCase() ?? "",
    attributes = readAttributes(group(opening, "attrs") ?? ""),
    transform = parent.transform.clone();
  if (attributes.transform)
    transform.multiply(parseTransformList(attributes.transform));
  return {
    element,
    attributes,
    style: mergeStyle(parent.style, attributes),
    transform,
    defs: parent.defs || element === "defs",
  };
}
function addParsedPath(
  paths: ShapePath[],
  context: ParseContext,
  source: string,
): void {
  const path = parseElement(context.element, context.attributes);
  if (!path) return;
  bakeTransform(path, context.transform);
  attachMetadata(path, {
    element: context.element,
    attributes: context.attributes,
    style: context.style,
    transform: context.transform,
    source,
  });
  paths.push(path);
}
function parsePath(attributes: SVGAttributes): ShapePath | undefined {
  if (!attributes.d || attributes.d === "none") return;
  return parseSVGPath(attributes.d);
}
const parseElement = (
  element: string,
  attributes: SVGAttributes,
): ShapePath | undefined => ELEMENT_PARSERS[element]?.(attributes);
const parseCircle = (attributes: SVGAttributes): ShapePath | undefined =>
  parseEllipse(attributes, false);
const parseEllipseElement = (
  attributes: SVGAttributes,
): ShapePath | undefined => parseEllipse(attributes, true);
const parsePolyline = (attributes: SVGAttributes): ShapePath | undefined =>
  parsePoints(attributes.points ?? "", false);
const parsePolygon = (attributes: SVGAttributes): ShapePath | undefined =>
  parsePoints(attributes.points ?? "", true);
function parseRect(attributes: SVGAttributes): ShapePath | undefined {
  const x = number(attributes.x),
    y = number(attributes.y),
    width = number(attributes.width),
    height = number(attributes.height);
  if (!(width > 0 && height > 0)) return;
  const rx = Math.min(
      Math.abs(number(attributes.rx ?? attributes.ry)),
      width / 2,
    ),
    ry = Math.min(Math.abs(number(attributes.ry ?? attributes.rx)), height / 2),
    path = new ShapePathBuilder(),
    k = 0.5522847498307936;
  path.moveTo(x + rx, y);
  path.lineTo(x + width - rx, y);
  addCorner(path, [
    x + width - rx,
    y,
    x + width - rx + rx * k,
    y,
    x + width,
    y + ry - ry * k,
    x + width,
    y + ry,
  ]);
  path.lineTo(x + width, y + height - ry);
  addCorner(path, [
    x + width,
    y + height - ry,
    x + width,
    y + height - ry + ry * k,
    x + width - rx + rx * k,
    y + height,
    x + width - rx,
    y + height,
  ]);
  path.lineTo(x + rx, y + height);
  addCorner(path, [
    x + rx,
    y + height,
    x + rx - rx * k,
    y + height,
    x,
    y + height - ry + ry * k,
    x,
    y + height - ry,
  ]);
  path.lineTo(x, y + ry);
  addCorner(path, [
    x,
    y + ry,
    x,
    y + ry - ry * k,
    x + rx - rx * k,
    y,
    x + rx,
    y,
  ]);
  path.currentPath?.closePath();
  return path;
}
const addCorner = (path: ShapePath, corner: RoundedCorner): void => {
  if (corner[0] !== corner[6] || corner[1] !== corner[7])
    path.bezierCurveTo(
      corner[2],
      corner[3],
      corner[4],
      corner[5],
      corner[6],
      corner[7],
    );
};
function parseEllipse(
  attributes: SVGAttributes,
  ellipse: boolean,
): ShapePath | undefined {
  const cx = number(attributes.cx),
    cy = number(attributes.cy),
    rx = number(attributes[ellipse ? "rx" : "r"]),
    ry = ellipse ? number(attributes.ry) : rx;
  if (!(rx > 0 && ry > 0)) return;
  const subPath = new Path();
  subPath.absellipse(cx, cy, rx, ry);
  const path = new ShapePathBuilder();
  path.subPaths = [subPath];
  return path;
}
const parseLine = (attributes: SVGAttributes): ShapePath => {
  const path = new ShapePathBuilder();
  path.moveTo(number(attributes.x1), number(attributes.y1));
  path.lineTo(number(attributes.x2), number(attributes.y2));
  return path;
};
function parsePoints(points: string, closed: boolean): ShapePath | undefined {
  const values = points.match(RE_NUMBER)?.map(Number) ?? [];
  if (values.length < 4) return;
  const path = new ShapePathBuilder();
  path.moveTo(values[0] ?? 0, values[1] ?? 0);
  for (let index = 2; index + 1 < values.length; index += 2)
    path.lineTo(values[index] ?? 0, values[index + 1] ?? 0);
  if (closed) path.currentPath?.closePath();
  return path;
}
Object.assign(ELEMENT_PARSERS, {
  path: parsePath,
  rect: parseRect,
  circle: parseCircle,
  ellipse: parseEllipseElement,
  line: parseLine,
  polyline: parsePolyline,
  polygon: parsePolygon,
});

function attachMetadata(
  path: ShapePath,
  options: {
    element: string;
    attributes: SVGAttributes;
    style: MutableSVGStyle;
    transform: Matrix3;
    source: string;
  },
): void {
  const style = Object.freeze({ ...options.style }) as SVGStyle;
  Object.assign(
    path.userData,
    {
      element: options.element,
      attributes: Object.freeze({ ...options.attributes }),
      style,
      transform: Array.from(options.transform.elements),
      source: options.source,
      opacity: options.style.opacity ?? 1,
      fillOpacity: options.style.fillOpacity ?? 1,
      strokeOpacity: options.style.strokeOpacity ?? 1,
    },
    options.style.fill === undefined ? {} : { fill: options.style.fill },
    options.style.stroke === undefined ? {} : { stroke: options.style.stroke },
    options.style.fillRule === undefined
      ? {}
      : { fillRule: options.style.fillRule },
  );
  applyFillColor(path, options.style.fill);
}

function applyFillColor(path: ShapePath, fill: string | undefined): void {
  if (!fill || fill === "none") return;
  try {
    path.color.copy(new Color(fill));
  } catch {
    // CSS named colors and URL paints remain available through metadata.
  }
}

function mergeStyle(
  parent: MutableSVGStyle,
  attributes: SVGAttributes,
): MutableSVGStyle {
  const style: MutableSVGStyle = { ...parent },
    values = { ...attributes, ...parseStyleAttribute(attributes.style) };
  if (values.fill !== undefined) style.fill = values.fill;
  if (values.stroke !== undefined) style.stroke = values.stroke;
  if (values["fill-rule"] !== undefined) style.fillRule = values["fill-rule"];
  if (values.visibility !== undefined) style.visibility = values.visibility;
  if (values["stroke-width"] !== undefined)
    style.strokeWidth = number(values["stroke-width"]);
  style.opacity = multiplyOpacity(parent.opacity, values.opacity);
  style.fillOpacity = multiplyOpacity(
    parent.fillOpacity,
    values["fill-opacity"],
  );
  style.strokeOpacity = multiplyOpacity(
    parent.strokeOpacity,
    values["stroke-opacity"],
  );
  return style;
}

function parseStyleAttribute(source: string | undefined): SVGAttributes {
  const result: SVGAttributes = {};
  for (const declaration of (source ?? "").split(";")) {
    const separator = declaration.indexOf(":");
    if (separator < 0) continue;
    const key = declaration.slice(0, separator).trim().toLowerCase(),
      value = declaration.slice(separator + 1).trim();
    if (key && value) result[key] = value;
  }
  return result;
}

const multiplyOpacity = (
  parent: number | undefined,
  value: string | undefined,
): number => (parent ?? 1) * (value === undefined ? 1 : clampOpacity(value));
const clampOpacity = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 1;
};
const number = (value: string | undefined): number => {
  const parsed = Number.parseFloat(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
};

function parseTransformList(source: string): Matrix3 {
  const result = new Matrix3();
  for (const match of source.matchAll(RE_TRANSFORM)) {
    const type = group(match, "type")?.toLowerCase();
    const values = group(match, "args")?.match(RE_NUMBER)?.map(Number) ?? [];
    const next = type ? makeTransform(type, values) : undefined;
    if (next) result.multiply(next);
  }
  return result;
}

function makeTransform(type: string, values: number[]): Matrix3 | undefined {
  switch (type) {
    case "matrix":
      return values.length >= 6 ? matrixTransform(values) : undefined;
    case "translate":
      return new Matrix3().makeTranslation(values[0] ?? 0, values[1] ?? 0);
    case "scale":
      return new Matrix3().makeScale(
        values[0] ?? 1,
        values[1] ?? values[0] ?? 1,
      );
    case "rotate":
      return rotateTransform(values);
    case "skewx":
      return skewTransform(values[0] ?? 0, true);
    case "skewy":
      return skewTransform(values[0] ?? 0, false);
    default:
      return;
  }
}

const matrixTransform = (values: number[]): Matrix3 =>
  new Matrix3().fromArray([
    values[0] ?? 1,
    values[1] ?? 0,
    0,
    values[2] ?? 0,
    values[3] ?? 1,
    0,
    values[4] ?? 0,
    values[5] ?? 0,
    1,
  ]);

function rotateTransform(values: number[]): Matrix3 {
  const rotation = new Matrix3().makeRotation(
    ((values[0] ?? 0) * Math.PI) / 180,
  );
  if (values.length < 3) return rotation;
  const x = values[1] ?? 0,
    y = values[2] ?? 0;
  return new Matrix3()
    .makeTranslation(x, y)
    .multiply(rotation)
    .multiply(new Matrix3().makeTranslation(-x, -y));
}

const skewTransform = (degrees: number, xAxis: boolean): Matrix3 => {
  const skew = Math.tan((degrees * Math.PI) / 180);
  return new Matrix3().fromArray(
    xAxis ? [1, 0, 0, skew, 1, 0, 0, 0, 1] : [1, skew, 0, 0, 1, 0, 0, 0, 1],
  );
};

function bakeTransform(path: ShapePath, matrix: Matrix3): void {
  if (matrix.equals(new Matrix3())) return;
  for (const subPath of path.subPaths) {
    subPath.curves = subPath.curves.flatMap((curve) =>
      transformCurve(curve, matrix),
    );
    subPath.currentPoint.applyMatrix3(matrix);
  }
}

function transformCurve(curve: Curve, matrix: Matrix3): Curve[] {
  if (curve instanceof LineCurve)
    return [
      new LineCurve(
        transformPoint(curve.v1, matrix),
        transformPoint(curve.v2, matrix),
      ),
    ];
  if (curve instanceof QuadraticBezierCurve)
    return [
      new QuadraticBezierCurve(
        transformPoint(curve.v0, matrix),
        transformPoint(curve.v1, matrix),
        transformPoint(curve.v2, matrix),
      ),
    ];
  if (curve instanceof CubicBezierCurve)
    return [
      new CubicBezierCurve(
        transformPoint(curve.v0, matrix),
        transformPoint(curve.v1, matrix),
        transformPoint(curve.v2, matrix),
        transformPoint(curve.v3, matrix),
      ),
    ];
  return sampleCurve(curve, matrix);
}

function sampleCurve(curve: Curve, matrix: Matrix3): Curve[] {
  const points = curve
    .getPoints(16)
    .filter((point): point is Vector2 => point !== undefined)
    .map((point) => transformPoint(point, matrix));
  const transformed: Curve[] = [];
  for (let index = 1; index < points.length; index++) {
    const start = points[index - 1],
      end = points[index];
    if (start && end) transformed.push(new LineCurve(start, end));
  }
  return transformed;
}

const transformPoint = (
  point: { x: number; y: number },
  matrix: Matrix3,
): Vector2 => new Vector2(point.x, point.y).applyMatrix3(matrix);

function readAttributes(source: string): SVGAttributes {
  const attributes: SVGAttributes = {};
  for (const match of source.matchAll(RE_ATTRIBUTE)) {
    const key = group(match, "key")?.toLowerCase(),
      value = group(match, "value");
    if (key && value !== undefined) attributes[key] = value;
  }
  return attributes;
}
