import type { DocEntry } from "../types.ts";

export const animationAdditionalDocs = [
	{
		id: "AnimationUtils",
		name: "AnimationUtils",
		category: "Animation",
		signature: "AnimationUtils",
		description:
			"Static utilities for manipulating AnimationClips: subclipping and additive blending.",
		properties: [],
		methods: [
			{
				name: "subclip",
				signature:
					"subclip(clip: AnimationClip, name: string, startFrame: number, endFrame: number, fps?: number): AnimationClip",
				description: "Extracts a time range from a clip as a new named clip.",
			},
			{
				name: "makeClipAdditive",
				signature:
					"makeClipAdditive(clip: AnimationClip, referenceFrame?: number, referenceClip?: AnimationClip): AnimationClip",
				description:
					"Converts a clip to additive format relative to a reference frame.",
			},
		],
		threeEquivalent: "THREE.AnimationUtils",
		divergence: undefined,
	},
	{
		id: "Binding",
		name: "Binding",
		category: "Animation",
		signature: "new Binding(root: object, path: string)",
		description:
			"Resolves a dotted property path on a scene-graph node for animation. Reads and writes property values during playback.",
		properties: [
			{
				name: "root",
				type: "object",
				description: "The root object to resolve paths from.",
			},
			{
				name: "path",
				type: "string",
				description: "Dotted property path, e.g. 'position.x' or 'visible'.",
			},
		],
		methods: [
			{
				name: "resolveNode",
				signature: "resolveNode(): object|undefined",
				description: "Resolves the target object from the path.",
			},
			{
				name: "getValue",
				signature: "getValue(targetArray: number[], offset: number): void",
				description: "Reads the current property value into the array.",
			},
			{
				name: "setValue",
				signature: "setValue(sourceArray: number[], offset: number): void",
				description: "Writes a value from the array to the property.",
			},
		],
		threeEquivalent: "THREE.PropertyBinding",
		divergence: undefined,
	},
	{
		id: "PropertyMixer",
		name: "PropertyMixer",
		category: "Animation",
		signature: "new PropertyMixer(binding: Binding, itemSize: number)",
		description:
			"Accumulates weighted animation values for one property and applies the blended result.",
		properties: [],
		methods: [
			{
				name: "accumulate",
				signature:
					"accumulate(accuIndex: number, weight: number, values: number[]): void",
				description: "Adds a weighted value contribution to the accumulator.",
			},
			{
				name: "apply",
				signature: "apply(accuIndex: number): void",
				description: "Applies the accumulated value to the bound property.",
			},
			{
				name: "saveOriginalState",
				signature: "saveOriginalState(): void",
				description:
					"Captures the current property value for later restoration.",
			},
			{
				name: "restoreOriginalState",
				signature: "restoreOriginalState(): void",
				description: "Restores the saved property value.",
			},
		],
		threeEquivalent: "THREE.PropertyMixer",
		divergence: undefined,
	},
	{
		id: "BooleanTrack",
		name: "BooleanTrack",
		category: "Animation",
		signature:
			"new BooleanTrack(name: string, times: Float32Array | number[], values: Float32Array | number[])",
		description:
			"Keyframe track for boolean properties. Uses step interpolation (no blending between keyframes).",
		properties: [],
		methods: [],
		threeEquivalent: "THREE.BooleanKeyframeTrack",
		divergence: "Step interpolation only.",
	},
	{
		id: "ColorTrack",
		name: "ColorTrack",
		category: "Animation",
		signature:
			"new ColorTrack(name: string, times: Float32Array | number[], values: Float32Array | number[])",
		description:
			"Keyframe track for RGB color properties (itemSize = 3). Uses linear interpolation.",
		properties: [],
		methods: [],
		threeEquivalent: "THREE.ColorKeyframeTrack",
		divergence: undefined,
	},
	{
		id: "NumberTrack",
		name: "NumberTrack",
		category: "Animation",
		signature:
			"new NumberTrack(name: string, times: Float32Array | number[], values: Float32Array | number[])",
		description:
			"Keyframe track for scalar properties (itemSize = 1). Uses linear interpolation.",
		properties: [],
		methods: [],
		threeEquivalent: "THREE.NumberKeyframeTrack",
		divergence: undefined,
	},
	{
		id: "QuaternionTrack",
		name: "QuaternionTrack",
		category: "Animation",
		signature:
			"new QuaternionTrack(name: string, times: Float32Array | number[], values: Float32Array | number[])",
		description:
			"Keyframe track for quaternion rotations (itemSize = 4). Uses spherical linear interpolation (slerp) with shortest-path correction.",
		properties: [],
		methods: [],
		threeEquivalent: "THREE.QuaternionKeyframeTrack",
		divergence: undefined,
	},
	{
		id: "VectorTrack",
		name: "VectorTrack",
		category: "Animation",
		signature:
			"new VectorTrack(name: string, times: Float32Array | number[], values: Float32Array | number[], itemSize?: number)",
		description:
			"Keyframe track for vector properties. Default itemSize is 3 (Vector3). Uses linear interpolation.",
		properties: [],
		methods: [],
		threeEquivalent: "THREE.VectorKeyframeTrack",
		divergence: undefined,
	},
] satisfies DocEntry[];
