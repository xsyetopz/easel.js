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
} as const;

/** Union of numeric light-type identifiers used by shading dispatch. */
export type LightType = (typeof LightType)[keyof typeof LightType];
