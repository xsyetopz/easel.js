const conversionBuffer = new ArrayBuffer(4);
const conversionFloat = new Float32Array(conversionBuffer);
const conversionUint = new Uint32Array(conversionBuffer);

function roundToEven(value: number, shift: number): number {
  const quotient = value >>> shift;
  const remainder = value & (2 ** shift - 1);
  const midpoint = 2 ** (shift - 1);
  return (
    quotient +
    Number(
      remainder > midpoint || (remainder === midpoint && quotient % 2 === 1),
    )
  );
}

/** Encodes a JavaScript number as an IEEE 754 binary16 value. */
export function toHalfFloat(value: number): number {
  conversionFloat[0] = value;
  const bits = conversionUint[0];
  const sign = (bits >>> 16) & 0x8000;
  const exponent = (bits >>> 23) & 0xff;
  const mantissa = bits & 0x7fffff;

  if (exponent === 0xff) {
    return mantissa === 0 ? sign | 0x7c00 : sign | 0x7e00;
  }
  if (exponent > 142) return sign | 0x7c00;
  if (exponent < 102) return sign;

  if (exponent < 113) {
    return sign | roundToEven(mantissa | 0x800000, 126 - exponent);
  }

  let halfExponent = exponent - 112;
  let halfMantissa = roundToEven(mantissa, 13);
  if (halfMantissa === 0x400) {
    halfExponent++;
    halfMantissa = 0;
  }
  if (halfExponent >= 0x1f) return sign | 0x7c00;
  return sign | (halfExponent << 10) | halfMantissa;
}

/** Decodes an IEEE 754 binary16 value into a JavaScript number. */
export function fromHalfFloat(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new RangeError("fromHalfFloat() requires a 16-bit integer.");
  }

  const sign = (value & 0x8000) << 16;
  let exponent = (value >>> 10) & 0x1f;
  let mantissa = value & 0x3ff;

  if (exponent === 0) {
    if (mantissa === 0) {
      conversionUint[0] = sign;
      return conversionFloat[0];
    }
    while ((mantissa & 0x400) === 0) {
      mantissa <<= 1;
      exponent--;
    }
    exponent++;
    mantissa &= 0x3ff;
  } else if (exponent === 0x1f) {
    conversionUint[0] = sign | 0x7f800000 | (mantissa << 13);
    return conversionFloat[0];
  }

  conversionUint[0] = sign | ((exponent + 112) << 23) | (mantissa << 13);
  return conversionFloat[0];
}
