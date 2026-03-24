import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";

interface GeometryJSON {
	attributes: Record<string, { array: number[]; itemSize: number }>;
	index?: { array: number[] };
}

/** Loads a JSON geometry definition and returns a Geometry instance. */
export class GeometryLoader extends Loader {
	override load(
		url: string,
		onLoad?: (geometry: Geometry) => void,
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
				onLoad?.(this.parse(json as GeometryJSON));
			},
			onProgress,
			onError,
		);
	}

	parse(json: GeometryJSON): Geometry {
		const geometry = new Geometry();

		for (const [name, attribData] of Object.entries(json.attributes ?? {})) {
			const array = new Float32Array(attribData.array);
			geometry.setAttribute(name, new Attribute(array, attribData.itemSize));
		}

		if (json.index) {
			geometry.setIndex(json.index.array);
		}

		return geometry;
	}
}
