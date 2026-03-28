import type { DocCatalogData, DocEntry } from "./loaders/docs.ts";
import type {
	ExampleCatalogData,
	ExampleRouteData,
} from "./loaders/examples.ts";

export interface InitialPayload {
	docCatalog?: DocCatalogData;
	exampleCatalog?: ExampleCatalogData;
	initialDoc?: DocEntry;
	initialExample?: ExampleRouteData;
}

export function readInitialPayload() {
	if (typeof document === "undefined") return undefined;

	const payloadElement = document.getElementById("easel-initial-payload");
	if (!payloadElement?.textContent) return undefined;

	return JSON.parse(payloadElement.textContent) as InitialPayload;
}
