/** Face-culling choices used by the CPU rasterizer. */
export const Side = {
  Front: 0,
  Back: 1,
  Double: 2,
} as const;

/** Union of face-culling choice identifiers. */
export type Side = (typeof Side)[keyof typeof Side];

/** Lighting interpolation modes available in the scanline rasterizer. */
export const Shading = {
  Flat: 0,
  Gouraud: 1,
} as const;

/** Union of scanline shading mode identifiers. */
export type Shading = (typeof Shading)[keyof typeof Shading];

/** Draw-order layers within a tile; larger values are painted later. */
export const Layer = {
  GROUND: 0,
  SCENERY: 1,
  ENTITY: 2,
  OVERLAY: 3,
} as const;

/** Union of draw-order layer identifiers. */
export type Layer = (typeof Layer)[keyof typeof Layer];

/** UV wrapping modes supported by the nearest-neighbor sampler. */
export const Wrapping = {
  ClampToEdge: 0,
  Repeat: 1,
  MirroredRepeat: 2,
} as const;

/** Union of texture wrapping mode identifiers. */
export type Wrapping = (typeof Wrapping)[keyof typeof Wrapping];

/** Binding modes that control whether a skeleton follows mesh transforms. */
export const BindMode = {
  Attached: "attached",
  Detached: "detached",
} as const;

/** Union of skeleton binding mode identifiers. */
export type BindMode = (typeof BindMode)[keyof typeof BindMode];

/** Numeric light type identifiers for fast dispatch in the shading pipeline. */
export const LightType = {
  Ambient: 0,
  Hemisphere: 1,
  Directional: 2,
  Point: 3,
  Spot: 4,
  RectArea: 5,
} as const;

/** Union of numeric light-type identifiers used by shading dispatch. */
export type LightType = (typeof LightType)[keyof typeof LightType];

/** Mouse button and interaction identifiers used by controls. */
export const MOUSE = {
  LEFT: 0,
  MIDDLE: 1,
  RIGHT: 2,
  ROTATE: 0,
  DOLLY: 1,
  PAN: 2,
} as const;

/** Union of mouse button and interaction identifiers. */
export type MOUSE = (typeof MOUSE)[keyof typeof MOUSE];

/** Touch interaction identifiers used by controls. */
export const TOUCH = {
  ROTATE: 0,
  PAN: 1,
  DOLLY_PAN: 2,
  DOLLY_ROTATE: 3,
} as const;

/** Union of touch interaction identifiers. */
export type TOUCH = (typeof TOUCH)[keyof typeof TOUCH];

/** Draw a triangle from every three vertices. */
export const TrianglesDrawMode = 0 as const;

/** Draw a triangle strip from consecutive vertices. */
export const TriangleStripDrawMode = 1 as const;

/** Draw a triangle fan from the first and last two vertices. */
export const TriangleFanDrawMode = 2 as const;

/** Linear transfer function identifier. */
export const LinearTransfer = "linear" as const;

/** sRGB transfer function identifier. */
export const SRGBTransfer = "srgb" as const;

/** No normal-map packing. */
export const NoNormalPacking = "" as const;

/** RG normal-map packing. */
export const NormalRGPacking = "rg" as const;

/** GA normal-map packing. */
export const NormalGAPacking = "ga" as const;

/** Interpolation sampling modes for rasterizer fragment shading. */
export const InterpolationSamplingMode = {
  NORMAL: "normal",
  CENTROID: "centroid",
  SAMPLE: "sample",
  FIRST: "first",
  EITHER: "either",
} as const;

/** Union of interpolation sampling mode identifiers. */
export type InterpolationSamplingMode =
  (typeof InterpolationSamplingMode)[keyof typeof InterpolationSamplingMode];

/** Interpolation sampling types for perspective-correct vs flat shading. */
export const InterpolationSamplingType = {
  PERSPECTIVE: "perspective",
  LINEAR: "linear",
  FLAT: "flat",
} as const;

/** Union of interpolation sampling type identifiers. */
export type InterpolationSamplingType =
  (typeof InterpolationSamplingType)[keyof typeof InterpolationSamplingType];

/** Compatibility flags for features that may not be supported across all platforms. */
export const Compatibility = {
  TEXTURE_COMPARE: "depthTextureCompare",
} as const;

/** Union of compatibility flag identifiers. */
export type Compatibility = (typeof Compatibility)[keyof typeof Compatibility];

/**
 * Color management configuration. EASEL renders to Canvas2D which is natively
 * sRGB, so color management is disabled by default and conversion is a no-op.
 */
export const ColorManagement = {
  /** Whether color space conversion is active. Disabled for CPU Canvas2D. */
  enabled: false,
  /** Working color space; Canvas2D ImageData is sRGB. */
  workingColorSpace: "srgb",
  /** Returns color unchanged when management is disabled. */
  convert: <TColor>(color: TColor): TColor => color,
  /** Returns color unchanged when management is disabled. */
  fromWorkingColorSpace: <TColor>(color: TColor): TColor => color,
  /** Returns color unchanged when management is disabled. */
  toWorkingColorSpace: <TColor>(color: TColor): TColor => color,
} as const;
