import { type AnimationClip, type AnimationClipJSON } from "../animation/AnimationClip.ts";
import { OrthographicCamera } from "../cameras/OrthographicCamera.ts";
import { PerspectiveCamera } from "../cameras/PerspectiveCamera.ts";
import { Node, type NodeJSON } from "../core/Node.ts";
import { Scene } from "../core/Scene.ts";
import { Shape } from "../curves/Shape.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { AmbientLight } from "../lights/AmbientLight.ts";
import { DirectionalLight } from "../lights/DirectionalLight.ts";
import { HemisphereLight } from "../lights/HemisphereLight.ts";
import { Light } from "../lights/Light.ts";
import { LightProbe } from "../lights/LightProbe.ts";
import { PointLight } from "../lights/PointLight.ts";
import { SpotLight } from "../lights/SpotLight.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Material } from "../materials/Material.ts";
import { Bone } from "../objects/Bone.ts";
import { Group } from "../objects/Group.ts";
import { Mesh } from "../objects/Mesh.ts";
import { SkinnedMesh } from "../objects/SkinnedMesh.ts";
import { Skeleton } from "../objects/Skeleton.ts";
import { Texture } from "../textures/Texture.ts";
import { AnimationLoader } from "./AnimationLoader.ts";
import { BufferGeometryLoader } from "./BufferGeometryLoader.ts";
import { FileLoader } from "./FileLoader.ts";
import { GeometryLoader } from "./GeometryLoader.ts";
import { Loader } from "./Loader.ts";
import { MaterialLoader } from "./MaterialLoader.ts";
import type { LoadingManager } from "./LoadingManager.ts";
import {
	type ObjectRecord,
	applyCameraView,
	applySceneState,
	collectBones,
	collectNodes,
	hydrateUuid,
	isRecord,
	optionalBoolean,
	optionalFiniteNumber,
	optionalRecord,
	optionalString,
	optionalTuple,
	parseSphericalHarmonics,
	resolveMeshResources,
} from "./_ObjectLoaderHelpers.ts";

/** Loads a JSON scene graph and returns a Node hierarchy. */
export class ObjectLoader extends Loader {
	/** Constructs a scene-graph loader bound to a LoadingManager. */
	constructor(manager: LoadingManager | undefined = void 0) {
		super(manager);
	}

	/** Loads a scene graph from a JSON resource. */
	override load(
		url: string,
		onLoad?: (node: Node) => void,
		onProgress: ((event: ProgressEvent) => void) | undefined = void 0,
		onError: ((err: unknown) => void) | undefined = void 0,
	): void {
		const fileLoader = new FileLoader(this.manager);
		fileLoader.cache = this.cache;
		fileLoader.path = this.path;
		fileLoader.responseType = "json";
		fileLoader.requestHeader = this.requestHeader;

		fileLoader.load(
			url,
			(json) => {
				onLoad?.(this.parse(json as ObjectRecord));
			},
			onProgress,
			onError,
		);
	}

