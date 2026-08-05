import { Color, type ColorValue } from "../math/Color.ts";

const FOG_LUT_SIZE = 256;
const DEFAULT_COLOR = 0x000000;
const DEFAULT_NEAR = 1;
const DEFAULT_FAR = 1000;
const DEFAULT_EXP2_FAR = 10000;
const DEFAULT_DENSITY = 0.00025;

/** Distance-to-opacity modes supported by bounded CPU fog evaluation. */
export const FogMode = {
  Linear: "linear",
  ExponentialSquared: "exponential-squared",
} as const;

/** Union of supported fog distance-to-opacity mode identifiers. */
export type FogModeType = (typeof FogMode)[keyof typeof FogMode];

/** Construction options for linear or exponential-squared fog. */
export interface FogOptions {
  /** Fog color used when blending distant fragments. */
  readonly color?: ColorValue;
  /** Display name preserved in serialized fog state. */
  readonly name?: string;
  /** Linear-mode start distance in world units; exponential-squared mode requires `0`. */
  readonly near?: number;
  /** Finite CPU lookup, traversal, and culling bound. */
  readonly far?: number;
  /** Distance-to-opacity equation used by this fog. */
  readonly mode?: FogModeType;
  /** Absolute world-unit density used by exponential-squared mode. */
  readonly density?: number;
}

/** Serialized parameters for linear or exponential-squared fog. */
export interface FogJSON {
  /** Serialized constructor label, either `Fog` or `FogExp2`. */
  type: "Fog" | "FogExp2";
  /** Serialized name used to identify the fog configuration. */
  name: string;
  /** Serialized packed RGB fog color. */
  color: number;
  /** Serialized distance at which linear fog begins increasing opacity. */
  near?: number;
  /** Finite CPU distance bound used for lookup and culling. */
  far: number;
  /** Absolute density used by exponential-squared opacity. */
  density?: number;
}

