/** Face culling sides. */
export const Side = {
  Front: 0,
  Back: 1,
  Double: 2,
} as const;

export type Side = (typeof Side)[keyof typeof Side];

/** Shading models available in the scanline rasterizer. */
export const Shading = {
  Flat: 0,
  Gouraud: 1,
} as const;

export type Shading = (typeof Shading)[keyof typeof Shading];

/** Draw order layers within a tile. Higher values draw later (on top). */
export const Layer = {
  GROUND: 0,
  SCENERY: 1,
  ENTITY: 2,
  OVERLAY: 3,
} as const;

export type Layer = (typeof Layer)[keyof typeof Layer];

/** Texture UV wrapping modes. */
export const Wrapping = {
  ClampToEdge: 0,
  Repeat: 1,
} as const;

export type Wrapping = (typeof Wrapping)[keyof typeof Wrapping];

/** Numeric light type identifiers for fast dispatch in the shading pipeline. */
export const LightType = {
  Ambient: 0,
  Hemisphere: 1,
  Directional: 2,
  Point: 3,
  Spot: 4,
} as const;

export type LightType = (typeof LightType)[keyof typeof LightType];
