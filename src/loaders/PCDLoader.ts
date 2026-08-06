import { Geometry } from "../geometry/Geometry.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";

/** Loads ASCII PCD point-cloud data into EASEL geometry. */
export class PCDLoader extends Loader {
  /** Loads an ASCII PCD resource through the configured manager. */
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
      (text) => onLoad?.(this.parse(String(text))),
      onProgress,
      onError,
    );
  }

  /** Parses an ASCII PCD header and point rows into positions and colors. */
  parse(text: string): Geometry {
    const lines = text.split(/\r?\n/);
    let fields: string[] = [];
    let dataIndex = -1;
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index]!.trim();
      const [key, ...values] = line.split(/\s+/);
      if (key?.toUpperCase() === "FIELDS")
        fields = values.map((value) => value.toLowerCase());
      if (key?.toUpperCase() === "DATA") {
        if (values[0]?.toLowerCase() !== "ascii")
          throw new Error("PCDLoader only supports ASCII PCD data.");
        dataIndex = index + 1;
        break;
      }
    }
    if (dataIndex < 0 || fields.length === 0)
      throw new SyntaxError(
        "PCDLoader requires FIELDS and DATA ascii headers.",
      );
    const x = fields.indexOf("x");
    const y = fields.indexOf("y");
    const z = fields.indexOf("z");
    if (x < 0 || y < 0 || z < 0)
      throw new SyntaxError("PCDLoader requires x, y, and z fields.");
    const rgb = fields.findIndex(
      (field) => field === "rgb" || field === "rgba",
    );
    const positions: number[] = [];
    const colors: number[] = [];
    for (const line of lines.slice(dataIndex)) {
      const values = line.trim().split(/\s+/);
      if (values.length < fields.length || values[0] === "") continue;
      positions.push(Number(values[x]), Number(values[y]), Number(values[z]));
      if (rgb >= 0) {
        const packed = Number(values[rgb]);
        const integer = Number.isInteger(packed)
          ? packed >>> 0
          : new Uint32Array(new Float32Array([packed]).buffer)[0]!;
        colors.push(
          ((integer >>> 16) & 255) / 255,
          ((integer >>> 8) & 255) / 255,
          (integer & 255) / 255,
        );
      }
    }
    const geometry = new Geometry().setPositions(positions);
    if (rgb >= 0) geometry.setColors(colors);
    return geometry;
  }
}
