import { landingPagesBySlug } from "./content/landingPages.ts";
import type { DocCatalogData } from "./loaders/docs.ts";
import type { ExampleCatalogData } from "./loaders/examples.ts";
import { type AppRoute, routeToPath } from "./routes.ts";

export const SITE_ORIGIN = "https://easeljs.org";
const DEFAULT_SOCIAL_IMAGE_PATH = "/og/easel-og.svg";

export interface PageMetadata {
	title: string;
	description: string;
	canonicalPath: string;
	openGraphType: "website" | "article";
	structuredData: Record<string, unknown>;
}

function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll('"', "&quot;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");
}

function escapeJsonForHtml(value: string) {
	return value.replaceAll("<", "\\u003c");
}

function buildStructuredData(metadata: PageMetadata) {
	return {
		"@context": "https://schema.org",
		"@type": metadata.openGraphType === "article" ? "TechArticle" : "WebPage",
		name: metadata.title,
		description: metadata.description,
		url: `${SITE_ORIGIN}${metadata.canonicalPath}`,
		isPartOf: {
			"@type": "WebSite",
			name: "EASEL.js",
			url: SITE_ORIGIN,
		},
	};
}

function upsertMeta(
	attribute: "name" | "property",
	key: string,
	content: string,
): void {
	let node = document.head.querySelector<HTMLMetaElement>(
		`meta[${attribute}="${key}"]`,
	);
	if (!node) {
		node = document.createElement("meta");
		node.setAttribute(attribute, key);
		document.head.append(node);
	}
	node.content = content;
}

function upsertLink(rel: string, href: string): void {
	let node = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
	if (!node) {
		node = document.createElement("link");
		node.rel = rel;
		document.head.append(node);
	}
	node.href = href;
}

function upsertStructuredData(structuredData: Record<string, unknown>): void {
	let node = document.head.querySelector<HTMLScriptElement>(
		"#seo-structured-data",
	);
	if (!node) {
		node = document.createElement("script");
		node.id = "seo-structured-data";
		node.type = "application/ld+json";
		document.head.append(node);
	}
	node.textContent = JSON.stringify(structuredData);
}

export function applyDocumentMetadata(metadata: PageMetadata) {
	const canonicalUrl = `${SITE_ORIGIN}${metadata.canonicalPath}`;
	const imageUrl = `${SITE_ORIGIN}${DEFAULT_SOCIAL_IMAGE_PATH}`;

	document.title = metadata.title;
	upsertMeta("name", "description", metadata.description);
	upsertMeta("name", "twitter:card", "summary_large_image");
	upsertMeta("name", "twitter:title", metadata.title);
	upsertMeta("name", "twitter:description", metadata.description);
	upsertMeta("name", "twitter:image", imageUrl);
	upsertMeta("property", "og:type", metadata.openGraphType);
	upsertMeta("property", "og:title", metadata.title);
	upsertMeta("property", "og:description", metadata.description);
	upsertMeta("property", "og:url", canonicalUrl);
	upsertMeta("property", "og:image", imageUrl);
	upsertLink("canonical", canonicalUrl);
	upsertStructuredData(metadata.structuredData);
}

interface MetadataPayload {
	docCatalog?: DocCatalogData;
	exampleCatalog?: ExampleCatalogData;
}

function humanizeParam(value: string) {
	return value
		.replaceAll(/[-_]/g, " ")
		.replaceAll(/\b\w/g, (match) => match.toUpperCase());
}

function getExampleById(exampleId: string, metadataPayload?: MetadataPayload) {
	return (
		metadataPayload?.exampleCatalog?.examples.find(
			(example) => example.meta.id === exampleId,
		) ?? null
	);
}

function getDocById(classId: string, metadataPayload?: MetadataPayload) {
	return (
		metadataPayload?.docCatalog?.docClasses.find((doc) => doc.id === classId) ??
		null
	);
}

