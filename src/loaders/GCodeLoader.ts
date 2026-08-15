import type { Group } from "../objects/Group.ts";
import {
  createGroup,
  type GCodeMode,
  parseGCode,
} from "./_GCodeLoaderHelpers.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";

/** Loads common G-code toolpaths into CPU line-segment scene objects.
 *
 * The parser follows the movement and modal-state behavior used by THREE's
 * `GCodeLoader`: `G0`/`G1` moves become travel or extrusion line segments,
 * `G90`/`G91` select coordinate mode, `M82`/`M83` select extrusion mode, and
 * `G92` resets the machine position. The result remains ordinary EASEL
 * geometry and `LineSegments`, so it can be rasterized by Canvas2D without a
 * renderer-specific or GPU format.
 */
export class GCodeLoader extends Loader {
  /** Whether to create one travel/extrusion pair for every parsed layer. */
  splitLayer: boolean = false;

  /** Classifies movement as positive-E extrusion or as G0 travel and G1 cutting. */
  mode: GCodeMode = "extrusion";

  /** Loads a G-code resource through the configured loading manager. */
  override load(
    url: string,
    onLoad?: (group: Group) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (error: unknown) => void,
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

  /** Parses G-code text into travel and extrusion `LineSegments`.
   *
   * Travel segments use a red material named `path`; positive-extrusion
   * segments use a green material named `extruded`, matching THREE's loader.
   * Layer comments such as `;LAYER:12` are retained in the returned group's
   * `userData.layers` metadata and select the next movement layer when
   * `splitLayer` is enabled.
   */
  override parse(data: string): Group {
    if (typeof data !== "string") {
      throw new TypeError("GCodeLoader.parse requires G-code text.");
    }
    const parsed = parseGCode(data, this.mode);
    return createGroup(
      parsed.layers,
      parsed.feedRates,
      this.splitLayer,
      this.mode,
    );
  }
}
