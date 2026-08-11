import { describe, expect, it } from "bun:test";
import { InterleavedAttribute } from "@/geometry/InterleavedAttribute.js";
import { InterleavedData } from "@/geometry/InterleavedData.js";

type NormalizedCase = {
  array:
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array;
  low: number;
  high: number;
  writeLow: number;
  writeHigh: number;
  signed: boolean;
};

const cases: readonly NormalizedCase[] = [
  {
    array: new Int8Array([-128, 127, 0, 0, 0, 0, 0, 0]),
    low: -1,
    high: 1,
    writeLow: -63,
    writeHigh: 64,
    signed: true,
  },
  {
    array: new Uint8Array([0, 255, 0, 0, 0, 0, 0, 0]),
    low: 0,
    high: 1,
    writeLow: 64,
    writeHigh: 191,
    signed: false,
  },
  {
    array: new Uint8ClampedArray([0, 255, 0, 0, 0, 0, 0, 0]),
    low: 0,
    high: 1,
    writeLow: 64,
    writeHigh: 191,
    signed: false,
  },
  {
    array: new Int16Array([-32_768, 32_767, 0, 0, 0, 0, 0, 0]),
    low: -1,
    high: 1,
    writeLow: -16_383,
    writeHigh: 16_384,
    signed: true,
  },
  {
    array: new Uint16Array([0, 65_535, 0, 0, 0, 0, 0, 0]),
    low: 0,
    high: 1,
    writeLow: 16_384,
    writeHigh: 49_151,
    signed: false,
  },
  {
    array: new Int32Array([-2_147_483_648, 2_147_483_647, 0, 0, 0, 0, 0, 0]),
    low: -1,
    high: 1,
    writeLow: -1_073_741_823,
    writeHigh: 1_073_741_824,
    signed: true,
  },
  {
    array: new Uint32Array([0, 4_294_967_295, 0, 0, 0, 0, 0, 0]),
    low: 0,
    high: 1,
    writeLow: 1_073_741_824,
    writeHigh: 3_221_225_471,
    signed: false,
  },
];

describe("InterleavedAttribute normalized integer parity", () => {
  for (const testCase of cases) {
    it(`normalizes ${testCase.array.constructor.name} like THREE`, () => {
      const { array, low, high, writeLow, writeHigh, signed } = testCase;
      const attr = new InterleavedAttribute(
        new InterleavedData(array, 4),
        2,
        0,
        true,
      );
      expect(attr.getX(0)).toBeCloseTo(low);
      expect(attr.getY(0)).toBeCloseTo(high);
      expect(attr.setX(1, signed ? -0.5 : 0.25)).toBe(attr);
      expect(attr.setY(1, signed ? 0.5 : 0.75)).toBe(attr);
      expect(array[4]).toBe(writeLow);
      expect(array[5]).toBe(writeHigh);
      expect(attr.getX(1)).toBeCloseTo(signed ? -0.5 : 0.25);
      expect(attr.getY(1)).toBeCloseTo(signed ? 0.5 : 0.75);
    });
  }
});
