import { AnimationClip } from "../animation/AnimationClip.js";
import { FileLoader } from "./FileLoader.js";
import { Loader } from "./Loader.js";

/**
 * Loads a JSON array of animation clip definitions.
 */
export class AnimationLoader extends Loader {
	/**
	 * @param {*} [manager]
	 */
	constructor(manager = undefined) {
		super(manager);
	}

	/**
	 * @override
	 * @param {string} url
	 * @param {((clips: AnimationClip[]) => void) | undefined} [onLoad]
	 * @param {((event: ProgressEvent) => void) | undefined} [onProgress]
	 * @param {((err: *) => void) | undefined} [onError]
	 * @returns {void}
	 */
	load(url, onLoad, onProgress = undefined, onError = undefined) {
		const fileLoader = new FileLoader(this.manager);
		fileLoader.setPath(this.path);
		fileLoader.setResponseType("json");
		fileLoader.setRequestHeader(this.requestHeader);

		fileLoader.load(
			url,
			(json) => {
				onLoad?.(this.parse(json));
			},
			onProgress,
			onError,
		);
	}

	/**
	 * @param {Array<{ name: string, duration: number, tracks: Array<{ type: string, name: string, times: number[], values: number[] }> }>} json
	 * @returns {AnimationClip[]}
	 */
	parse(json) {
		const clips = [];

		for (const clipDef of json) {
			const clip = new AnimationClip(
				clipDef.name ?? "",
				clipDef.duration ?? -1,
				/** @type {import('../animation/Track.js').Track[]} */ (
					/** @type {unknown} */ (clipDef.tracks ?? [])
				),
			);
			clips.push(clip);
		}

		return clips;
	}
}