	/** Parses a canonical EASEL node record. */
	override parse(json: NodeJSON | ObjectRecord): Node {
		const record = json as ObjectRecord;
		const images = this.parseImages(record);
		const textures = this.parseTextures(record, images);
		const geometries = this.parseGeometries(record);
		const materials = this.parseMaterials(record, geometries, textures);
		const object = this.#parseObject(
			record,
			geometries,
			materials,
			textures,
		);
		const skeletons = this.parseSkeletons(record, collectBones(object));
		if (skeletons.size > 0) this.bindSkeletons(object, skeletons);
		this.bindLightTargets(object, collectNodes(object));
		return object;
	}

	/** Asynchronously parses a JSON scene graph. */
	parseAsync(data: unknown): Promise<unknown> {
		return Promise.resolve(this.parse(data as NodeJSON | ObjectRecord));
	}

	/** Parses geometry data from JSON, delegating to typed geometry loaders. */
	parseGeometries(json: ObjectRecord): Map<string, Geometry> {
		const geometries = new Map<string, Geometry>();
		const list = json["geometries"];
		if (list === undefined) return geometries;
		if (!Array.isArray(list)) {
			throw new TypeError("ObjectLoader: geometries must be an array.");
		}
		for (const entry of list) {
			if (!isRecord(entry)) {
				throw new TypeError(
					"ObjectLoader: each geometry must be a record.",
				);
			}
			const type = optionalString(entry, "type", "");
			const uuid = optionalString(entry, "uuid", "");
			if (uuid === "") {
				console.warn(
					"ObjectLoader: geometry entry missing uuid, skipping.",
				);
				continue;
			}
			let geometry: Geometry | undefined;
			switch (type) {
				case "BufferGeometry": {
					const loader = new BufferGeometryLoader(this.manager);
					loader.cache = this.cache;
					loader.path = this.path;
					loader.requestHeader = this.requestHeader;
					geometry = loader.parse(
						entry as unknown as Parameters<typeof loader.parse>[0],
					);
					break;
				}
				case "Geometry": {
					const loader = new GeometryLoader(this.manager);
					loader.cache = this.cache;
					loader.path = this.path;
					loader.requestHeader = this.requestHeader;
					geometry = loader.parse(
						entry as unknown as Parameters<typeof loader.parse>[0],
					);
					break;
				}
				default:
					console.warn(
						`ObjectLoader: unsupported geometry type "${type}", skipping.`,
					);
					continue;
			}
			geometries.set(uuid, geometry);
		}
		return geometries;
	}

	/** Parses material data from JSON, delegating to MaterialLoader. */
	parseMaterials(
		json: ObjectRecord,
		geometries: Map<string, Geometry>,
		textures: Map<string, Texture> = new Map(),
	): Map<string, Material> {
		void geometries;
		const materials = new Map<string, Material>();
		const list = json["materials"];
		if (list === undefined) return materials;
		if (!Array.isArray(list)) {
			throw new TypeError("ObjectLoader: materials must be an array.");
		}
		const loader = new MaterialLoader(this.manager);
		loader.cache = this.cache;
		loader.path = this.path;
		loader.requestHeader = this.requestHeader;
		loader.textures = textures;
		for (const entry of list) {
			if (!isRecord(entry)) {
				throw new TypeError(
					"ObjectLoader: each material must be a record.",
				);
			}
			const uuid = optionalString(entry, "uuid", "");
			if (uuid === "") {
				console.warn(
					"ObjectLoader: material entry missing uuid, skipping.",
				);
				continue;
			}
			const material = loader.parse(entry);
			materials.set(uuid, material);
		}
		return materials;
	}

	/** Parses animation clips from JSON. */
	parseAnimations(json: ObjectRecord): AnimationClip[] {
		const list = json["animations"];
		if (list === undefined) return [];
		if (!Array.isArray(list)) {
			throw new TypeError("ObjectLoader: animations must be an array.");
		}
		const loader = new AnimationLoader(this.manager);
		loader.cache = this.cache;
		loader.path = this.path;
		loader.requestHeader = this.requestHeader;
		return loader.parse(list as AnimationClipJSON[]);
	}

	/** Parses image URL references from JSON into a uuid→URL map. */
	parseImages(json: ObjectRecord): Map<string, unknown> {
		const images = new Map<string, unknown>();
		const list = json["images"];
		if (list === undefined) return images;
		if (!Array.isArray(list)) {
			throw new TypeError("ObjectLoader: images must be an array.");
		}
		for (const entry of list) {
			if (!isRecord(entry)) {
				throw new TypeError("ObjectLoader: each image must be a record.");
			}
			const uuid = optionalString(entry, "uuid", "");
			if (uuid === "") {
				console.warn("ObjectLoader: image entry missing uuid, skipping.");
				continue;
			}
			const url = optionalString(entry, "url", "");
			if (url !== "") {
				images.set(uuid, url);
			}
		}
		return images;
	}

	/** Asynchronously parses image references; resolves with the URL map. */
	parseImagesAsync(json: ObjectRecord): Promise<Map<string, unknown>> {
		return Promise.resolve(this.parseImages(json));
	}

	/** Parses shape data from JSON using Shape.fromJSON. */
	parseShapes(json: ObjectRecord): Map<string, Shape> {
		const shapes = new Map<string, Shape>();
		const list = json["shapes"];
		if (list === undefined) return shapes;
		if (!Array.isArray(list)) {
			throw new TypeError("ObjectLoader: shapes must be an array.");
		}
		for (const entry of list) {
			if (!isRecord(entry)) {
				throw new TypeError("ObjectLoader: each shape must be a record.");
			}
			const uuid = optionalString(entry, "uuid", "");
			if (uuid === "") {
				console.warn("ObjectLoader: shape entry missing uuid, skipping.");
				continue;
			}
			const shape = new Shape().fromJSON(entry);
			shapes.set(uuid, shape);
		}
		return shapes;
	}

	/** Parses skeleton data from JSON, resolving bone references. */
	parseSkeletons(
		json: ObjectRecord,
		bones: unknown,
	): Map<string, Skeleton> {
		const skeletons = new Map<string, Skeleton>();
		const list = json["skeletons"];
		if (list === undefined) return skeletons;
		if (!Array.isArray(list)) {
			throw new TypeError("ObjectLoader: skeletons must be an array.");
		}
		if (!Array.isArray(bones)) {
			console.warn(
				"ObjectLoader: bones must be an array, skipping skeleton parsing.",
			);
			return skeletons;
		}
		const boneMap = new Map<string, Bone>();
		for (const bone of bones) {
			if (bone instanceof Bone) boneMap.set(bone.uuid, bone);
		}
		if (boneMap.size === 0) {
			console.warn(
				"ObjectLoader: no bones available for skeleton parsing.",
			);
			return skeletons;
		}
		for (const entry of list) {
			if (!isRecord(entry)) {
				throw new TypeError(
					"ObjectLoader: each skeleton must be a record.",
				);
			}
			const uuid = optionalString(entry, "uuid", "");
			if (uuid === "") {
				console.warn(
					"ObjectLoader: skeleton entry missing uuid, skipping.",
				);
				continue;
			}
			const boneUuids = entry["bones"];
			if (!Array.isArray(boneUuids)) {
				console.warn(
					"ObjectLoader: skeleton bones must be an array, skipping.",
				);
				continue;
			}
			const skeletonBones: Bone[] = [];
			for (const boneUuid of boneUuids) {
				if (typeof boneUuid !== "string") continue;
				const bone = boneMap.get(boneUuid);
				if (bone !== undefined) skeletonBones.push(bone);
			}
			const boneInversesJson = entry["boneInverses"];
			let boneInverses: Matrix4[] = [];
			if (Array.isArray(boneInversesJson)) {
				boneInverses = boneInversesJson.map((raw) => {
					const elements = Array.isArray(raw)
						? raw
						: isRecord(raw) && Array.isArray(raw["elements"])
							? (raw["elements"] as number[])
							: undefined;
					if (
						!elements ||
						elements.length !== 16 ||
						elements.some(
							(v) => typeof v !== "number" || !Number.isFinite(v),
						)
					) {
						throw new TypeError(
							"ObjectLoader: boneInverse must contain 16 finite numbers.",
						);
					}
					return new Matrix4().fromArray(elements);
				});
			}
			const skeleton = new Skeleton(skeletonBones, boneInverses);
			skeletons.set(uuid, skeleton);
		}
		return skeletons;
	}

	/** Parses texture data from JSON, creating Texture instances. */
	parseTextures(
		json: ObjectRecord,
		images: Map<string, unknown>,
	): Map<string, Texture> {
		void images;
		const textures = new Map<string, Texture>();
		const list = json["textures"];
		if (list === undefined) return textures;
		if (!Array.isArray(list)) {
			throw new TypeError("ObjectLoader: textures must be an array.");
		}
		for (const entry of list) {
			if (!isRecord(entry)) {
				throw new TypeError(
					"ObjectLoader: each texture must be a record.",
				);
			}
			const uuid = optionalString(entry, "uuid", "");
			if (uuid === "") {
				console.warn(
					"ObjectLoader: texture entry missing uuid, skipping.",
				);
				continue;
			}
			const texture = new Texture();
			const values: Record<string, unknown> = {};
			for (const [key, value] of Object.entries(entry)) {
				if (
					key === "metadata" ||
					key === "uuid" ||
					key === "image" ||
					key === "wrap" ||
					key === "repeat" ||
					key === "offset" ||
					key === "center"
				) {
					continue;
				}
				values[key] = value;
			}
			const wrap = optionalTuple(entry, "wrap", 2);
			if (wrap !== undefined) {
				values["wrapS"] = wrap[0];
				values["wrapT"] = wrap[1];
			}
			const repeat = optionalTuple(entry, "repeat", 2);
			if (repeat !== undefined) {
				values["repeat"] = { x: repeat[0], y: repeat[1] };
			}
			const offset = optionalTuple(entry, "offset", 2);
			if (offset !== undefined) {
				values["offset"] = { x: offset[0], y: offset[1] };
			}
			const center = optionalTuple(entry, "center", 2);
			if (center !== undefined) {
				values["center"] = { x: center[0], y: center[1] };
			}
			texture.assign(values);
			hydrateUuid(texture, entry);
			const imageUuid = optionalString(entry, "image", "");
			if (imageUuid !== "") {
				texture.userData = { ...texture.userData, image: imageUuid };
			}
			textures.set(uuid, texture);
		}
		return textures;
	}

	/** Parses an object from JSON with optional geometry/material maps. */
	parseObject(
		data: ObjectRecord,
		geometries: Map<string, Geometry> = new Map(),
		materials: Map<string, Material> = new Map(),
		textures: Map<string, Texture> = new Map(),
	): Node {
		void textures;
		return this.#parseObject(data, geometries, materials, textures);
	}

	/** Binds parsed skeletons to SkinnedMesh instances in the tree. */
	bindSkeletons(object: Node, skeletons: Map<string, Skeleton>): void {
		object.traverse((node) => {
			if (!(node instanceof SkinnedMesh)) return;
			const skeletonUuid = node.userData["skeletonUuid"];
			if (typeof skeletonUuid !== "string") return;
			const skeleton = skeletons.get(skeletonUuid);
			if (skeleton !== undefined) {
				node.bind(skeleton);
			}
		});
	}

	/** Resolves light target UUIDs to scene-graph node references. */
	bindLightTargets(object: Node, lights: Map<string, Light> | Node[]): void {
		const nodeMap = new Map<string, Node>();
		if (Array.isArray(lights)) {
			for (const node of lights) {
				nodeMap.set(node.uuid, node);
			}
		} else {
			for (const [uuid, light] of lights) {
				nodeMap.set(uuid, light);
			}
		}
		object.traverse((node) => {
			if (
				node instanceof DirectionalLight ||
				node instanceof SpotLight
			) {
				const targetUuid = node.userData["targetUuid"];
				if (typeof targetUuid !== "string") return;
				const target = nodeMap.get(targetUuid);
				if (target !== undefined) {
					node.target = target;
				}
			}
		});
	}

	/** Recursively builds a concrete node from a JSON object definition. */
	#parseObject(
		json: ObjectRecord,
		geometries?: Map<string, Geometry>,
		materials?: Map<string, Material>,
		textures?: Map<string, Texture>,
	): Node {
		void textures;
		const type = optionalString(json, "type", "Node");
		let object: Node;

		switch (type) {
			case "Node":
				object = new Node();
				break;
			case "Group":
				object = new Group();
				break;
			case "Scene": {
				const scene = new Scene();
				applySceneState(scene, json);
				object = scene;
				break;
			}
			case "PerspectiveCamera": {
				const camera = new PerspectiveCamera({
					fov: optionalFiniteNumber(json, "fov", 45),
					aspect: optionalFiniteNumber(json, "aspect", 1),
					near: optionalFiniteNumber(json, "near", 0.1),
					far: optionalFiniteNumber(json, "far", 2000),
					tileSize: optionalFiniteNumber(json, "tileSize", 1),
					zoom: optionalFiniteNumber(json, "zoom", 1),
				});
				camera.focus = optionalFiniteNumber(json, "focus", camera.focus);
				camera.filmGauge = optionalFiniteNumber(
					json,
					"filmGauge",
					camera.filmGauge,
				);
				camera.filmOffset = optionalFiniteNumber(
					json,
					"filmOffset",
					camera.filmOffset,
				);
				applyCameraView(camera, json);
				camera.updateProjectionMatrix();
				object = camera;
				break;
			}
			case "OrthographicCamera": {
				const camera = new OrthographicCamera({
					left: optionalFiniteNumber(json, "left", -1),
					right: optionalFiniteNumber(json, "right", 1),
					top: optionalFiniteNumber(json, "top", 1),
					bottom: optionalFiniteNumber(json, "bottom", -1),
					near: optionalFiniteNumber(json, "near", 0.1),
					far: optionalFiniteNumber(json, "far", 2000),
					tileSize: optionalFiniteNumber(json, "tileSize", 1),
					zoom: optionalFiniteNumber(json, "zoom", 1),
				});
				applyCameraView(camera, json);
				object = camera;
				break;
			}
			case "Light":
				object = new Light(
					optionalFiniteNumber(json, "color", 0xffffff),
					optionalFiniteNumber(json, "intensity", 1),
				);
				break;
			case "AmbientLight":
				object = new AmbientLight(
					optionalFiniteNumber(json, "color", 0xffffff),
					optionalFiniteNumber(json, "intensity", 1),
				);
				break;
			case "DirectionalLight":
				object = new DirectionalLight(
					optionalFiniteNumber(json, "color", 0xffffff),
					optionalFiniteNumber(json, "intensity", 1),
				);
				break;
			case "HemisphereLight":
				object = new HemisphereLight(
					optionalFiniteNumber(json, "color", 0xffffff),
					optionalFiniteNumber(json, "groundColor", 0xffffff),
					optionalFiniteNumber(json, "intensity", 1),
				);
				break;
			case "PointLight":
				object = new PointLight(
					optionalFiniteNumber(json, "color", 0xffffff),
					optionalFiniteNumber(json, "intensity", 1),
					optionalFiniteNumber(json, "distance", 0),
					optionalFiniteNumber(json, "decay", 2),
				);
				break;
			case "SpotLight":
				object = new SpotLight(
					optionalFiniteNumber(json, "color", 0xffffff),
					optionalFiniteNumber(json, "intensity", 1),
					optionalFiniteNumber(json, "distance", 0),
					optionalFiniteNumber(json, "angle", Math.PI / 3),
					optionalFiniteNumber(json, "penumbra", 0),
					optionalFiniteNumber(json, "decay", 2),
				);
				break;
			case "LightProbe":
				object = new LightProbe(
					parseSphericalHarmonics(json),
					optionalFiniteNumber(json, "intensity", 1),
				);
				break;
			case "Mesh": {
				const { geometry, material } = resolveMeshResources(
					json,
					geometries,
					materials,
				);
				object = new Mesh(geometry, material);
				break;
			}
			case "SkinnedMesh": {
				const { geometry, material } = resolveMeshResources(
					json,
					geometries,
					materials,
				);
				object = new SkinnedMesh(geometry, material);
				break;
			}
			default:
				console.warn(
					`ObjectLoader: unsupported type "${type}", creating Node`,
				);
				object = new Node();
				break;
		}

		hydrateUuid(object, json);
		object.name = optionalString(json, "name", object.name);
		object.visible = optionalBoolean(json, "visible", object.visible);

		const userData = optionalRecord(json, "userData");
		if (userData !== undefined) object.userData = userData;

		// Store deferred binding UUIDs for post-parse resolution.
		if (type === "SkinnedMesh") {
			const skeletonUuid = optionalString(json, "skeleton", "");
			if (skeletonUuid !== "") {
				object.userData = { ...object.userData, skeletonUuid };
			}
		}
		if (type === "DirectionalLight" || type === "SpotLight") {
			const targetUuid = optionalString(json, "target", "");
			if (targetUuid !== "") {
				object.userData = { ...object.userData, targetUuid };
			}
		}

		const position = optionalTuple(json, "position", 3);
		if (position !== undefined) object.position.fromArray(position);
		const scale = optionalTuple(json, "scale", 3);
		if (scale !== undefined) object.scale.fromArray(scale);
		const quaternion = optionalTuple(json, "quaternion", 4);
		if (quaternion !== undefined) {
			object.quaternion.fromArray(quaternion);
			object.rotation.setFromQuaternion(object.quaternion);
		}
		const up = optionalTuple(json, "up", 3);
		if (up !== undefined) object.up.fromArray(up);
		const pivot = optionalTuple(json, "pivot", 3);
		if (pivot !== undefined) object.pivot = new Vector3().fromArray(pivot);

		const children = json["children"];
		if (children !== undefined) {
			if (!Array.isArray(children)) {
				throw new TypeError("ObjectLoader: children must be an array.");
			}
			for (const child of children) {
				if (
					child === null ||
					typeof child !== "object" ||
					Array.isArray(child)
				) {
					throw new TypeError("ObjectLoader: each child must be a record.");
				}
				object.add(
					this.#parseObject(
						child as ObjectRecord,
						geometries,
						materials,
						textures,
					),
				);
			}
		}

		object.updateMatrix();
		return object;
	}
}
