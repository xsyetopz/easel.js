import { useEffect, useState } from "react";
import {
	type ExampleCatalogData,
	loadExampleCatalog,
} from "../loaders/examples.ts";

export function useExampleCatalog(initialCatalog?: ExampleCatalogData) {
	const [catalog, setCatalog] = useState<ExampleCatalogData | null>(
		initialCatalog ?? null,
	);

	useEffect(() => {
		if (catalog) return;

		let active = true;
		loadExampleCatalog().then((nextCatalog) => {
			if (!active) return;
			setCatalog(nextCatalog);
		});

		return () => {
			active = false;
		};
	}, [catalog]);

	return catalog;
}
