import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { PointLight } from "../lights/PointLight.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import { Color, type ColorValue } from "../math/Color.ts";
import { LineSegments } from "../objects/LineSegments.ts";

/** Explicit wireframe visualization of a PointLight. */
export class PointLightHelper extends LineSegments {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "PointLightHelper";

  /** Returns `true` for this concrete type. */
  get isPointLightHelper(): true {
    return true;
  }

  #light: PointLight;
  #color: Color | undefined;
  #size: number;
  readonly #lineMaterial: LineMaterial;

  /** Constructs an octahedron helper for a point light. */
  constructor(light: PointLight, size: number = 1, color?: ColorValue) {
    assertLight(light);
    if (!Number.isFinite(size) || size <= 0) {
      throw new RangeError(
        "PointLightHelper size must be positive and finite.",
      );
    }

    const geometry = new Geometry();
    geometry.setAttribute(
      "position",
      new Attribute(new Float32Array(octahedronEdges(size)), 3),
    );
    const lineMaterial = new LineMaterial({ color: color ?? 0xffffff });
    super(geometry, lineMaterial);
    this.#light = light;
    this.#color = color === undefined ? undefined : new Color(color);
    this.#size = size;
    this.#lineMaterial = lineMaterial;
  }

  /** Source light whose prepared transform and parameters drive this helper. */
  get light(): PointLight {
    return this.#light;
  }

  /** Replaces the source light used by this helper. */
  set light(value: PointLight) {
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

  /** Radius of the cached line octahedron. */
  get size(): number {
    return this.#size;
  }

  /** Sets radius and mutates cached endpoint positions. */
  set size(value: number) {
    assertSize(value);
    this.#size = value;
    const attribute = this.geometry?.getAttribute("position");
    if (!(attribute?.array instanceof Float32Array)) return;
    attribute.array.set(octahedronEdges(value));
    attribute.needsUpdate = true;
  }

  /** Explicitly copies the light's current position and effective helper color. */
  update(): this {
    this.position.copy(this.#light.position);
    this.#lineMaterial.color.copy(this.#color ?? this.#light.color);
    return this;
  }

  /** Returns an independent helper with copied CPU geometry and material state. */
  override clone(): PointLightHelper {
    return new PointLightHelper(
      this.light,
      this.size,
      this.color?.clone(),
    ).copy(this);
  }

  /** Copies transform, source light, geometry, material, and color state. */
  override copy(source: PointLightHelper): this {
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

function assertLight(light: PointLight): void {
  if (!(light instanceof PointLight)) {
    throw new TypeError("PointLightHelper light must be a PointLight.");
  }
}

function assertSize(size: number): void {
  if (!Number.isFinite(size) || size <= 0) {
    throw new RangeError("PointLightHelper size must be positive and finite.");
  }
}

function octahedronEdges(size: number): number[] {
  const top = [0, size, 0];
  const bottom = [0, -size, 0];
  const ring = [
    [size, 0, 0],
    [0, 0, size],
    [-size, 0, 0],
    [0, 0, -size],
  ];
  const positions: number[] = [];
  for (let i = 0; i < ring.length; i++) {
    const current = ring[i] ?? [0, 0, 0];
    const next = ring[(i + 1) % ring.length] ?? [0, 0, 0];
    positions.push(
      ...top,
      ...current,
      ...bottom,
      ...current,
      ...current,
      ...next,
    );
  }
  return positions;
}
