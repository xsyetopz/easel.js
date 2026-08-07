import {
  type AnimationClip,
  type AnimationClipJSON,
  animationClipFromJson,
} from "../animation/AnimationClip.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";

/** Loads a JSON array of canonical animation clip definitions. */
export class AnimationLoader extends Loader {
  /** Loads the resource at `url` through the configured loading manager. */
  override load(
    url: string,
    onLoad?: (clips: AnimationClip[]) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (err: unknown) => void,
  ): void {
    const fileLoader = new FileLoader(this.manager);
    fileLoader.cache = this.cache;
    fileLoader.path = this.path;
    fileLoader.responseType = "json";
    fileLoader.requestHeader = this.requestHeader;
    fileLoader.load(
      url,
      (json) => onLoad?.(this.parse(json as AnimationClipJSON[])),
      onProgress,
      onError,
    );
  }

  /** Parses serialized input into the corresponding EASEL value. */
  override parse(json: AnimationClipJSON[]): AnimationClip[] {
    return json.map(animationClipFromJson);
  }
}
