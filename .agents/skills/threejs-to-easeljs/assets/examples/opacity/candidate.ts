// EASEL 0.7.0: integer transparency level, 0 opaque through 8 transparent.
import { BasicMaterial } from "@xsyetopz/easel";

export function easelOpacity(alpha: number): number {
  const clamped = Math.min(1, Math.max(0, alpha));
  return Math.round((1 - clamped) * 8);
}

export function glassPanel(): BasicMaterial {
  return new BasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: easelOpacity(0.35),
  });
}

export function solidPanel(): BasicMaterial {
  return new BasicMaterial({ color: 0xffffff, opacity: easelOpacity(1) });
}
