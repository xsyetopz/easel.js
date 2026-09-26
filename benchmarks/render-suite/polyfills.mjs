export function installImageDataPolyfill() {
  if (typeof globalThis.ImageData !== "undefined") return;
  globalThis.ImageData = class BenchmarkImageData {
    // Matches both browser overloads: (width, height) and (data, width, height).
    constructor(dataOrWidth, width, height) {
      if (typeof dataOrWidth === "number") {
        this.data = new Uint8ClampedArray(dataOrWidth * width * 4);
        this.width = dataOrWidth;
        this.height = width;
        return;
      }
      this.data = dataOrWidth;
      this.width = width;
      this.height = height ?? dataOrWidth.length / 4 / width;
    }
  };
}
