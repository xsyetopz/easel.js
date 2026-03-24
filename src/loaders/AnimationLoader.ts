import { AnimationClip } from "../animation/AnimationClip.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";

interface ClipDefinition {
	name?: string;
	duration?: number;
	tracks?: Array<{
		type: string;
		name: string;
		times: number[];
		values: number[];
	}>;
}

/** Loads a JSON array of animation clip definitions. */
export class AnimationLoader extends Loader {
	override load(
		url: string,
		onLoad?: (clips: AnimationClip[]) => void,
		onProgress?: (event: ProgressEvent) => void,
		onError?: (err: unknown) => void,
	): void {
		const fileLoader = new FileLoader(this.manager);
		fileLoader.setPath(this.path);
		fileLoader.setResponseType("json");
		fileLoader.setRequestHeader(this.requestHeader);

		fileLoader.load(
			url,
			(json) => {
				onLoad?.(this.parse(json as ClipDefinition[]));
			},
			onProgress,
			onError,
		);
	}

	parse(json: ClipDefinition[]): AnimationClip[] {
		const clips: AnimationClip[] = [];

		for (const clipDef of json) {
			const clip = new AnimationClip(
				clipDef.name ?? "",
				clipDef.duration ?? -1,
				(clipDef.tracks ?? []) as never[],
			);
			clips.push(clip);
		}

		return clips;
	}
}
