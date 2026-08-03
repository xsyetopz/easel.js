import type { DocEntry } from "../types.ts";

export const mathDocs = [
  {
    id: "Vector3",
    name: "Vector3",
    category: "Math",
    signature: "new Vector3(x?, y?, z?)",
    description:
      "Three-component vector used for positions, directions, and scales. All mutation methods return this for chaining.",
    properties: [
      { name: "x", type: "number", description: "X component." },
      { name: "y", type: "number", description: "Y component." },
      { name: "z", type: "number", description: "Z component." },
      {
        name: "length",
        type: "number",
        description: "Euclidean length (read-only).",
      },
      {
        name: "lengthSq",
        type: "number",
        description: "Squared length (read-only, avoids sqrt).",
      },
    ],
    methods: [
      {
        name: "set",
        signature: "set(x: number, y: number, z: number): this",
        description: "Sets all three components.",
      },
      {
        name: "add",
        signature: "add(v: Vector3): this",
        description: "Adds another vector in place.",
      },
      {
        name: "sub",
        signature: "sub(v: Vector3): this",
        description: "Subtracts another vector in place.",
      },
      {
        name: "mul",
        signature: "mul(v: Vector3): this",
        description: "Component-wise multiplication.",
      },
      {
        name: "mulScalar",
        signature: "mulScalar(s: number): this",
        description: "Multiplies all components by a scalar.",
      },
      {
        name: "cross",
        signature: "cross(v: Vector3): this",
        description: "Sets this to the cross product of this and v.",
      },
      {
        name: "dot",
        signature: "dot(v: Vector3): number",
        description: "Returns the dot product with v.",
      },
      {
        name: "normalize",
        signature: "normalize(): this",
        description: "Scales the vector to unit length.",
      },
      {
        name: "distanceTo",
        signature: "distanceTo(v: Vector3): number",
        description: "Returns the Euclidean distance to v.",
      },
      {
        name: "applyMatrix4",
        signature: "applyMatrix4(m: Matrix4): this",
        description: "Transforms this point by a 4x4 matrix (w = 1).",
      },
      {
        name: "clone",
        signature: "clone(): Vector3",
        description: "Returns a new Vector3 with the same components.",
      },
      {
        name: "copy",
        signature: "copy(v: Vector3): this",
        description: "Copies components from another vector.",
      },
    ],
  },
  {
    id: "Color",
    name: "Color",
    category: "Math",
    signature: "new Color(color?)",
    description:
      "RGB color stored as linear floats (0–1). Accepts a hex number, CSS string, or another Color. Use Color for renderer input and output; HSL16 packing is available through MathUtils.",
    properties: [
      { name: "r", type: "number", description: "Red channel, 0–1." },
      { name: "g", type: "number", description: "Green channel, 0–1." },
      { name: "b", type: "number", description: "Blue channel, 0–1." },
      {
        name: "hex",
        type: "number",
        description: "Packed 24-bit integer (read-only).",
      },
      {
        name: "hexString",
        type: "string",
        description: "#rrggbb CSS string (read-only).",
      },
      {
        name: "hsl",
        type: "{ h, s, l }",
        description:
          "HSL representation with all components normalised to 0–1 (read-only).",
      },
    ],
    methods: [
      {
        name: "set",
        signature: "set(...args): this",
        description:
          "Sets the color from a hex number, CSS string, or r/g/b triplet.",
      },
      {
        name: "setHSL",
        signature: "setHSL(h: number, s: number, l: number): this",
        description: "Sets from normalised HSL values (0–1).",
      },
      {
        name: "copy",
        signature: "copy(color: Color): this",
        description: "Copies r/g/b from another Color.",
      },
      {
        name: "clone",
        signature: "clone(): Color",
        description: "Returns a new Color with the same values.",
      },
      {
        name: "toRGB",
        signature: "Color.toRGB(color: ColorValue): { r, g, b }",
        description:
          "Static helper. Returns 0–255 integer RGB for any ColorValue.",
      },
      {
        name: "fromHsl16",
        signature: "Color.fromHsl16(value: number): Color",
        description:
          "Static helper. Creates a Color from a packed HSL16 integer.",
      },
    ],
  },
  {
    id: "Matrix4",
    name: "Matrix4",
    category: "Math",
    signature: "new Matrix4(elements?)",
    description:
      "Column-major 4x4 matrix backed by a Float32Array. Initialises to identity when called with no arguments.",
    properties: [
      {
        name: "elements",
        type: "Float32Array",
        description:
          "Flat 16-element column-major storage (read-only accessor).",
      },
    ],
    methods: [
      {
        name: "identity",
        signature: "identity(): this",
        description: "Resets to the identity matrix.",
      },
      {
        name: "copy",
        signature: "copy(m: Matrix4): this",
        description: "Copies elements from another Matrix4.",
      },
      {
        name: "clone",
        signature: "clone(): Matrix4",
        description: "Returns a new Matrix4 with the same elements.",
      },
      {
        name: "compose",
        signature:
          "compose(position: Vector3, q: Quaternion, scale: Vector3): this",
        description:
          "Builds a TRS matrix from position, quaternion, and scale.",
      },
      {
        name: "decompose",
        signature:
          "decompose(position: Vector3, q: Quaternion, scale: Vector3): this",
        description:
          "Extracts position, quaternion, and scale from this matrix.",
      },
      {
        name: "invert",
        signature: "invert(): this",
        description: "Inverts the matrix in place.",
      },
      {
        name: "mul",
        signature: "mul(m: Matrix4): this",
        description: "Post-multiplies this matrix by m.",
      },
      {
        name: "mulMatrices",
        signature: "mulMatrices(a: Matrix4, b: Matrix4): this",
        description: "Sets this to a x b.",
      },
      {
        name: "makePerspective",
        signature:
          "makePerspective(fov: number, aspect: number, near: number, far: number): this",
        description: "Builds a perspective projection matrix from radians fov.",
      },
      {
        name: "makeOrthographic",
        signature:
          "makeOrthographic(left, right, top, bottom, near, far): this",
        description: "Builds an orthographic projection matrix.",
      },
    ],
  },
  {
    id: "Vector2",
    name: "Vector2",
    category: "Math",
    signature: "new Vector2(x?, y?)",
    description:
      "Two-component vector used for UV coordinates, 2D positions, and curve points.",
    properties: [
      { name: "x", type: "number", description: "X component." },
      { name: "y", type: "number", description: "Y component." },
      {
        name: "length",
        type: "number",
        description: "Euclidean length (read-only).",
      },
      {
        name: "lengthSq",
        type: "number",
        description: "Squared length (read-only).",
      },
    ],
    methods: [
      {
        name: "set",
        signature: "set(x: number, y: number): this",
        description: "Sets both components.",
      },
      {
        name: "add",
        signature: "add(v: Vector2): this",
        description: "Adds another vector in place.",
      },
      {
        name: "sub",
        signature: "sub(v: Vector2): this",
        description: "Subtracts another vector in place.",
      },
      {
        name: "mulScalar",
        signature: "mulScalar(s: number): this",
        description: "Multiplies both components by a scalar.",
      },
      {
        name: "normalize",
        signature: "normalize(): this",
        description: "Scales the vector to unit length.",
      },
      {
        name: "dot",
        signature: "dot(v: Vector2): number",
        description: "Returns the dot product with v.",
      },
      {
        name: "cross",
        signature: "cross(v: Vector2): number",
        description: "Returns the 2D cross product (scalar): x*v.y - y*v.x.",
      },
      {
        name: "distanceTo",
        signature: "distanceTo(v: Vector2): number",
        description: "Returns the Euclidean distance to v.",
      },
      {
        name: "min",
        signature: "min(v: Vector2): this",
        description: "Component-wise minimum.",
      },
      {
        name: "max",
        signature: "max(v: Vector2): this",
        description: "Component-wise maximum.",
      },
      {
        name: "lerp",
        signature: "lerp(v: Vector2, alpha: number): this",
        description: "Linear interpolation toward v by alpha.",
      },
      {
        name: "clone",
        signature: "clone(): Vector2",
        description: "Returns a new Vector2 with the same components.",
      },
      {
        name: "copy",
        signature: "copy(v: Vector2): this",
        description: "Copies components from another vector.",
      },
    ],
  },
  {
    id: "Vector4",
    name: "Vector4",
    category: "Math",
    signature: "new Vector4(x?, y?, z?, w?)",
    description:
      "Four-component vector used for homogeneous coordinates and quaternion storage.",
    properties: [
      { name: "x", type: "number", description: "X component." },
      { name: "y", type: "number", description: "Y component." },
      { name: "z", type: "number", description: "Z component." },
      { name: "w", type: "number", description: "W component." },
      {
        name: "length",
        type: "number",
        description: "Euclidean length (read-only).",
      },
      {
        name: "lengthSq",
        type: "number",
        description: "Squared length (read-only).",
      },
    ],
    methods: [
      {
        name: "set",
        signature: "set(x: number, y: number, z: number, w: number): this",
        description: "Sets all four components.",
      },
      {
        name: "normalize",
        signature: "normalize(): this",
        description: "Scales the vector to unit length.",
      },
      {
        name: "divScalar",
        signature: "divScalar(s: number): this",
        description: "Divides all components by a scalar.",
      },
      {
        name: "clone",
        signature: "clone(): Vector4",
        description: "Returns a new Vector4 with the same components.",
      },
      {
        name: "copy",
        signature: "copy(v: Vector4): this",
        description: "Copies components from another vector.",
      },
    ],
  },
  {
    id: "Box2",
    name: "Box2",
    category: "Math",
    signature: "new Box2(min?: Vector2, max?: Vector2)",
    description: "2D axis-aligned bounding box defined by min and max corners.",
    properties: [
      {
        name: "min",
        type: "Vector2",
        description: "Lower-left corner.",
      },
      {
        name: "max",
        type: "Vector2",
        description: "Upper-right corner.",
      },
    ],
    methods: [
      {
        name: "set",
        signature: "set(min: Vector2, max: Vector2): this",
        description: "Sets both corners.",
      },
      {
        name: "expandByPoint",
        signature: "expandByPoint(point: Vector2): this",
        description: "Expands the box to include the point.",
      },
      {
        name: "containsPoint",
        signature: "containsPoint(point: Vector2): boolean",
        description: "Returns true if the point is inside the box.",
      },
      {
        name: "intersectsBox",
        signature: "intersectsBox(box: Box2): boolean",
        description: "Returns true if the boxes overlap.",
      },
      {
        name: "getCenter",
        signature: "getCenter(target?: Vector2): Vector2",
        description: "Returns the center point.",
      },
      {
        name: "getSize",
        signature: "getSize(target?: Vector2): Vector2",
        description: "Returns the width/height as a Vector2.",
      },
      {
        name: "clone",
        signature: "clone(): Box2",
        description: "Returns a new Box2 with the same bounds.",
      },
    ],
  },
  {
    id: "Box3",
    name: "Box3",
    category: "Math",
    signature: "new Box3(min?: Vector3, max?: Vector3)",
    description:
      "3D axis-aligned bounding box. Used for frustum culling, raycasting, and bounding-volume tests.",
    properties: [
      {
        name: "min",
        type: "Vector3",
        description: "Lower corner.",
      },
      {
        name: "max",
        type: "Vector3",
        description: "Upper corner.",
      },
      {
        name: "centre",
        type: "Vector3",
        description: "Center point (read-only getter).",
      },
      {
        name: "size",
        type: "Vector3",
        description: "Width/height/depth (read-only getter).",
      },
      {
        name: "isEmpty",
        type: "boolean",
        description: "True if the box has no volume (read-only).",
      },
    ],
    methods: [
      {
        name: "setFromObject",
        signature: "setFromObject(object: Node): this",
        description: "Computes the box from a scene object's geometry.",
      },
      {
        name: "setFromPoints",
        signature: "setFromPoints(points: Vector3[]): this",
        description: "Computes the box enclosing all points.",
      },
      {
        name: "expandByPoint",
        signature: "expandByPoint(point: Vector3): this",
        description: "Expands the box to include the point.",
      },
      {
        name: "containsPoint",
        signature: "containsPoint(point: Vector3): boolean",
        description: "Returns true if the point is inside the box.",
      },
      {
        name: "intersectsBox",
        signature: "intersectsBox(box: Box3): boolean",
        description: "Returns true if the boxes overlap.",
      },
      {
        name: "intersectsSphere",
        signature: "intersectsSphere(sphere: Sphere): boolean",
        description: "Returns true if the box intersects the sphere.",
      },
      {
        name: "clone",
        signature: "clone(): Box3",
        description: "Returns a new Box3 with the same bounds.",
      },
    ],
  },
  {
    id: "Cylindrical",
    name: "Cylindrical",
    category: "Math",
    signature: "new Cylindrical(radius?, theta?, y?)",
    description:
      "Cylindrical coordinate representation (radius, angle, height).",
    properties: [
      { name: "radius", type: "number", description: "Radial distance." },
      {
        name: "theta",
        type: "number",
        description: "Angle around the Y axis in radians.",
      },
      { name: "y", type: "number", description: "Height." },
    ],
    methods: [
      {
        name: "set",
        signature: "set(radius: number, theta: number, y: number): this",
        description: "Sets all three components.",
      },
      {
        name: "setFromVector3",
        signature: "setFromVector3(v: Vector3): this",
        description: "Converts a Cartesian Vector3 to cylindrical coordinates.",
      },
      {
        name: "clone",
        signature: "clone(): Cylindrical",
        description: "Returns a new Cylindrical with the same values.",
      },
    ],
  },
  {
    id: "Euler",
    name: "Euler",
    category: "Math",
    signature: "new Euler(x?, y?, z?, order?)",
    description:
      "Euler angle rotation with configurable axis order. Synced with Quaternion on Node via onChange callbacks.",
    properties: [
      {
        name: "x",
        type: "number",
        description: "Rotation around X axis in radians.",
      },
      {
        name: "y",
        type: "number",
        description: "Rotation around Y axis in radians.",
      },
      {
        name: "z",
        type: "number",
        description: "Rotation around Z axis in radians.",
      },
      {
        name: "order",
        type: "string",
        description:
          "Axis order: 'XYZ', 'YXZ', 'ZXY', 'ZYX', 'YZX', or 'XZY'. Default 'XYZ'.",
      },
    ],
    methods: [
      {
        name: "set",
        signature: "set(x: number, y: number, z: number, order?: string): this",
        description: "Sets rotation angles and optionally the order.",
      },
      {
        name: "setFromQuaternion",
        signature: "setFromQuaternion(q: Quaternion, order?: string): this",
        description: "Derives Euler angles from a quaternion.",
      },
      {
        name: "setFromRotationMatrix",
        signature: "setFromRotationMatrix(m: Matrix4, order?: string): this",
        description: "Derives Euler angles from a rotation matrix.",
      },
      {
        name: "reorder",
        signature: "reorder(newOrder: string): this",
        description:
          "Changes the axis order, recomputing angles to preserve the same rotation.",
      },
      {
        name: "clone",
        signature: "clone(): Euler",
        description: "Returns a new Euler with the same values.",
      },
    ],
  },
  {
    id: "Frustum",
    name: "Frustum",
    category: "Math",
    signature: "new Frustum()",
    description:
      "Six-plane frustum used for camera frustum culling. Built from a camera's combined projection-view matrix.",
    properties: [
      {
        name: "planes",
        type: "Plane[]",
        description:
          "Six clipping planes: left, right, bottom, top, near, far.",
      },
    ],
    methods: [
      {
        name: "setFromProjectionMatrix",
        signature: "setFromProjectionMatrix(m: Matrix4): this",
        description:
          "Extracts six planes from a combined projection-view matrix using the Gribb-Hartmann method.",
      },
      {
        name: "intersectsBox",
        signature: "intersectsBox(box: Box3): boolean",
        description:
          "Returns true if any part of the box is inside the frustum.",
      },
      {
        name: "intersectsSphere",
        signature: "intersectsSphere(sphere: Sphere): boolean",
        description:
          "Returns true if any part of the sphere is inside the frustum.",
      },
      {
        name: "containsPoint",
        signature: "containsPoint(point: Vector3): boolean",
        description: "Returns true if the point is inside all six planes.",
      },
      {
        name: "clone",
        signature: "clone(): Frustum",
        description: "Returns a new Frustum with copied planes.",
      },
    ],
  },
  {
    id: "Line3",
    name: "Line3",
    category: "Math",
    signature: "new Line3(start?: Vector3, end?: Vector3)",
    description: "3D line segment defined by start and end points.",
    properties: [
      {
        name: "start",
        type: "Vector3",
        description: "Start point.",
      },
      {
        name: "end",
        type: "Vector3",
        description: "End point.",
      },
      {
        name: "delta",
        type: "Vector3",
        description: "Direction vector from start to end (read-only, cloned).",
      },
      {
        name: "length",
        type: "number",
        description: "Segment length (read-only).",
      },
    ],
    methods: [
      {
        name: "at",
        signature: "at(t: number, target?: Vector3): Vector3",
        description: "Returns the point at parameter t along the segment.",
      },
      {
        name: "closestPointToPoint",
        signature:
          "closestPointToPoint(point: Vector3, clampToLine?: boolean, target?: Vector3): Vector3",
        description:
          "Returns the closest point on the segment to the given point.",
      },
      {
        name: "getCenter",
        signature: "getCenter(target?: Vector3): Vector3",
        description: "Returns the midpoint of the segment.",
      },
      {
        name: "clone",
        signature: "clone(): Line3",
        description: "Returns a new Line3 with the same endpoints.",
      },
    ],
  },
  {
    id: "MathUtils",
    name: "MathUtils",
    category: "Math",
    signature: "MathUtils",
    description:
      "Static math utilities: clamping, angle conversion, power-of-2 checks, and RuneTek-specific helpers like tileDistance and HSL16 packing.",
    properties: [
      {
        name: "EPSILON",
        type: "number",
        description: "Small float threshold for comparisons.",
      },
      {
        name: "TAU",
        type: "number",
        description: "2 * Math.PI.",
      },
      {
        name: "DEG2RAD",
        type: "number",
        description: "Degrees-to-radians conversion factor.",
      },
      {
        name: "RAD2DEG",
        type: "number",
        description: "Radians-to-degrees conversion factor.",
      },
    ],
    methods: [
      {
        name: "clamp",
        signature: "clamp(x: number, min: number, max: number): number",
        description: "Clamps x to [min, max].",
      },
      {
        name: "toRadians",
        signature: "toRadians(degrees: number): number",
        description: "Converts degrees to radians.",
      },
      {
        name: "toDegrees",
        signature: "toDegrees(radians: number): number",
        description: "Converts radians to degrees.",
      },
      {
        name: "isPowerOf2",
        signature: "isPowerOf2(n: number): boolean",
        description: "Returns true if n is a power of two.",
      },
      {
        name: "tileDistance",
        signature: "tileDistance(a: Vector3, b: Vector3): number",
        description:
          "Returns the RuneTek tile distance between two points (Chebyshev distance on XZ).",
      },
      {
        name: "packHsl16",
        signature: "packHsl16(h: number, s: number, l: number): number",
        description: "Packs HSL values into a 16-bit integer (6H/3S/7L).",
      },
      {
        name: "unpackHsl16",
        signature:
          "unpackHsl16(value: number): { h: number, s: number, l: number }",
        description: "Unpacks a 16-bit HSL integer to h/s/l components.",
      },
    ],
  },
  {
    id: "Matrix3",
    name: "Matrix3",
    category: "Math",
    signature: "new Matrix3(elements?)",
    description:
      "Column-major 3x3 matrix backed by a Float32Array. Used for normal matrices and 2D transforms.",
    properties: [
      {
        name: "elements",
        type: "Float32Array",
        description: "Flat 9-element column-major storage.",
      },
    ],
    methods: [
      {
        name: "identity",
        signature: "identity(): this",
        description: "Resets to the identity matrix.",
      },
      {
        name: "getNormalMatrix",
        signature: "getNormalMatrix(m: Matrix4): this",
        description:
          "Sets this to the transposed inverse of the upper-left 3x3 of the given Matrix4.",
      },
      {
        name: "setFromMatrix4",
        signature: "setFromMatrix4(m: Matrix4): this",
        description: "Copies the upper-left 3x3 from a Matrix4.",
      },
      {
        name: "invert",
        signature: "invert(): this",
        description: "Inverts the matrix in place.",
      },
      {
        name: "mul",
        signature: "mul(m: Matrix3): this",
        description: "Post-multiplies this matrix by m.",
      },
      {
        name: "determinant",
        signature: "determinant(): number",
        description: "Returns the determinant.",
      },
      {
        name: "clone",
        signature: "clone(): Matrix3",
        description: "Returns a new Matrix3 with the same elements.",
      },
    ],
  },
  {
    id: "Plane",
    name: "Plane",
    category: "Math",
    signature: "new Plane(normal?: Vector3, constant?: number)",
    description:
      "3D plane defined by a unit normal and a signed distance from the origin. Normalizes on construction.",
    properties: [
      {
        name: "normal",
        type: "Vector3",
        description: "Plane normal (unit length).",
      },
      {
        name: "constant",
        type: "number",
        description: "Signed distance from the origin along the normal.",
      },
    ],
    methods: [
      {
        name: "setFromCoplanarPoints",
        signature:
          "setFromCoplanarPoints(a: Vector3, b: Vector3, c: Vector3): this",
        description: "Defines the plane from three coplanar points.",
      },
      {
        name: "distanceToPoint",
        signature: "distanceToPoint(point: Vector3): number",
        description: "Returns the signed distance from the point to the plane.",
      },
      {
        name: "intersectLine",
        signature:
          "intersectLine(line: Line3, target?: Vector3): Vector3|undefined",
        description:
          "Returns the intersection point with a line segment, or undefined if parallel.",
      },
      {
        name: "intersectsSphere",
        signature: "intersectsSphere(sphere: Sphere): boolean",
        description: "Returns true if the sphere crosses the plane.",
      },
      {
        name: "projectPoint",
        signature: "projectPoint(point: Vector3, target?: Vector3): Vector3",
        description: "Projects a point onto the plane.",
      },
      {
        name: "normalize",
        signature: "normalize(): this",
        description: "Normalizes the plane equation.",
      },
      {
        name: "clone",
        signature: "clone(): Plane",
        description: "Returns a new Plane with the same normal and constant.",
      },
    ],
  },
  {
    id: "Quaternion",
    name: "Quaternion",
    category: "Math",
    signature: "new Quaternion(x?, y?, z?, w?)",
    description:
      "Unit quaternion for rotation. Synced with Euler on Node via onChange callbacks. All mutation methods return this for chaining.",
    properties: [
      { name: "x", type: "number", description: "X component." },
      { name: "y", type: "number", description: "Y component." },
      { name: "z", type: "number", description: "Z component." },
      { name: "w", type: "number", description: "W component. Default 1." },
      {
        name: "length",
        type: "number",
        description: "Euclidean length (read-only).",
      },
    ],
    methods: [
      {
        name: "set",
        signature: "set(x: number, y: number, z: number, w: number): this",
        description: "Sets all four components.",
      },
      {
        name: "setFromAxisAngle",
        signature: "setFromAxisAngle(axis: Vector3, angle: number): this",
        description: "Sets the quaternion from an axis and rotation angle.",
      },
      {
        name: "setFromEuler",
        signature: "setFromEuler(euler: Euler): this",
        description: "Sets the quaternion from Euler angles.",
      },
      {
        name: "setFromRotationMatrix",
        signature: "setFromRotationMatrix(m: Matrix4): this",
        description: "Extracts the rotation quaternion from a matrix.",
      },
      {
        name: "normalize",
        signature: "normalize(): this",
        description: "Normalizes to unit length.",
      },
      {
        name: "invert",
        signature: "invert(): this",
        description:
          "Conjugates the quaternion (inverts for unit quaternions).",
      },
      {
        name: "premul",
        signature: "premul(q: Quaternion): this",
        description: "Pre-multiplies this quaternion by q.",
      },
      {
        name: "clone",
        signature: "clone(): Quaternion",
        description: "Returns a new Quaternion with the same components.",
      },
    ],
  },
  {
    id: "Ray",
    name: "Ray",
    category: "Math",
    signature: "new Ray(origin?: Vector3, direction?: Vector3)",
    description:
      "Infinite ray defined by an origin point and a direction vector. Used by Raycaster for intersection tests.",
    properties: [
      {
        name: "origin",
        type: "Vector3",
        description: "Ray origin.",
      },
      {
        name: "direction",
        type: "Vector3",
        description:
          "Ray direction (should be unit length). Default (0, 0, -1).",
      },
    ],
    methods: [
      {
        name: "set",
        signature: "set(origin: Vector3, direction: Vector3): this",
        description: "Sets origin and direction.",
      },
      {
        name: "at",
        signature: "at(t: number, target?: Vector3): Vector3",
        description: "Returns the point at distance t along the ray.",
      },
      {
        name: "intersectTriangle",
        signature:
          "intersectTriangle(a: Vector3, b: Vector3, c: Vector3, backfaceCulling: boolean, target?: Vector3): Vector3|undefined",
        description:
          "Tests intersection with a triangle. Returns the hit point or undefined.",
      },
      {
        name: "intersectBox3",
        signature:
          "intersectBox3(box: Box3, target?: Vector3): Vector3|undefined",
        description:
          "Tests intersection with an axis-aligned box. Returns the entry point or undefined.",
      },
      {
        name: "intersectSphere",
        signature:
          "intersectSphere(sphere: Sphere, target?: Vector3): Vector3|undefined",
        description:
          "Tests intersection with a sphere. Returns the nearest hit point or undefined.",
      },
      {
        name: "intersectPlane",
        signature:
          "intersectPlane(plane: Plane, target?: Vector3): Vector3|undefined",
        description:
          "Tests intersection with a plane. Returns the hit point or undefined.",
      },
      {
        name: "applyMatrix4",
        signature: "applyMatrix4(m: Matrix4): this",
        description: "Transforms both origin and direction by a 4x4 matrix.",
      },
      {
        name: "clone",
        signature: "clone(): Ray",
        description: "Returns a new Ray with the same origin and direction.",
      },
    ],
  },
  {
    id: "Sphere",
    name: "Sphere",
    category: "Math",
    signature: "new Sphere(centre?: Vector3, radius?: number)",
    description:
      "Bounding sphere used for frustum culling and intersection tests.",
    properties: [
      {
        name: "centre",
        type: "Vector3",
        description: "Sphere center.",
      },
      {
        name: "radius",
        type: "number",
        description: "Sphere radius. Default -1 (empty).",
      },
    ],
    methods: [
      {
        name: "containsPoint",
        signature: "containsPoint(point: Vector3): boolean",
        description: "Returns true if the point is inside the sphere.",
      },
      {
        name: "distanceToPoint",
        signature: "distanceToPoint(point: Vector3): number",
        description:
          "Returns the distance from the point to the sphere surface (negative if inside).",
      },
      {
        name: "intersectsSphere",
        signature: "intersectsSphere(sphere: Sphere): boolean",
        description: "Returns true if the spheres overlap.",
      },
      {
        name: "translate",
        signature: "translate(offset: Vector3): this",
        description: "Moves the sphere by the given offset.",
      },
      {
        name: "setFromPoints",
        signature:
          "setFromPoints(points: Vector3[], optionalCenter?: Vector3): this",
        description:
          "Computes the bounding sphere from an array of points. Uses the provided center or computes the centroid.",
      },
      {
        name: "expandByPoint",
        signature: "expandByPoint(point: Vector3): this",
        description:
          "Expands the radius to include the point if it lies outside the sphere.",
      },
      {
        name: "clone",
        signature: "clone(): Sphere",
        description: "Returns a new Sphere with the same centre and radius.",
      },
    ],
  },
  {
    id: "Spherical",
    name: "Spherical",
    category: "Math",
    signature: "new Spherical(radius?, phi?, theta?)",
    description:
      "Spherical coordinate representation. Used by OrbitControls for camera positioning.",
    properties: [
      {
        name: "radius",
        type: "number",
        description: "Radial distance.",
      },
      {
        name: "phi",
        type: "number",
        description: "Polar angle from Y axis in radians.",
      },
      {
        name: "theta",
        type: "number",
        description: "Azimuthal angle around Y axis in radians.",
      },
    ],
    methods: [
      {
        name: "set",
        signature: "set(radius: number, phi: number, theta: number): this",
        description: "Sets all three components.",
      },
      {
        name: "setFromVector3",
        signature: "setFromVector3(v: Vector3): this",
        description: "Converts a Cartesian Vector3 to spherical coordinates.",
      },
      {
        name: "makeSafe",
        signature: "makeSafe(): this",
        description:
          "Clamps phi to avoid gimbal-lock singularities at the poles.",
      },
      {
        name: "clone",
        signature: "clone(): Spherical",
        description: "Returns a new Spherical with the same values.",
      },
    ],
  },
  {
    id: "Triangle",
    name: "Triangle",
    category: "Math",
    signature: "new Triangle(a?: Vector3, b?: Vector3, c?: Vector3)",
    description:
      "Three-vertex triangle with barycentric coordinate helpers, area computation, and intersection tests.",
    properties: [
      { name: "a", type: "Vector3", description: "First vertex." },
      { name: "b", type: "Vector3", description: "Second vertex." },
      { name: "c", type: "Vector3", description: "Third vertex." },
    ],
    methods: [
      {
        name: "set",
        signature: "set(a: Vector3, b: Vector3, c: Vector3): this",
        description: "Sets all three vertices.",
      },
      {
        name: "getArea",
        signature: "getArea(): number",
        description: "Returns the area of the triangle.",
      },
      {
        name: "getNormal",
        signature: "getNormal(target?: Vector3): Vector3",
        description: "Returns the face normal (unit length).",
      },
      {
        name: "getBarycoord",
        signature: "getBarycoord(point: Vector3, target?: Vector3): Vector3",
        description:
          "Returns the barycentric coordinates of a point relative to this triangle.",
      },
      {
        name: "containsPoint",
        signature: "containsPoint(point: Vector3): boolean",
        description: "Returns true if the point lies inside the triangle.",
      },
      {
        name: "isFrontFacing",
        signature: "isFrontFacing(direction: Vector3): boolean",
        description: "Returns true if the triangle faces the given direction.",
      },
      {
        name: "closestPointToPoint",
        signature:
          "closestPointToPoint(point: Vector3, target?: Vector3): Vector3",
        description:
          "Returns the closest point on the triangle to the given point.",
      },
      {
        name: "clone",
        signature: "clone(): Triangle",
        description: "Returns a new Triangle with the same vertices.",
      },
    ],
  },
] satisfies DocEntry[];
