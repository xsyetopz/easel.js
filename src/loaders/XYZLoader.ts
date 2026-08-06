import { Geometry } from "../geometry/Geometry.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";

const linePattern = /\r?\n/u;
const valuePattern = /\s+/u;

/** Loads XYZ and XYZRGB point-cloud text files into CPU geometry. */
export class XYZLoader extends Loader {
  /** Loads an XYZ resource through the configured loading manager. */
  override load(
    url: string,
    onLoad?: (geometry: Geometry) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (err: unknown) => void,
  ): void {
    const fileLoader = new FileLoader(this.manager);
    fileLoader.cache = this.cache;
    fileLoader.path = this.path;
    fileLoader.responseType = "text";
    fileLoader.requestHeader = this.requestHeader;
    fileLoader.withCredentials = this.withCredentials;
    fileLoader.load(
      url,
      (text) => {
        try {
          onLoad?.(this.parse(String(text)));
        } catch (error) {
          onError?.(error);
        }
      },
      onProgress,
      onError,
    );
  }

  /** Parses XYZ or XYZRGB text into point positions and optional colors. */
  parse(text: string): Geometry {
    const vertices: number[] = [];
    const colors: number[] = [];
    for (const rawLine of text.split(linePattern)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const values = line
        .split(valuePattern)
        .map((value) => Number.parseFloat(value));
      if (values.length !== 3 && values.length !== 6) continue;
      if (values.some((value) => !Number.isFinite(value))) continue;
      const x = values[0];
      const y = values[1];
      const z = values[2];
      if (x === undefined || y === undefined || z === undefined) continue;
      vertices.push(x, y, z);
      if (values.length === 6) {
        const red = values[3];
        const green = values[4];
        const blue = values[5];
        if (red !== undefined && green !== undefined && blue !== undefined) {
          colors.push(red / 255, green / 255, blue / 255);
        }
      }
    }
    const geometry = new Geometry().setPositions(vertices);
    if (colors.length > 0) geometry.setColors(colors);
    return geometry;
  }
}
