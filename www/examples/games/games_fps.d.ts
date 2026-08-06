export const meta: {
  id: string;
  name: string;
  category: string;
  description: string;
};
export function setup(
  canvas: HTMLCanvasElement,
  params?: Record<string, string | number>,
): { cleanup(): void };
export const controls: [];
export const easelSource: string;
export const threeSource: string;
export const example: {
  meta: typeof meta;
  controls: typeof controls;
  setup: typeof setup;
  easelSource: typeof easelSource;
  threeSource: typeof threeSource;
};