/** Validates a finite fog parameter before serialization. */
function assertFiniteFogNumber(value: number, path: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Fog.toJSON requires finite ${path}.`);
  }
}

/** Validates color channels before packing them into serialized RGB. */
function assertFiniteFogColor(color: Color): void {
  if (
    !(
      Number.isFinite(color.r) &&
      Number.isFinite(color.g) &&
      Number.isFinite(color.b)
    )
  ) {
    throw new RangeError("Fog.toJSON requires finite color channels.");
  }
}

/** Validates the supported fog mode without enum runtime state. */
function validateMode(mode: FogModeType): void {
  if (mode !== FogMode.Linear && mode !== FogMode.ExponentialSquared) {
    throw new RangeError("Fog mode is not supported.");
  }
}

/** Validates a finite, non-negative exponential-squared density. */
function validateDensity(density: number): void {
  if (!Number.isFinite(density) || density < 0) {
    throw new RangeError("Fog density must be a finite non-negative number.");
  }
}

/** Validates a finite interval with `far` greater than `near`. */
function validateRange(near: number, far: number): void {
  if (!(Number.isFinite(near) && Number.isFinite(far))) {
    throw new RangeError("Fog near and far must be finite.");
  }
  if (near < 0) throw new RangeError("Fog near must be non-negative.");
  if (far <= near) throw new RangeError("Fog far must be greater than near.");
}

/**
 * Bounded CPU fog with linear and exponential-squared distance modes. Linear
 * mode follows THREE.Fog's near/far interval; exponential-squared mode uses
 * `1 - exp(-(density * distance)^2)`. `far` bounds culling and the fixed
 * 256-entry lookup table but does not normalize the exponential equation.
 */
export class Fog {
  readonly #color: Color;
  #name: string;
  #near: number;
  #far: number;
  #mode: FogModeType;
  #density: number;
  readonly #lut = new Float32Array(FOG_LUT_SIZE);
  #lutNeedsUpdate = false;

  /** Creates bounded fog and defers lookup-table rebuilding until `updateLut()`. */
  constructor(options: FogOptions = {}) {
    const mode = options.mode ?? FogMode.Linear;
    const near = options.near ?? (mode === FogMode.Linear ? DEFAULT_NEAR : 0);
    const far =
      options.far ?? (mode === FogMode.Linear ? DEFAULT_FAR : DEFAULT_EXP2_FAR);

    this.#color = new Color(options.color ?? DEFAULT_COLOR);
    this.#name = options.name ?? "";
    this.#near = near;
    this.#far = far;
    this.#mode = mode;
    this.#density = options.density ?? DEFAULT_DENSITY;
    this.#validate();
    this.#buildLut();
  }

  /** Returns `true` when this instance uses linear fog semantics. */
  get isFog(): boolean {
    return this.#mode === FogMode.Linear;
  }

  /** Returns `true` when this instance uses exponential-squared fog semantics. */
  get isFogExp2(): boolean {
    return this.#mode === FogMode.ExponentialSquared;
  }

  /** Serialization label matching the concrete fog constructor. */
  get type(): "Fog" | "FogExp2" {
    return this.isFogExp2 ? "FogExp2" : "Fog";
  }

  /** Display name preserved in serialized fog state. */
  get name(): string {
    return this.#name;
  }

  /** Sets the display name preserved in serialized output. */
  set name(value: string) {
    this.#name = value;
  }

  /** Mutable fog color used when blending distant fragments. */
  get color(): Color {
    return this.#color;
  }

  /** Linear start distance; exponential-squared mode requires zero. */
  get near(): number {
    return this.#near;
  }

  /** Sets the linear start distance and marks the fixed LUT dirty. */
  set near(value: number) {
    if (this.#mode === FogMode.ExponentialSquared && value !== 0) {
      throw new RangeError(
        "Fog exponential-squared mode requires near to remain 0.",
      );
    }
    validateRange(value, this.#far);
    if (value === this.#near) return;
    this.#near = value;
    this.#lutNeedsUpdate = true;
  }

  /** Finite world-distance bound used for culling and LUT sampling. */
  get far(): number {
    return this.#far;
  }

  /** Sets the finite distance bound and marks the fixed LUT dirty. */
  set far(value: number) {
    validateRange(this.#near, value);
    if (value === this.#far) return;
    this.#far = value;
    this.#lutNeedsUpdate = true;
  }

  /** Distance-to-opacity equation used by this fog. */
  get mode(): FogModeType {
    return this.#mode;
  }

  /** Sets the fog mode and marks the fixed LUT dirty. */
  set mode(value: FogModeType) {
    validateMode(value);
    if (value === FogMode.ExponentialSquared && this.#near !== 0) {
      throw new RangeError(
        "Fog exponential-squared mode requires near to remain 0.",
      );
    }
    if (value === this.#mode) return;
    this.#mode = value;
    this.#lutNeedsUpdate = true;
  }

  /** Absolute world-unit density used by exponential-squared fog. */
  get density(): number {
    return this.#density;
  }

  /** Sets non-negative density and marks the fixed LUT dirty. */
  set density(value: number) {
    validateDensity(value);
    if (value === this.#density) return;
    this.#density = value;
    this.#lutNeedsUpdate = true;
  }

  /** Whether parameter changes require `updateLut()` before sampling. */
  get lutNeedsUpdate(): boolean {
    return this.#lutNeedsUpdate;
  }

  /** Mutable fixed 256-entry opacity table sampled once per vertex. */
  get lut(): Float32Array {
    return this.#lut;
  }

  /** Rebuilds the fixed 256-entry table once after parameter changes. */
  updateLut(): this {
    if (this.#lutNeedsUpdate) this.#buildLut();
    return this;
  }

  /**
   * Samples opacity for a finite non-negative camera-space distance. Callers
   * update a dirty table explicitly; this method performs no per-pixel equation.
   */
  opacityAt(distance: number): number {
    if (!Number.isFinite(distance) || distance < 0) {
      throw new RangeError("Fog depth must be a finite non-negative number.");
    }
    if (this.#lutNeedsUpdate) {
      throw new Error("Fog LUT is dirty; call updateLut() before sampling.");
    }

    const t =
      this.#mode === FogMode.Linear
        ? (distance - this.#near) / (this.#far - this.#near)
        : distance / this.#far;
    if (t <= 0) return this.#lut[0];
    if (t >= 1) return this.#lut[FOG_LUT_SIZE - 1];

    const index = t * (FOG_LUT_SIZE - 1);
    const lower = Math.floor(index);
    const upper = lower + 1;
    const weight = index - lower;
    return this.#lut[lower] + (this.#lut[upper] - this.#lut[lower]) * weight;
  }

  /** Returns an independent copy with fog parameters and prepared LUT state. */
  clone(): Fog {
    return new Fog().copy(this);
  }

  /** Copies fog parameters, color, and prepared LUT state from `source`. */
  copy(source: Fog): this {
    this.#color.copy(source.#color);
    this.#name = source.#name;
    this.#near = source.#near;
    this.#far = source.#far;
    this.#mode = source.#mode;
    this.#density = source.#density;
    this.#lut.set(source.#lut);
    this.#lutNeedsUpdate = source.#lutNeedsUpdate;
    return this;
  }

  /** Serializes bounded fog parameters without renderer-specific fields. */
  toJSON(_meta?: object | string): FogJSON {
    assertFiniteFogColor(this.#color);
    assertFiniteFogNumber(this.#far, "far");
    const color = this.#color.hex;
    assertFiniteFogNumber(color, "color");

    if (this.isFogExp2) {
      assertFiniteFogNumber(this.#density, "density");
      return {
        type: "FogExp2",
        name: this.#name,
        color,
        far: this.#far,
        density: this.#density,
      };
    }

    assertFiniteFogNumber(this.#near, "near");
    return {
      type: "Fog",
      name: this.#name,
      color,
      near: this.#near,
      far: this.#far,
    };
  }

  #buildLut(): void {
    for (let index = 0; index < FOG_LUT_SIZE; index++) {
      const t = index / (FOG_LUT_SIZE - 1);
      if (this.#mode === FogMode.Linear) {
        this.#lut[index] = t;
        continue;
      }

      const distance = t * this.#far;
      const scaledDistance = this.#density * distance;
      this.#lut[index] = 1 - Math.exp(-(scaledDistance * scaledDistance));
    }
    this.#lutNeedsUpdate = false;
  }

  #validate(): void {
    validateRange(this.#near, this.#far);
    validateMode(this.#mode);
    validateDensity(this.#density);
    if (this.#mode === FogMode.ExponentialSquared && this.#near !== 0) {
      throw new RangeError(
        "Fog exponential-squared mode requires near to remain 0.",
      );
    }
  }
}

/**
 * Exponential-squared fog with the installed THREE.js constructor shape. The
 * finite `far` bound limits culling and LUT storage; density still uses absolute
 * camera-space distance and the inherited per-vertex table.
 */
export class FogExp2 extends Fog {
  /** Creates bounded exponential-squared fog with zero linear start distance. */
  constructor(
    color: ColorValue = DEFAULT_COLOR,
    density: number = DEFAULT_DENSITY,
    far: number = DEFAULT_EXP2_FAR,
  ) {
    super({
      color,
      near: 0,
      far,
      mode: FogMode.ExponentialSquared,
      density,
    });
  }

  /** Returns `false`; this subclass uses exponential-squared fog. */
  override get isFog(): boolean {
    return false;
  }

  /** Returns `true`; this subclass uses exponential-squared fog. */
  override get isFogExp2(): boolean {
    return true;
  }

  /** Returns an independent exponential-squared copy. */
  override clone(): FogExp2 {
    return new FogExp2().copy(this) as FogExp2;
  }

  /** Copies bounded exponential-squared parameters and prepared LUT state. */
  override copy(source: Fog): this {
    super.copy(source);
    return this;
  }

  /** Serializes the bounded exponential-squared parameters and density. */
  override toJSON(meta?: object | string): FogJSON {
    return super.toJSON(meta);
  }
}
