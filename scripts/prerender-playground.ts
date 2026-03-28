import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";
import { landingPages } from "../playground/content/landingPages.ts";
import { loadDocCatalog, loadDocDetail } from "../playground/loaders/docs.ts";
import {
	buildExampleRouteData,
	loadExampleCatalog,
	loadExampleModule,
} from "../playground/loaders/examples.ts";
import { Root } from "../playground/Root.tsx";
import { type AppRoute, routeToPath } from "../playground/routes.ts";
import {
	buildHeadMarkup,
	getPageMetadata,
	SITE_ORIGIN,
} from "../playground/seo.ts";

const DIST_DIR = join(import.meta.dir, "..", "dist", "playground");
const TEMPLATE_PATH = join(DIST_DIR, "index.html");
const SEO_MARKER_PATTERN =
	/<!-- SEO_HEAD_START -->([\s\S]*?)<!-- SEO_HEAD_END -->/;
const LEADING_SLASH_PATTERN = /^\/+/;
const SCRIPT_CLOSE_TAG_PATTERN = /<\/script/gi;

interface InitialPayload {
	docCatalog?: Awaited<ReturnType<typeof loadDocCatalog>>;
	exampleCatalog?: Awaited<ReturnType<typeof loadExampleCatalog>>;
}

function buildOutputPath(routePath: string) {
	const normalized =
		routePath === "/" ? "" : routePath.replace(LEADING_SLASH_PATTERN, "");
	return join(DIST_DIR, normalized, "index.html");
}

function buildSitemapXml(paths: string[]) {
	const today = new Date().toISOString().slice(0, 10);
	const body = paths
		.map(
			(path) =>
				`<url><loc>${SITE_ORIGIN}${path}</loc><lastmod>${today}</lastmod></url>`,
		)
		.join("");

	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>\n`;
}

function serializeInitialPayload(payload: InitialPayload) {
	return JSON.stringify(payload)
		.replaceAll("<", "\\u003c")
		.replace(SCRIPT_CLOSE_TAG_PATTERN, "<\\/script");
}

async function main() {
	const template = await readFile(TEMPLATE_PATH, "utf8");
	const exampleCatalog = await loadExampleCatalog();
	const docCatalog = await loadDocCatalog();
	const routes: AppRoute[] = [
		{ page: "home" },
		{ page: "examples" },
		{ page: "docs" },
		...exampleCatalog.examples.map((example) => ({
			page: "example" as const,
			param: example.meta.id,
		})),
		...docCatalog.docClasses.map((doc) => ({
			page: "doc" as const,
			param: doc.id,
		})),
		...landingPages.map((page) => ({
			page: "landing" as const,
			slug: page.slug,
		})),
	];
	const allPaths: string[] = [];

	for (const route of routes) {
		const initialPayload: InitialPayload = {};
		if (route.page === "examples") {
			initialPayload.exampleCatalog = exampleCatalog;
		}
		if (route.page === "example") {
			const exampleModule = await loadExampleModule(route.param);
			initialPayload.exampleCatalog = exampleCatalog;
			if (exampleModule) {
				initialPayload.initialExample = buildExampleRouteData(exampleModule);
			}
		}
		if (route.page === "docs") {
			initialPayload.docCatalog = docCatalog;
		}
		if (route.page === "doc") {
			initialPayload.docCatalog = docCatalog;
			initialPayload.initialDoc =
				(await loadDocDetail(route.param)) ?? undefined;
		}
		const routePath = routeToPath(route);
		const metadata = getPageMetadata(route, initialPayload);
		const appHtml = renderToString(
			React.createElement(Root, {
				initialPayload,
				initialRoute: route,
			}),
		);
		const html = template
			.replace(
				SEO_MARKER_PATTERN,
				`<!-- SEO_HEAD_START -->\n\t\t${buildHeadMarkup(metadata)}\n\t\t<!-- SEO_HEAD_END -->`,
			)
			.replace(
				'<div id="root"></div>',
				`<div id="root">${appHtml}</div>\n\t\t<script id="easel-initial-payload" type="application/json">${serializeInitialPayload(initialPayload)}</script>`,
			);
		const outputPath = buildOutputPath(routePath);

		await mkdir(dirname(outputPath), { recursive: true });
		await writeFile(outputPath, html, "utf8");
		allPaths.push(routePath);
	}

	await writeFile(
		join(DIST_DIR, "sitemap.xml"),
		buildSitemapXml(allPaths),
		"utf8",
	);
	await writeFile(
		join(DIST_DIR, "robots.txt"),
		`User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`,
		"utf8",
	);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
