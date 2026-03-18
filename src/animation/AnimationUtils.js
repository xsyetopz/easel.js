import { AnimationClip } from "./AnimationClip.js";

/**
 * Extracts a portion of a clip between startFrame and endFrame.
 * @param {AnimationClip} clip
 * @param {string} name - Name for the new clip
 * @param {number} startFrame
 * @param {number} endFrame
 * @param {number} [fps=30]
 * @returns {AnimationClip}
 */
function subclip(clip, name, startFrame, endFrame, fps = 30) {
	const startTime = startFrame / fps;
	const endTime = endFrame / fps;
	const duration = endTime - startTime;

	const newTracks = [];
	for (const track of clip.tracks) {
		const times = track.times;
		const values = track.values;
		const size = track.itemSize;

		const newTimes = [];
		const newValues = [];

		for (let i = 0; i < times.length; i++) {
			const t = times[i];
			if (t < startTime || t > endTime) continue;
			newTimes.push(t - startTime);
			for (let j = 0; j < size; j++) newValues.push(values[i * size + j]);
		}

		if (newTimes.length === 0) continue;

		/** @type {new (name: string, times: Float32Array, values: Float32Array) => import('./Track.js').Track} */
		const TrackCtor = /** @type {any} */ (track.constructor);
		newTracks.push(
			new TrackCtor(
				track.name,
				new Float32Array(newTimes),
				new Float32Array(newValues),
			),
		);
	}

	return new AnimationClip(name, duration, newTracks);
}

/**
 * Converts a clip to additive form by subtracting the reference pose.
 * @param {AnimationClip} clip
 * @param {number} [referenceFrame=0]
 * @param {AnimationClip} [referenceClip=clip]
 * @returns {AnimationClip}
 */
function makeClipAdditive(clip, referenceFrame = 0, referenceClip = clip) {
	const fps = 30;
	const referenceTime = referenceFrame / fps;

	for (const track of clip.tracks) {
		const refTrack = referenceClip.tracks.find((t) => t.name === track.name);
		if (!refTrack) continue;

		const refValues = refTrack.getValueAtTime(referenceTime);
		const values = track.values;
		const size = track.itemSize;

		for (let i = 0; i < track.times.length; i++) {
			for (let j = 0; j < size; j++) {
				values[i * size + j] -= refValues[j];
			}
		}
	}

	return clip;
}

export const AnimationUtils = { subclip, makeClipAdditive };
