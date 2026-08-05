import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { HemisphereLight } from "../lights/HemisphereLight.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import { Color, type ColorValue } from "../math/Color.ts";
import { LineSegments } from "../objects/LineSegments.ts";

const _skyColor = new Color();
const _groundColor = new Color();

/** Explicit CPU wireframe visualization of a HemisphereLight. */
export class HemisphereLightHelper extends LineSegments {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "HemisphereLightHelper";

  /** Returns `true` for this concrete type. */
  get isHemisphereLightHelper(): true {
    return true;
  }

  #light: HemisphereLight;
  #color: Color | undefined;
  #size: number;
  readonly #lineMaterial: LineMaterial;
  readonly #colorAttribute: Attribute;

  /** Constructs an octahedron helper for a hemisphere light. */
  constructor(light: HemisphereLight, size: number = 1, color?: ColorValue) {
    assertLight(light);
    if (!Number.isFinite(size) || size <= 0) {
      throw new RangeError(
        "HemisphereLightHelper size must be positive and finite.",
      );
    }

    const geometry = new Geometry();
    const positions = new Float32Array(octahedronEdges(size));
    geometry.setAttribute("position", new Attribute(positions, 3));
    const colors = new Float32Array(positions.length);
    const colorAttribute = new Attribute(colors, 3);
    geometry.setAttribute("color", colorAttribute);

    const lineMaterial = new LineMaterial({ color: 0xffffff });
    super(geometry, lineMaterial);
    this.#light = light;
    this.#size = size;
    this.#color = color === undefined ? undefined : new Color(color);
    this.#lineMaterial = lineMaterial;
    this.#colorAttribute = colorAttribute;
  }

  /** Source light whose prepared transform and parameters drive this helper. */
  get light(): HemisphereLight {
    return this.#light;
  }

  /** Replaces the source light used by this helper. */
  set light(value: HemisphereLight) {
    assertLight(value);
    this.#light = value;
  }

  /** Optional helper color override; undefined uses the source light color. */
  get color(): Color | undefined {
    return this.#color;
  }

  /** Replaces the helper color override. */
  set color(value: ColorValue | undefined) {
    this.#color = value === undefined ? undefined : new Color(value);
  }

  /** Size of the cached octahedron line geometry. */
  get size(): number {
    return this.#size;
  }

  /** Sets the octahedron extent in local units and mutates cached endpoints. */
  set size(value: number) {
    assertSize(value);
    this.#size = value;
    const attribute = this.geometry?.getAttribute("position");
    if (!(attribute?.array instanceof Float32Array)) return;
    attribute.array.set(octahedronEdges(value));
    attribute.needsUpdate = true;
  }

  /**
   * Reads the caller-prepared light matrix and publishes pose and colors.
   * Matrix preparation is deliberately separate from helper synchronization.
   */
  update(): this {
    const elements = this.#light.matrixWorld.elements;
    const x = elements[12];
    const y = elements[13];
    const z = elements[14];
    const length = Math.sqrt(x * x + y * y + z * z) || 1;
    const directionX = x / length;
    const directionY = y / length;
    const directionZ = z / length;

    this.position.set(x, y, z);
    setPositiveYDirection(this.quaternion, directionX, directionY, directionZ);
    this.rotation.setFromQuaternion(this.quaternion);

    const override = this.#color;
    if (override === undefined) {
      this.#lineMaterial.color.setRGB(1, 1, 1);
      _skyColor.copy(this.#light.color);
      _groundColor.copy(this.#light.groundColor);
    } else {
      this.#lineMaterial.color.copy(override);
      _skyColor.setRGB(1, 1, 1);
      _groundColor.setRGB(1, 1, 1);
    }

    const positions = this.geometry?.getAttribute("position")?.array;
    if (!positions) {
      throw new Error("HemisphereLightHelper geometry is unavailable.");
    }
    for (let index = 0, vertex = 0; index < positions.length; index += 3) {
      const destination = positions[index + 1] >= 0 ? _skyColor : _groundColor;
      this.#colorAttribute.setXYZ(
        vertex,
        destination.r,
        destination.g,
        destination.b,
      );
      vertex++;
    }
    this.#colorAttribute.needsUpdate = true;
    return this;
  }

  /** Returns an independent helper with copied CPU geometry and material state. */
  override clone(): HemisphereLightHelper {
    return new HemisphereLightHelper(
      this.light,
      this.size,
      this.color?.clone(),
    ).copy(this);
  }

  /** Copies transform, source light, geometry, material, and color state. */
  override copy(source: HemisphereLightHelper): this {
    super.copy(source, false);
    this.#light = source.light;
    this.#color = source.color?.clone();
    this.#size = source.size;
    this.geometry = source.geometry?.clone();
    this.#lineMaterial.copy(source.#lineMaterial);
    this.material = this.#lineMaterial;
    return this;
  }

  /** Releases owned geometry, materials, and CPU buffers. */
  dispose(): void {
    this.geometry?.dispose();
    this.#lineMaterial.dispose();
  }
}

function assertLight(light: HemisphereLight): void {
  if (!(light instanceof HemisphereLight)) {
    throw new TypeError(
      "HemisphereLightHelper light must be a HemisphereLight.",
    );
  }
}

function assertSize(size: number): void {
  if (!Number.isFinite(size) || size <= 0) {
    throw new RangeError(
      "HemisphereLightHelper size must be positive and finite.",
    );
  }
}

function octahedronEdges(size: number): number[] {
  const positions: number[] = [];
  const ring = [
    [size, 0, 0],
    [0, 0, size],
    [-size, 0, 0],
    [0, 0, -size],
  ];

  for (let index = 0; index < ring.length; index++) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    positions.push(
      0,
      size,
      0,
      current[0],
      current[1],
      current[2],
      0,
      -size,
      0,
      current[0],
      current[1],
      current[2],
      current[0],
      current[1],
      current[2],
      next[0],
      next[1],
      next[2],
    );
  }
  return positions;
}

function setPositiveYDirection(
  quaternion: { set(x: number, y: number, z: number, w: number): unknown },
  x: number,
  y: number,
  z: number,
): void {
  if (y < -0.999999) {
    quaternion.set(1, 0, 0, 0);
    return;
  }

  // The shortest-arc quaternion from (0, 1, 0) to (x, y, z).
  const qx = z;
  const qy = 0;
  const qz = -x;
  const qw = 1 + y;
  const inverseLength = 1 / Math.sqrt(qx * qx + qz * qz + qw * qw);
  quaternion.set(
    qx * inverseLength,
    qy,
    qz * inverseLength,
    qw * inverseLength,
  );
}
