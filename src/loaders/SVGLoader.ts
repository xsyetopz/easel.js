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
  readonly attributes: Readonly<Record<string, string>>;
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
  parse(text: string): SVGLoaderResult {
    if (typeof text !== "string")
      throw new TypeError("SVGLoader.parse requires SVG text");

    const paths: ShapePath[] = [];
    const stack: ParseContext[] = [
      { style: {}, transform: new Matrix3(), defs: false },
    ];
    const tokenPattern = /<!--[\s\S]*?-->|<[^>]+>/gu;
    for (const token of text.matchAll(tokenPattern)) {
      const source = token[0] ?? "";
      if (source.startsWith("<!--") || source.startsWith("<?")) continue;
      const closing = /^<\s*\/\s*([\w:-]+)/u.exec(source);
      if (closing) {
        if (stack.length > 1) stack.pop();
        continue;
      }
      const opening = /^<\s*([\w:-]+)\b([\s\S]*?)(\/?)\s*>$/u.exec(source);
      if (!opening) continue;
      const element = opening[1]?.toLowerCase() ?? "";
      const attributes = readAttributes(opening[2] ?? "");
      const parent = stack.at(-1) ?? {
        style: {},
        transform: new Matrix3(),
        defs: false,
      };
      const style = mergeStyle(parent.style, attributes);
      const transform = parent.transform.clone();
      if (attributes["transform"])
        transform.multiply(parseTransformList(attributes["transform"]));
      const defs = parent.defs || element === "defs";
      const context: ParseContext = { style, transform, defs };

      if (!defs) {
        const path = parseElement(element, attributes);
        if (path) {
          bakeTransform(path, transform);
          attachMetadata(path, element, attributes, style, transform, source);
          paths.push(path);
        }
      }

      if (opening[3] !== "/") stack.push(context);
    }
    return { paths, xml: text };
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

function parseElement(
  element: string,
  attributes: Record<string, string>,
): ShapePath | undefined {
  switch (element) {
    case "path":
      if (!attributes["d"] || attributes["d"] === "none") return;
      return parseSVGPath(attributes["d"]);
    case "rect":
      return parseRect(attributes);
    case "circle":
      return parseEllipse(attributes, false);
    case "ellipse":
      return parseEllipse(attributes, true);
    case "line":
      return parseLine(attributes);
    case "polyline":
      return parsePoints(attributes["points"] ?? "", false);
    case "polygon":
      return parsePoints(attributes["points"] ?? "", true);
    default:
      return;
  }
}

function parseRect(attributes: Record<string, string>): ShapePath | undefined {
  const x = number(attributes["x"]);
  const y = number(attributes["y"]);
  const width = number(attributes["width"]);
  const height = number(attributes["height"]);
  if (!(width > 0 && height > 0)) return;
  const rx = Math.min(
    Math.abs(number(attributes["rx"] ?? attributes["ry"])),
    width / 2,
  );
  const ry = Math.min(
    Math.abs(number(attributes["ry"] ?? attributes["rx"])),
    height / 2,
  );
  const path = new ShapePathBuilder();
  const k = 0.5522847498307936;
  path.moveTo(x + rx, y);
  path.lineTo(x + width - rx, y);
  if (rx || ry)
    path.bezierCurveTo(
      x + width - rx + rx * k,
      y,
      x + width,
      y + ry - ry * k,
      x + width,
      y + ry,
    );
  path.lineTo(x + width, y + height - ry);
  if (rx || ry)
    path.bezierCurveTo(
      x + width,
      y + height - ry + ry * k,
      x + width - rx + rx * k,
      y + height,
      x + width - rx,
      y + height,
    );
  path.lineTo(x + rx, y + height);
  if (rx || ry)
    path.bezierCurveTo(
      x + rx - rx * k,
      y + height,
      x,
      y + height - ry + ry * k,
      x,
      y + height - ry,
    );
  path.lineTo(x, y + ry);
  if (rx || ry)
    path.bezierCurveTo(x, y + ry - ry * k, x + rx - rx * k, y, x + rx, y);
  path.currentPath?.closePath();
  return path;
}

function parseEllipse(
  attributes: Record<string, string>,
  ellipse: boolean,
): ShapePath | undefined {
  const cx = number(attributes["cx"]);
  const cy = number(attributes["cy"]);
  const rx = number(attributes[ellipse ? "rx" : "r"]);
  const ry = ellipse ? number(attributes["ry"]) : rx;
  if (!(rx > 0 && ry > 0)) return;
  const subPath = new Path();
  subPath.absellipse(cx, cy, rx, ry);
  const path = new ShapePathBuilder();
  path.subPaths = [subPath];
  return path;
}

function parseLine(attributes: Record<string, string>): ShapePath {
  const path = new ShapePathBuilder();
  path.moveTo(number(attributes["x1"]), number(attributes["y1"]));
  path.lineTo(number(attributes["x2"]), number(attributes["y2"]));
  return path;
}

function parsePoints(points: string, closed: boolean): ShapePath | undefined {
  const values =
    points.match(/[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/gu)?.map(Number) ??
    [];
  if (values.length < 4) return;
  const path = new ShapePathBuilder();
  path.moveTo(values[0] ?? 0, values[1] ?? 0);
  for (let index = 2; index + 1 < values.length; index += 2)
    path.lineTo(values[index] ?? 0, values[index + 1] ?? 0);
  if (closed) path.currentPath?.closePath();
  return path;
}

function attachMetadata(
  path: ShapePath,
  element: string,
  attributes: Record<string, string>,
  style: MutableSVGStyle,
  transform: Matrix3,
  source: string,
): void {
  const normalizedStyle = Object.freeze({ ...style }) as SVGStyle;
  const metadata: SVGPathMetadata = {
    element,
    attributes: Object.freeze({ ...attributes }),
    style: normalizedStyle,
    transform: Array.from(transform.elements),
    source,
  };
  path.userData["element"] = element;
  path.userData["attributes"] = metadata.attributes;
  path.userData["style"] = normalizedStyle;
  path.userData["transform"] = metadata.transform;
  path.userData["source"] = source;
  // Keep the original shorthand fields for existing EASEL examples.
  if (style.fill !== undefined) path.userData["fill"] = style.fill;
  if (style.stroke !== undefined) path.userData["stroke"] = style.stroke;
  path.userData["opacity"] = style.opacity ?? 1;
  path.userData["fillOpacity"] = style.fillOpacity ?? 1;
  path.userData["strokeOpacity"] = style.strokeOpacity ?? 1;
  if (style.fill && style.fill !== "none") {
    try {
      path.color.copy(new Color(style.fill));
    } catch {
      // CSS named colors and URL paints remain available through metadata.
    }
  }
  if (style.fillRule) path.userData["fillRule"] = style.fillRule;
}

function mergeStyle(
  parent: MutableSVGStyle,
  attributes: Record<string, string>,
): MutableSVGStyle {
  const style: MutableSVGStyle = { ...parent };
  const declarations = parseStyleAttribute(attributes["style"]);
  const values = { ...attributes, ...declarations };
  if (values["fill"] !== undefined) style.fill = values["fill"];
  if (values["stroke"] !== undefined) style.stroke = values["stroke"];
  if (values["fill-rule"] !== undefined) style.fillRule = values["fill-rule"];
  if (values["visibility"] !== undefined)
    style.visibility = values["visibility"];
  if (values["stroke-width"] !== undefined)
    style.strokeWidth = number(values["stroke-width"]);
  style.opacity = multiplyOpacity(parent.opacity, values["opacity"]);
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

function parseStyleAttribute(
  source: string | undefined,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const declaration of (source ?? "").split(";")) {
    const separator = declaration.indexOf(":");
    if (separator < 0) continue;
    const key = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();
    if (key && value) result[key] = value;
  }
  return result;
}

function multiplyOpacity(
  parent: number | undefined,
  value: string | undefined,
): number {
  const local = value === undefined ? 1 : clampOpacity(value);
  return (parent ?? 1) * local;
}

function clampOpacity(value: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(0, Math.min(1, parsed));
}

function number(value: string | undefined): number {
  const parsed = Number.parseFloat(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseTransformList(source: string): Matrix3 {
  const result = new Matrix3();
  const pattern = /([a-z]+)\s*\(([^)]*)\)/giu;
  for (const match of source.matchAll(pattern)) {
    const type = match[1]?.toLowerCase();
    const values =
      match[2]
        ?.match(/[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/gu)
        ?.map(Number) ?? [];
    const next = new Matrix3();
    if (type === "matrix" && values.length >= 6) {
      next.fromArray([
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
    } else if (type === "translate") {
      next.makeTranslation(values[0] ?? 0, values[1] ?? 0);
    } else if (type === "scale") {
      next.makeScale(values[0] ?? 1, values[1] ?? values[0] ?? 1);
    } else if (type === "rotate") {
      const angle = ((values[0] ?? 0) * Math.PI) / 180;
      const rotation = new Matrix3().makeRotation(angle);
      if (values.length >= 3) {
        const pivot = new Matrix3().makeTranslation(
          values[1] ?? 0,
          values[2] ?? 0,
        );
        const inverse = new Matrix3().makeTranslation(
          -(values[1] ?? 0),
          -(values[2] ?? 0),
        );
        next.copy(pivot).multiply(rotation).multiply(inverse);
      } else next.copy(rotation);
    } else if (type === "skewx") {
      next.fromArray([
        1,
        0,
        0,
        Math.tan(((values[0] ?? 0) * Math.PI) / 180),
        1,
        0,
        0,
        0,
        1,
      ]);
    } else if (type === "skewy") {
      next.fromArray([
        1,
        Math.tan(((values[0] ?? 0) * Math.PI) / 180),
        0,
        0,
        1,
        0,
        0,
        0,
        1,
      ]);
    } else continue;
    result.multiply(next);
  }
  return result;
}

function bakeTransform(path: ShapePath, matrix: Matrix3): void {
  if (matrix.equals(new Matrix3())) return;
  for (const subPath of path.subPaths) {
    const transformed: Curve[] = [];
    for (const curve of subPath.curves) {
      if (curve instanceof LineCurve) {
        transformed.push(
          new LineCurve(
            transformPoint(curve.v1, matrix),
            transformPoint(curve.v2, matrix),
          ),
        );
      } else if (curve instanceof QuadraticBezierCurve) {
        transformed.push(
          new QuadraticBezierCurve(
            transformPoint(curve.v0, matrix),
            transformPoint(curve.v1, matrix),
            transformPoint(curve.v2, matrix),
          ),
        );
      } else if (curve instanceof CubicBezierCurve) {
        transformed.push(
          new CubicBezierCurve(
            transformPoint(curve.v0, matrix),
            transformPoint(curve.v1, matrix),
            transformPoint(curve.v2, matrix),
            transformPoint(curve.v3, matrix),
          ),
        );
      } else {
        const points = curve
          .getPoints(16)
          .filter((point): point is Vector2 => Boolean(point))
          .map((point) => transformPoint(point, matrix));
        for (let index = 1; index < points.length; index++)
          transformed.push(new LineCurve(points[index - 1]!, points[index]!));
      }
    }
    subPath.curves = transformed;
    subPath.currentPoint.applyMatrix3(matrix);
  }
}

function transformPoint(
  point: { x: number; y: number },
  matrix: Matrix3,
): Vector2 {
  return new Vector2(point.x, point.y).applyMatrix3(matrix);
}

function readAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const pattern = /([:\w-]+)\s*=\s*["']([^"']*)["']/gu;
  for (const match of source.matchAll(pattern)) {
    const key = match[1]?.toLowerCase();
    if (key && match[2] !== undefined) attributes[key] = match[2];
  }
  return attributes;
}
