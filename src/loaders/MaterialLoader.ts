import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";

/** Loads a JSON material definition and returns a material instance. */
export class MaterialLoader extends Loader {
  override load(
    url: string,
    onLoad?: ((material: Record<string, unknown>) => void) | undefined,
    onProgress?: ((event: ProgressEvent) => void) | undefined,
    onError?: ((err: unknown) => void) | undefined,
  ): void {
    const fileLoader = new FileLoader(this.manager);
    fileLoader.setPath(this.path);
    fileLoader.setResponseType("json");
    fileLoader.setRequestHeader(this.requestHeader);

    fileLoader.load(
      url,
      (json) => {
        onLoad?.(this.parse(json as Record<string, unknown>));
      },
      onProgress,
      onError,
    );
  }

  parse(json: Record<string, unknown>): Record<string, unknown> {
    let material: Record<string, unknown>;

    switch (json["type"]) {
      case "BasicMaterial":
      case "LambertMaterial":
      case "PhongMaterial":
      case "StandardMaterial": {
        material = Object.assign(Object.create(null), {
          type: json["type"],
        });
        break;
      }
      default:
        console.warn(`MaterialLoader: unsupported type "${json["type"]}"`);
        material = Object.assign(Object.create(null), {
          type: json["type"] ?? "Material",
        });
        break;
    }

    const skip = new Set(["type"]);
    for (const [key, value] of Object.entries(json)) {
      if (!skip.has(key)) {
        material[key] = value;
      }
    }

    return material;
  }
}
