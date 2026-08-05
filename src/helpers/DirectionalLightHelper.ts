import { Node } from "../core/Node.ts";
import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { DirectionalLight } from "../lights/DirectionalLight.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import { Color, type ColorValue } from "../math/Color.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Line } from "../objects/Line.ts";

const _lightPosition = new Vector3();
const _targetPosition = new Vector3();
const _direction = new Vector3();

/** Explicit wireframe visualization of a DirectionalLight. */
export class DirectionalLightHelper extends Node {
  /** String identifier used by runtime type checks and serialization. */
  override type: string = "DirectionalLightHelper";

  /** Returns `true` for this concrete type. */
  get isDirectionalLightHelper(): true {
    return true;
  }

  #light: DirectionalLight;
  #color: Color | undefined;
  #size: number;
  readonly #material: LineMaterial;
  readonly #lightPlane: Line;
  readonly #targetLine: Line;

  /** Constructs a wireframe helper for a directional light and target. */
  constructor(light: DirectionalLight, size: number = 1, color?: ColorValue) {
    super();
    assertLight(light);
    assertSize(size);
    this.#light = light;
    this.#size = size;
    this.#color = color === undefined ? undefined : new Color(color);
    this.#material = new LineMaterial({ color: color ?? 0xffffff });

    const half = size;
    const planeGeometry = new Geometry();
    planeGeometry.setAttribute(
      "position",
      new Attribute(
        new Float32Array([
          -half,
          half,
          0,
          half,
          half,
          0,
          half,
          -half,
          0,
          -half,
          -half,
          0,
          -half,
          half,
          0,
        ]),
        3,
      ),
    );
    this.#lightPlane = new Line(planeGeometry, this.#material);
    this.add(this.#lightPlane);

    const targetGeometry = new Geometry();
    targetGeometry.setAttribute(
      "position",
      new Attribute(new Float32Array([0, 0, 0, 0, 0, 1]), 3),
    );
    this.#targetLine = new Line(targetGeometry, this.#material);
    this.add(this.#targetLine);
  }

  /** Source light whose prepared transform and parameters drive this helper. */
  get light(): DirectionalLight {
    return this.#light;
  }

  /** Replaces the source light used by this helper. */
  set light(value: DirectionalLight) {
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

  /** Side length of the light-plane wireframe. */
  get size(): number {
    return this.#size;
  }

  /** Sets the side length and mutates the cached plane vertices. */
  set size(value: number) {
    assertSize(value);
    this.#size = value;
    const position = this.#lightPlane.geometry?.getAttribute("position");
    if (!(position?.array instanceof Float32Array)) return;
    const half = value;
    position.array.set([
      -half,
      half,
      0,
      half,
      half,
      0,
      half,
      -half,
      0,
      -half,
      -half,
      0,
      -half,
      half,
      0,
    ]);
    position.needsUpdate = true;
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
      _direction.copy(_lightPosition).multiplyScalar(-1);
    }
    const length = _direction.length;
    if (length === 0) {
      throw new Error(
        "DirectionalLightHelper.update requires a non-zero prepared direction.",
      );
    }
    _direction.divideScalar(length);
    setPositiveZDirection(this.quaternion, _direction);
    this.rotation.setFromQuaternion(this.quaternion);
    this.#targetLine.scale.set(1, 1, length);
    this.#material.color.copy(this.#color ?? this.#light.color);
    return this;
  }

  /** Returns an independent helper with copied CPU geometry and material state. */
  override clone(): DirectionalLightHelper {
    return new DirectionalLightHelper(
      this.light,
      this.size,
      this.color?.clone(),
    ).copy(this);
  }

  /** Copies transform, source light, child geometry, material, and color state. */
  override copy(source: DirectionalLightHelper): this {
    super.copy(source, false);
    this.#light = source.light;
    this.#size = source.size;
    this.#color = source.color?.clone();
    this.#material.copy(source.#material);
    this.#lightPlane.copy(source.#lightPlane, false);
    this.#lightPlane.geometry = source.#lightPlane.geometry?.clone();
    this.#lightPlane.material = this.#material;
    this.#targetLine.copy(source.#targetLine, false);
    this.#targetLine.geometry = source.#targetLine.geometry?.clone();
    this.#targetLine.material = this.#material;
    return this;
  }

  /** Releases owned geometry, materials, and CPU buffers. */
  dispose(): void {
    this.#lightPlane.geometry?.dispose();
    this.#targetLine.geometry?.dispose();
    this.#material.dispose();
  }
}

function assertLight(light: DirectionalLight): void {
  if (!(light instanceof DirectionalLight)) {
    throw new TypeError(
      "DirectionalLightHelper light must be a DirectionalLight.",
    );
  }
}

function assertSize(size: number): void {
  if (!Number.isFinite(size) || size <= 0) {
    throw new RangeError(
      "DirectionalLightHelper size must be positive and finite.",
    );
  }
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
