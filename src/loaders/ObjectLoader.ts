import { Node } from "../core/Node.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";
import type { LoadingManager } from "./LoadingManager.ts";

/** Loads a JSON scene graph and returns a Node hierarchy. */
export class ObjectLoader extends Loader {
	constructor(manager: LoadingManager | undefined = undefined) {
		super(manager);
	}

	override load(
		url: string,
		onLoad?: (node: Node) => void,
		onProgress: ((event: ProgressEvent) => void) | undefined = undefined,
		onError: ((err: unknown) => void) | undefined = undefined,
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

	parse(json: Record<string, unknown>): Node {
		return this.parseObject(json);
	}

	/** Recursively builds a Node from a JSON object definition. */
	parseObject(json: Record<string, unknown>): Node {
		let object: Node;

		switch (json["type"]) {
			case "Node":
			case "Group":
			case "Scene":
				object = new Node();
				break;
			default:
				console.warn(
					`ObjectLoader: unsupported type "${json["type"]}", creating Node`,
				);
				object = new Node();
				break;
		}

		if (json["name"] !== undefined) {
			object.name = json["name"] as string;
		}
		if (json["visible"] !== undefined) {
			object.visible = json["visible"] as boolean;
		}
		if (json["userData"] != null)
			object.userData = json["userData"] as Record<string, unknown>;

		if (json["position"]) {
			const pos = json["position"] as number[];
			object.position.set(pos[0], pos[1], pos[2]);
		}
		if (json["scale"]) {
			const sc = json["scale"] as number[];
			object.scale.set(sc[0], sc[1], sc[2]);
		}

		if (Array.isArray(json["children"])) {
			for (const childJson of json["children"] as Record<string, unknown>[]) {
				object.add(this.parseObject(childJson));
			}
		}

		return object;
	}
}
