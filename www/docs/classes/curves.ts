import type { DocEntry } from "../types.ts";

export const curveDocs = [
  {
    id: "Curve",
    name: "Curve",
    category: "Curves",
    signature: "new Curve()",
    description:
      "Abstract base class for parametric curves. Subclasses implement getPoint(t) to define the curve shape.",
    properties: [
      {
        name: "arcLengthDivisions",
        type: "number",
        description:
          "Number of subdivisions for arc-length parameterization. Default 200.",
      },
    ],
    methods: [
      {
        name: "getPoint",
        signature: "getPoint(t: number, target?): Vector2|Vector3",
        description:
          "Returns the point at parameter t in [0, 1]. Abstract - must be overridden.",
      },
      {
        name: "getPointAt",
        signature: "getPointAt(u: number, target?): Vector2|Vector3",
        description: "Returns the point at arc-length fraction u in [0, 1].",
      },
      {
        name: "getPoints",
        signature: "getPoints(divisions?: number): Array",
        description:
          "Returns an array of equi-parameter points along the curve.",
      },
      {
        name: "getSpacedPoints",
        signature: "getSpacedPoints(divisions?: number): Array",
        description: "Returns an array of equidistant points along the curve.",
      },
      {
        name: "getLength",
        signature: "getLength(): number",
        description: "Returns the total arc length of the curve.",
      },
      {
        name: "getTangent",
        signature: "getTangent(t: number, target?): Vector2|Vector3",
        description:
          "Returns the unit tangent at parameter t via finite difference.",
      },
      {
        name: "clone",
        signature: "clone(): Curve",
        description: "Returns a copy of this curve.",
      },
    ],
  },
  {
    id: "CurvePath",
    name: "CurvePath",
    category: "Curves",
    signature: "new CurvePath()",
    description:
      "Sequence of connected curves that can be sampled as a single path. Optionally auto-closes.",
    properties: [
      {
        name: "curves",
        type: "Curve[]",
        description: "The individual curves in order.",
      },
      {
        name: "autoClose",
        type: "boolean",
        description:
          "When true, a closing line segment is added from the last point to the first.",
      },
    ],
    methods: [
      {
        name: "add",
        signature: "add(curve: Curve): void",
        description: "Appends a curve to the path.",
      },
      {
        name: "closePath",
        signature: "closePath(): void",
        description:
          "Adds a LineCurve from the last point back to the first if not already closed.",
      },
      {
        name: "getPoint",
        signature: "getPoint(t: number, target?): Vector2|Vector3",
        description: "Returns the point at parameter t across the full path.",
      },
    ],
  },
  {
    id: "Path",
    name: "Path",
    category: "Curves",
    signature: "new Path(points?: Vector2[])",
    description:
      "2D path built from move/line/arc/bezier commands. Extends CurvePath with drawing-style API.",
    properties: [
      {
        name: "currentPoint",
        type: "Vector2",
        description: "The current pen position.",
      },
    ],
    methods: [
      {
        name: "moveTo",
        signature: "moveTo(x: number, y: number): this",
        description: "Moves the pen without drawing.",
      },
      {
        name: "lineTo",
        signature: "lineTo(x: number, y: number): this",
        description: "Draws a line segment to (x, y).",
      },
      {
        name: "quadraticCurveTo",
        signature:
          "quadraticCurveTo(cpX: number, cpY: number, x: number, y: number): this",
        description: "Draws a quadratic Bezier curve.",
      },
      {
        name: "bezierCurveTo",
        signature:
          "bezierCurveTo(cp1X: number, cp1Y: number, cp2X: number, cp2Y: number, x: number, y: number): this",
        description: "Draws a cubic Bezier curve.",
      },
      {
        name: "arc",
        signature:
          "arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, clockwise?: boolean): this",
        description: "Draws a circular arc relative to the current point.",
      },
      {
        name: "ellipse",
        signature:
          "ellipse(x: number, y: number, xR: number, yR: number, startAngle: number, endAngle: number, clockwise?: boolean, rotation?: number): this",
        description: "Draws an elliptical arc relative to the current point.",
      },
    ],
  },
  {
    id: "Shape",
    name: "Shape",
    category: "Curves",
    signature: "new Shape()",
    description:
      "2D shape with optional holes. Extends Path with hole support for use with ShapeGeometry and ExtrudeGeometry.",
    properties: [
      {
        name: "holes",
        type: "Path[]",
        description: "Array of hole paths subtracted from the shape.",
      },
    ],
    methods: [
      {
        name: "getPointsHoles",
        signature: "getPointsHoles(divisions: number): Vector2[][]",
        description: "Returns point arrays for each hole.",
      },
      {
        name: "extractPoints",
        signature:
          "extractPoints(divisions: number): { shape: Vector2[], holes: Vector2[][] }",
        description: "Returns points for the outer shape and all holes.",
      },
    ],
  },
  {
    id: "ShapePath",
    name: "ShapePath",
    category: "Curves",
    signature: "new ShapePath()",
    description:
      "Builds Shape instances from a sequence of move/line/bezier commands. Used by loaders to reconstruct shapes from serialized data.",
    properties: [],
    methods: [
      {
        name: "moveTo",
        signature: "moveTo(x: number, y: number): void",
        description: "Starts a new subpath.",
      },
      {
        name: "lineTo",
        signature: "lineTo(x: number, y: number): void",
        description: "Adds a line segment.",
      },
      {
        name: "toShapes",
        signature: "toShapes(): Shape[]",
        description: "Converts the accumulated subpaths into Shape instances.",
      },
    ],
  },
  {
    id: "EllipseCurve",
    name: "EllipseCurve",
    category: "Curves",
    signature:
      "new EllipseCurve(cx?, cy?, xRadius?, yRadius?, startAngle?, endAngle?, clockwise?, rotation?)",
    description: "2D ellipse or partial elliptical arc centered at (cx, cy).",
    properties: [
      { name: "cx", type: "number", description: "Center X." },
      { name: "cy", type: "number", description: "Center Y." },
      {
        name: "xRadius",
        type: "number",
        description: "Horizontal radius.",
      },
      {
        name: "yRadius",
        type: "number",
        description: "Vertical radius.",
      },
      {
        name: "startAngle",
        type: "number",
        description: "Start angle in radians.",
      },
      {
        name: "endAngle",
        type: "number",
        description: "End angle in radians.",
      },
      {
        name: "clockwise",
        type: "boolean",
        description: "Arc direction. Default false.",
      },
      {
        name: "rotation",
        type: "number",
        description: "Rotation of the ellipse in radians. Default 0.",
      },
    ],
    methods: [
      {
        name: "getPoint",
        signature: "getPoint(t: number, target?: Vector2): Vector2",
        description: "Returns the point at parameter t.",
      },
    ],
  },
  {
    id: "ArcCurve",
    name: "ArcCurve",
    category: "Curves",
    signature:
      "new ArcCurve(cx?, cy?, radius?, startAngle?, endAngle?, clockwise?)",
    description:
      "Circular arc. Shorthand for EllipseCurve with equal x/y radii.",
    properties: [],
    methods: [],
  },
  {
    id: "LineCurve",
    name: "LineCurve",
    category: "Curves",
    signature: "new LineCurve(v1?: Vector2, v2?: Vector2)",
    description: "2D line segment between two points.",
    properties: [
      { name: "v1", type: "Vector2", description: "Start point." },
      { name: "v2", type: "Vector2", description: "End point." },
    ],
    methods: [
      {
        name: "getPoint",
        signature: "getPoint(t: number, target?: Vector2): Vector2",
        description: "Returns the linearly interpolated point at t.",
      },
    ],
  },
  {
    id: "LineCurve3",
    name: "LineCurve3",
    category: "Curves",
    signature: "new LineCurve3(v1?: Vector3, v2?: Vector3)",
    description: "3D line segment between two points.",
    properties: [
      { name: "v1", type: "Vector3", description: "Start point." },
      { name: "v2", type: "Vector3", description: "End point." },
    ],
    methods: [
      {
        name: "getPoint",
        signature: "getPoint(t: number, target?: Vector3): Vector3",
        description: "Returns the linearly interpolated point at t.",
      },
    ],
  },
  {
    id: "QuadraticBezierCurve",
    name: "QuadraticBezierCurve",
    category: "Curves",
    signature:
      "new QuadraticBezierCurve(v0?: Vector2, v1?: Vector2, v2?: Vector2)",
    description: "2D quadratic Bezier curve with one control point.",
    properties: [
      { name: "v0", type: "Vector2", description: "Start point." },
      {
        name: "v1",
        type: "Vector2",
        description: "Control point.",
      },
      { name: "v2", type: "Vector2", description: "End point." },
    ],
    methods: [
      {
        name: "getPoint",
        signature: "getPoint(t: number, target?: Vector2): Vector2",
        description: "Returns the point at parameter t.",
      },
    ],
  },
  {
    id: "QuadraticBezierCurve3",
    name: "QuadraticBezierCurve3",
    category: "Curves",
    signature:
      "new QuadraticBezierCurve3(v0?: Vector3, v1?: Vector3, v2?: Vector3)",
    description: "3D quadratic Bezier curve with one control point.",
    properties: [
      { name: "v0", type: "Vector3", description: "Start point." },
      {
        name: "v1",
        type: "Vector3",
        description: "Control point.",
      },
      { name: "v2", type: "Vector3", description: "End point." },
    ],
    methods: [
      {
        name: "getPoint",
        signature: "getPoint(t: number, target?: Vector3): Vector3",
        description: "Returns the point at parameter t.",
      },
    ],
  },
  {
    id: "CubicBezierCurve",
    name: "CubicBezierCurve",
    category: "Curves",
    signature:
      "new CubicBezierCurve(v0?: Vector2, v1?: Vector2, v2?: Vector2, v3?: Vector2)",
    description: "2D cubic Bezier curve with two control points.",
    properties: [
      { name: "v0", type: "Vector2", description: "Start point." },
      {
        name: "v1",
        type: "Vector2",
        description: "First control point.",
      },
      {
        name: "v2",
        type: "Vector2",
        description: "Second control point.",
      },
      { name: "v3", type: "Vector2", description: "End point." },
    ],
    methods: [
      {
        name: "getPoint",
        signature: "getPoint(t: number, target?: Vector2): Vector2",
        description: "Returns the point at parameter t.",
      },
    ],
  },
  {
    id: "CubicBezierCurve3",
    name: "CubicBezierCurve3",
    category: "Curves",
    signature:
      "new CubicBezierCurve3(v0?: Vector3, v1?: Vector3, v2?: Vector3, v3?: Vector3)",
    description: "3D cubic Bezier curve with two control points.",
    properties: [
      { name: "v0", type: "Vector3", description: "Start point." },
      {
        name: "v1",
        type: "Vector3",
        description: "First control point.",
      },
      {
        name: "v2",
        type: "Vector3",
        description: "Second control point.",
      },
      { name: "v3", type: "Vector3", description: "End point." },
    ],
    methods: [
      {
        name: "getPoint",
        signature: "getPoint(t: number, target?: Vector3): Vector3",
        description: "Returns the point at parameter t.",
      },
    ],
  },
  {
    id: "CatmullRomCurve3",
    name: "CatmullRomCurve3",
    category: "Curves",
    signature:
      "new CatmullRomCurve3(points?: Vector3[], closed?, curveType?, tension?)",
    description:
      "3D Catmull-Rom spline through a set of control points. Supports centripetal, chordal, and catmullrom curve types.",
    properties: [
      {
        name: "points",
        type: "Vector3[]",
        description: "Control points the spline passes through.",
      },
      {
        name: "closed",
        type: "boolean",
        description: "Whether the curve loops. Default false.",
      },
      {
        name: "curveType",
        type: "string",
        description:
          "'centripetal', 'chordal', or 'catmullrom'. Default 'centripetal'.",
      },
      {
        name: "tension",
        type: "number",
        description: "Tension parameter for catmullrom type. Default 0.5.",
      },
    ],
    methods: [
      {
        name: "getPoint",
        signature: "getPoint(t: number, target?: Vector3): Vector3",
        description: "Returns the point at parameter t.",
      },
    ],
  },
  {
    id: "SplineCurve",
    name: "SplineCurve",
    category: "Curves",
    signature: "new SplineCurve(points?: Vector2[])",
    description: "2D Catmull-Rom spline through a set of points.",
    properties: [
      {
        name: "points",
        type: "Vector2[]",
        description: "Control points the spline passes through.",
      },
    ],
    methods: [
      {
        name: "getPoint",
        signature: "getPoint(t: number, target?: Vector2): Vector2",
        description: "Returns the point at parameter t.",
      },
    ],
  },
] satisfies DocEntry[];
