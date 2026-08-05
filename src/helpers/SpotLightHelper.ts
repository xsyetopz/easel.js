import { Node } from "../core/Node.ts";
import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { SpotLight } from "../lights/SpotLight.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import { Color, type ColorValue } from "../math/Color.ts";
import { Vector3 } from "../math/Vector3.ts";
import { LineSegments } from "../objects/LineSegments.ts";

const _lightPosition = new Vector3();
const _targetPosition = new Vector3();
const _direction = new Vector3();

/** Explicit, allocation-free wireframe visualization of a SpotLight. */
export class SpotLightHelper extends Node {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "SpotLightHelper";

  /** Returns `true` for this concrete type. */
  get isSpotLightHelper(): true {
    return true;
  }

  #light: SpotLight;
  #color: Color | undefined;
  #displayLength: number | undefined;
  readonly #material: LineMaterial;
  readonly #cone: LineSegments;

  /** Constructs reusable cone line geometry for a spot light. */
  constructor(light: SpotLight, color?: ColorValue) {
    super();
    assertLight(light);
    this.#light = light;
    this.#color = color === undefined ? undefined : new Color(color);
    this.#displayLength = undefined;
    this.#material = new LineMaterial({ color: color ?? 0xffffff });
    this.#cone = new LineSegments(unitConeGeometry(), this.#material);
    this.add(this.#cone);
  }

  /** Source light whose prepared transform and parameters drive this helper. */
  get light(): SpotLight {
    return this.#light;
  }

  /** Replaces the source light used by this helper. */
  set light(value: SpotLight) {
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

  /** Explicit visualization length used instead of a zero/unlimited light distance. */
  get displayLength(): number | undefined {
    return this.#displayLength;
  }

  /** Sets a positive finite visualization length; undefined uses light.distance. */
  set displayLength(value: number | undefined) {
    if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
      throw new RangeError(
        "SpotLightHelper displayLength must be positive and finite.",
      );
    }
    this.#displayLength = value;
  }

  /** Child line geometry representing the spotlight cone. */
  get cone(): LineSegments {
    return this.#cone;
  }

  /** Explicitly synchronizes from caller-prepared light and target matrices. */
  update(): this {
    _lightPosition.setFromMatrixPosition(this.#light.matrixWorld);
    this.position.copy(_lightPosition);

    const target = this.#light.target;
    if (target) {
      _targetPosition.setFromMatrixPosition(target.matrixWorld);
      _direction.copy(_targetPosition).sub(_lightPosition);
    } else {
      const { x, y, z } = this.#light.direction;
      const elements = this.#light.matrixWorld.elements;
      _direction.set(
        elements[0] * x + elements[4] * y + elements[8] * z,
        elements[1] * x + elements[5] * y + elements[9] * z,
        elements[2] * x + elements[6] * y + elements[10] * z,
      );
    }
    if (_direction.lengthSq === 0) {
      throw new Error(
        "SpotLightHelper.update requires a non-zero prepared direction.",
      );
    }
    _direction.normalize();
    setPositiveZDirection(this.quaternion, _direction);
    this.rotation.setFromQuaternion(this.quaternion);

    const length = this.#displayLength ?? this.#light.distance;
    if (!Number.isFinite(length) || length <= 0) {
      throw new Error(
        "SpotLightHelper.update requires a positive light distance or displayLength.",
      );
    }
    const width = Math.tan(this.#light.angle) * length;
    this.#cone.scale.set(width, width, length);
    this.#material.color.copy(this.#color ?? this.#light.color);
    return this;
  }

  /** Returns an independent helper with copied CPU geometry and material state. */
  override clone(): SpotLightHelper {
    return new SpotLightHelper(this.light, this.color?.clone()).copy(this);
  }

  /** Copies transform, source light, display settings, geometry, and materials. */
  override copy(source: SpotLightHelper): this {
    super.copy(source, false);
    this.#light = source.light;
    this.#color = source.color?.clone();
    this.#displayLength = source.displayLength;
    this.#cone.copy(source.#cone, false);
    this.#cone.geometry = source.#cone.geometry?.clone();
    this.#material.copy(source.#material);
    this.#cone.material = this.#material;
    return this;
  }

  /** Releases owned geometry, materials, and CPU buffers. */
  dispose(): void {
    this.#cone.geometry?.dispose();
    this.#material.dispose();
  }
}

function assertLight(light: SpotLight): void {
  if (!(light instanceof SpotLight)) {
    throw new TypeError("SpotLightHelper light must be a SpotLight.");
  }
}

function unitConeGeometry(): Geometry {
  const positions: number[] = [
    0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, -1, 0, 1, 0, 0, 0, 0, 1, 1, 0,
    0, 0, 0, -1, 1,
  ];
  const divisions = 32;
  for (let i = 0; i < divisions; i++) {
    const start = (i / divisions) * Math.PI * 2;
    const end = ((i + 1) / divisions) * Math.PI * 2;
    positions.push(
      Math.cos(start),
      Math.sin(start),
      1,
      Math.cos(end),
      Math.sin(end),
      1,
    );
  }
  const geometry = new Geometry();
  geometry.setAttribute(
    "position",
    new Attribute(new Float32Array(positions), 3),
  );
  return geometry;
}

function setPositiveZDirection(
  quaternion: { set(x: number, y: number, z: number, w: number): unknown },
  direction: Vector3,
): void {
  if (direction.z < -0.999999) {
    quaternion.set(1, 0, 0, 0);
    return;
  }
  const x = -direction.y;
  const y = direction.x;
  const w = 1 + direction.z;
  const inverseLength = 1 / Math.sqrt(x * x + y * y + w * w);
  quaternion.set(x * inverseLength, y * inverseLength, 0, w * inverseLength);
}
