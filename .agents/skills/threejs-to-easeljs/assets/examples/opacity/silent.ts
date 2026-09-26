// Naive ports that type-check but misbehave at run time.
import { BasicMaterial } from "@xsyetopz/easel";

// Copies three's alpha verbatim: the opacity setter throws RangeError.
export function glassPanel(): BasicMaterial {
  return new BasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.35,
  });
}

// Copies three's "opaque" value 1 onto a transparent material: EASEL reads
// it as one eighth transparent.
export function solidPanel(): BasicMaterial {
  return new BasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
}
