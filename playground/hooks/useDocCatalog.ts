import { useEffect, useState } from "react";
import { type DocCatalogData, loadDocCatalog } from "../loaders/docs.ts";

export function useDocCatalog(initialCatalog?: DocCatalogData) {
	const [catalog, setCatalog] = useState<DocCatalogData | null>(
		initialCatalog ?? null,
	);

	useEffect(() => {
		if (catalog) return;

		let active = true;
		loadDocCatalog().then((nextCatalog) => {
			if (!active) return;
			setCatalog(nextCatalog);
		});

		return () => {
			active = false;
		};
	}, [catalog]);

	return catalog;
}
