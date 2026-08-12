/** Endpoint behavior for smooth interpolation. */
export const InterpolationEnding = {
  ZeroCurvature: 2400,
  ZeroSlope: 2401,
  WrapAround: 2402,
} as const;

/** Union of endpoint policies used by smooth interpolation. */
export type InterpolationEndingMode =
  (typeof InterpolationEnding)[keyof typeof InterpolationEnding];