export function getPageMetadata(
	route: AppRoute,
	metadataPayload?: MetadataPayload,
): PageMetadata {
	switch (route.page) {
		case "home": {
			const description =
				"Canvas2D software renderer for the browser with a THREE.js-style scene graph, CPU rasterization, live docs, and examples built for migration and retro 3D rendering.";
			return {
				title:
					"EASEL.js | Canvas2D Software Renderer with a THREE.js-Style API",
				description,
				canonicalPath: "/",
				openGraphType: "website",
				structuredData: {
					"@context": "https://schema.org",
					"@type": "SoftwareApplication",
					name: "EASEL.js",
					applicationCategory: "DeveloperApplication",
					operatingSystem: "Web Browser",
					url: SITE_ORIGIN,
					description,
				},
			};
		}
		case "examples": {
			const metadata = {
				title: "Examples | EASEL.js Canvas2D Renderer Demos",
				description:
					"Interactive EASEL.js examples covering lighting, materials, geometry, animation, textures, raycasting, and software-rasterizer performance.",
				canonicalPath: "/examples",
				openGraphType: "website" as const,
				structuredData: {},
			};
			return { ...metadata, structuredData: buildStructuredData(metadata) };
		}
		case "example": {
			const example = getExampleById(route.param, metadataPayload);
			const metadata = example
				? {
						title: `${example.meta.name} Example | EASEL.js`,
						description: `${example.meta.description} Live Canvas2D demo with paired EASEL.js and THREE.js code where available.`,
						canonicalPath: routeToPath(route),
						openGraphType: "article" as const,
						structuredData: {},
					}
				: {
						title: `${humanizeParam(route.param)} Example | EASEL.js`,
						description:
							"Interactive EASEL.js example page with live Canvas2D rendering and migration-oriented code samples.",
						canonicalPath: routeToPath(route),
						openGraphType: "article" as const,
						structuredData: {},
					};
			return { ...metadata, structuredData: buildStructuredData(metadata) };
		}
		case "docs": {
			const metadata = {
				title: "API Reference | EASEL.js",
				description:
					"Browse the EASEL.js API reference with THREE.js equivalents, divergence notes, and class-by-class documentation for the Canvas2D software renderer.",
				canonicalPath: "/docs",
				openGraphType: "website" as const,
				structuredData: {},
			};
			return { ...metadata, structuredData: buildStructuredData(metadata) };
		}
		case "doc": {
			const doc = getDocById(route.param, metadataPayload);
			const metadata = doc
				? {
						title: `${doc.name} API Reference | EASEL.js`,
						description: `${doc.description}${doc.threeEquivalent ? ` THREE.js equivalent: ${doc.threeEquivalent}.` : ""}`,
						canonicalPath: routeToPath(route),
						openGraphType: "article" as const,
						structuredData: {},
					}
				: {
						title: `${humanizeParam(route.param)} API Reference | EASEL.js`,
						description:
							"EASEL.js API reference page for the requested class or subsystem.",
						canonicalPath: routeToPath(route),
						openGraphType: "article" as const,
						structuredData: {},
					};
			return { ...metadata, structuredData: buildStructuredData(metadata) };
		}
		case "landing": {
			const page = landingPagesBySlug[route.slug];
			const metadata = page
				? {
						title: `${page.title} | EASEL.js`,
						description: page.description,
						canonicalPath: routeToPath(route),
						openGraphType: "article" as const,
						structuredData: {},
					}
				: {
						title: "Page Not Found | EASEL.js",
						description: "Requested EASEL.js landing page could not be found.",
						canonicalPath: routeToPath(route),
						openGraphType: "article" as const,
						structuredData: {},
					};
			return { ...metadata, structuredData: buildStructuredData(metadata) };
		}
		default: {
			const metadata = {
				title: "EASEL.js",
				description:
					"Canvas2D software renderer for the browser with a THREE.js-style scene graph.",
				canonicalPath: "/",
				openGraphType: "website" as const,
				structuredData: {},
			};
			return { ...metadata, structuredData: buildStructuredData(metadata) };
		}
	}
}

export function applyPageMetadata(metadata: PageMetadata) {
	applyDocumentMetadata(metadata);
}

export function buildHeadMarkup(metadata: PageMetadata) {
	const canonicalUrl = `${SITE_ORIGIN}${metadata.canonicalPath}`;
	const imageUrl = `${SITE_ORIGIN}${DEFAULT_SOCIAL_IMAGE_PATH}`;

	return [
		`<title>${escapeHtml(metadata.title)}</title>`,
		`<meta name="description" content="${escapeHtml(metadata.description)}">`,
		`<link rel="canonical" href="${escapeHtml(canonicalUrl)}">`,
		'<meta name="robots" content="index,follow">',
		`<meta property="og:type" content="${escapeHtml(metadata.openGraphType)}">`,
		`<meta property="og:title" content="${escapeHtml(metadata.title)}">`,
		`<meta property="og:description" content="${escapeHtml(metadata.description)}">`,
		`<meta property="og:url" content="${escapeHtml(canonicalUrl)}">`,
		`<meta property="og:image" content="${escapeHtml(imageUrl)}">`,
		'<meta name="twitter:card" content="summary_large_image">',
		`<meta name="twitter:title" content="${escapeHtml(metadata.title)}">`,
		`<meta name="twitter:description" content="${escapeHtml(metadata.description)}">`,
		`<meta name="twitter:image" content="${escapeHtml(imageUrl)}">`,
		`<script id="seo-structured-data" type="application/ld+json">${escapeJsonForHtml(JSON.stringify(metadata.structuredData))}</script>`,
	].join("\n\t\t");
}
