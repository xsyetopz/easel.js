import { OrthographicCamera } from "../cameras/OrthographicCamera.ts";
import { Node } from "../core/Node.ts";
import { Scene } from "../core/Scene.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { BoxGeometry } from "../geometry/primitives/BoxGeometry.ts";
import { SphericalHarmonics3 } from "../math/SphericalHarmonics3.ts";
import { BasicMaterial } from "../materials/BasicMaterial.ts";
import { Material } from "../materials/Material.ts";
import { Bone } from "../objects/Bone.ts";
import { PerspectiveCamera } from "../cameras/PerspectiveCamera.ts";
import { Fog, FogExp2 } from "../scenes/Fog.ts";

export type ObjectRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is ObjectRecord {
	return typeof value === "object" && value !== undefined && !Array.isArray(value);
}

export function optionalFiniteNumber(
	json: ObjectRecord,
	key: string,
	fallback: number,
): number {
	const value = json[key];
	if (value === undefined) return fallback;
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throw new TypeError(`ObjectLoader: ${key} must be a finite number.`);
	}
	return value;
}

export function requiredFiniteNumber(json: ObjectRecord, key: string): number {
	const value = json[key];
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throw new TypeError(`ObjectLoader: ${key} must be a finite number.`);
	}
	return value;
}

export function optionalBoolean(
	json: ObjectRecord,
	key: string,
	fallback: boolean,
): boolean {
	const value = json[key];
	if (value === undefined) return fallback;
	if (typeof value !== "boolean") {
		throw new TypeError(`ObjectLoader: ${key} must be a boolean.`);
	}
	return value;
}

export function optionalString(
	json: ObjectRecord,
	key: string,
	fallback: string,
): string {
	const value = json[key];
	if (value === undefined) return fallback;
	if (typeof value !== "string") {
		throw new TypeError(`ObjectLoader: ${key} must be a string.`);
	}
	return value;
}

export function optionalTuple(
	json: ObjectRecord,
	key: string,
	length: number,
): number[] | undefined {
	const value = json[key];
	if (value === undefined) return;
	if (
		!Array.isArray(value) ||
		value.length !== length ||
		value.some(
			(component) =>
				typeof component !== "number" || !Number.isFinite(component),
		)
	) {
		throw new TypeError(
			`ObjectLoader: ${key} must contain ${length} finite numbers.`,
		);
	}
	return value;
}

export function optionalRecord(
	json: ObjectRecord,
	key: string,
): ObjectRecord | undefined {
	const value = json[key];
	if (value === undefined) return;
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		throw new TypeError(`ObjectLoader: ${key} must be a record.`);
	}
	return value as ObjectRecord;
}

export function hydrateUuid(object: { uuid: string }, json: ObjectRecord): void {
	const uuid = json["uuid"];
	if (uuid === undefined) return;
	if (typeof uuid !== "string") {
		throw new TypeError("ObjectLoader: uuid must be a string.");
	}
	Object.defineProperty(object, "uuid", {
		value: uuid,
		enumerable: true,
		writable: false,
	});
}

export function parseSphericalHarmonics(json: ObjectRecord): SphericalHarmonics3 {
	const sh = optionalTuple(json, "sh", 27);
	if (sh === undefined) {
		throw new TypeError("ObjectLoader: LightProbe requires 27 SH components.");
	}
	return new SphericalHarmonics3().fromArray(sh);
}

export function applySceneState(scene: Scene, json: ObjectRecord): void {
	const background = json["background"];
	if (background !== undefined) {
		if (typeof background !== "number" || !Number.isFinite(background)) {
			throw new TypeError(
				"ObjectLoader: texture backgrounds require an explicit texture resource context.",
			);
		}
		scene.background = background;
	}

	const fog = optionalRecord(json, "fog");
	if (fog === undefined) return;
	const type = optionalString(fog, "type", "Fog");
	const color = requiredFiniteNumber(fog, "color");
	const far = requiredFiniteNumber(fog, "far");
	if (type === "FogExp2") {
		scene.fog = new FogExp2(color, requiredFiniteNumber(fog, "density"), far);
	} else if (type === "Fog") {
		scene.fog = new Fog({
			color,
			near: requiredFiniteNumber(fog, "near"),
			far,
		});
	} else {
		throw new TypeError(`ObjectLoader: unsupported fog type "${type}".`);
	}
	scene.fog.name = optionalString(fog, "name", "");
}

export function applyCameraView(
	object: PerspectiveCamera | OrthographicCamera,
	json: ObjectRecord,
): void {
	const view = optionalRecord(json, "view");
	if (view === undefined) return;
	const fullWidth = requiredFiniteNumber(view, "fullWidth");
	const fullHeight = requiredFiniteNumber(view, "fullHeight");
	const offsetX = requiredFiniteNumber(view, "offsetX");
	const offsetY = requiredFiniteNumber(view, "offsetY");
	const width = requiredFiniteNumber(view, "width");
	const height = requiredFiniteNumber(view, "height");
	object.setViewOffset(fullWidth, fullHeight, offsetX, offsetY, width, height);
	if (!optionalBoolean(view, "enabled", true)) object.clearViewOffset();
}

/** Collects all Bone descendants from a node hierarchy. */
export function collectBones(object: Node): Bone[] {
	const bones: Bone[] = [];
	object.traverse((node) => {
		if (node instanceof Bone) bones.push(node);
	});
	return bones;
}

/** Collects all descendant nodes (including the root) into a flat array. */
export function collectNodes(object: Node): Node[] {
	const nodes: Node[] = [];
	object.traverse((node) => nodes.push(node));
	return nodes;
}

/** Resolves geometry and material from parsed maps, with fallbacks. */
export function resolveMeshResources(
	json: ObjectRecord,
	geometries?: Map<string, Geometry>,
	materials?: Map<string, Material>,
): { geometry: Geometry; material: Material } {
	let geometry: Geometry | undefined;
	let material: Material | undefined;

	const geometryUuid = optionalString(json, "geometry", "");
	if (geometryUuid !== "" && geometries !== undefined) {
		geometry = geometries.get(geometryUuid);
	}

	const materialJson = json["material"];
	if (typeof materialJson === "string" && materials !== undefined) {
		material = materials.get(materialJson);
	} else if (
		Array.isArray(materialJson) &&
		materialJson.length > 0 &&
		typeof materialJson[0] === "string" &&
		materials !== undefined
	) {
		material = materials.get(materialJson[0] as string);
	}

	return {
		geometry: geometry ?? new BoxGeometry(),
		material: material ?? new BasicMaterial(),
	};
}
