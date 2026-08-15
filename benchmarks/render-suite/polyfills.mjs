export function installImageDataPolyfill() {
  if (typeof globalThis.ImageData !== "undefined") return;
  globalThis.ImageData = class BenchmarkImageData {
    constructor(data, width, height) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
  };
}
