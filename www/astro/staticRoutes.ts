import { landingPages } from "../content/landingPages.ts";
import { loadExampleCatalog } from "../loaders/examples.ts";
import { type AppRoute, routeToPath } from "../routes.ts";
import { getPageMetadata, type PageMetadata } from "../seo.ts";

export interface StaticRouteEntry {
	route: AppRoute;
	path: string;
	metadata: PageMetadata;
}

export async function loadStaticRouteEntries(): Promise<StaticRouteEntry[]> {
	const exampleCatalog = await loadExampleCatalog();
	const routes: AppRoute[] = [
		{ page: "home" },
		{ page: "examples" },
		...exampleCatalog.examples.map((example) => ({
			page: "example" as const,
			param: example.meta.id,
		})),
		...landingPages.map((page) => ({
			page: "landing" as const,
			slug: page.slug,
		})),
	];

	return routes.map((route) => ({
		route,
		path: routeToPath(route),
		metadata: getPageMetadata(route, { exampleCatalog }),
	}));
}
