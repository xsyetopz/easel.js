import { landingPagesBySlug } from "./content/landingPages.ts";
import type { ExampleCatalogData } from "./loaders/examples.ts";
import { type AppRoute, routeToPath } from "./routes.ts";

export const SITE_ORIGIN = "https://easeljs.org";
const DEFAULT_SOCIAL_IMAGE_PATH = "/og/easel-og.svg";
const CORE_KEYWORDS = [
  "canvas2d software renderer",
  "software renderer javascript",
  "cpu rasterizer javascript",
  "javascript rasterizer",
  "THREE.js canvas renderer",
  "THREE.js alternative",
  "easeljs alternative",
  "createjs easeljs alternative",
  "easeljs replacement",
  "html5 canvas 3d renderer",
  "browser rasterizer",
  "canvas renderer 3d",
];

export interface PageMetadata {
  title: string;
  description: string;
  canonicalPath: string;
  openGraphType: "website" | "article";
  structuredData: Record<string, unknown>;
  keywords?: string[];
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
    ...(metadata.keywords !== undefined && metadata.keywords.length > 0
      ? { keywords: metadata.keywords.join(", ") }
      : {}),
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

function removeMeta(attribute: "name" | "property", key: string): void {
  document.head
    .querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
    ?.remove();
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
  if (metadata.keywords !== undefined && metadata.keywords.length > 0) {
    upsertMeta("name", "keywords", metadata.keywords.join(", "));
  } else {
    removeMeta("name", "keywords");
  }
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
  exampleCatalog?: ExampleCatalogData;
}

function humanizeParam(value: string) {
  return value
    .replaceAll(/[-_]/gu, " ")
    .replaceAll(/\b\w/gu, (match) => match.toUpperCase());
}

function getExampleById(exampleId: string, metadataPayload?: MetadataPayload) {
  return (
    metadataPayload?.exampleCatalog?.examples.find(
      (example) => example.meta.id === exampleId,
    ) ?? null
  );
}

export function getPageMetadata(
  route: AppRoute,
  metadataPayload?: MetadataPayload,
): PageMetadata {
  switch (route.page) {
    case "home": {
      const description =
        "Software 3D renderer for browser Canvas2D with a THREE-style scene graph, CPU rasterization, docs, and crawlable examples.";
      return {
        title: "EASEL.js | Software 3D for Canvas2D",
        description,
        canonicalPath: "/",
        openGraphType: "website",
        keywords: CORE_KEYWORDS,
        structuredData: {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "EASEL.js",
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Web Browser",
          url: SITE_ORIGIN,
          description,
          keywords: CORE_KEYWORDS.join(", "),
        },
      };
    }
    case "examples": {
      const metadata = {
        title: "Examples | EASEL.js",
        description:
          "Crawlable EASEL.js examples aligned to supported three.js animation, controls, and raycaster concepts on a CPU Canvas2D renderer.",
        canonicalPath: "/examples",
        openGraphType: "website" as const,
        structuredData: {},
        keywords: [
          "canvas2d examples",
          "software renderer examples",
          "javascript rasterizer examples",
          "easeljs examples",
        ],
      };
      return { ...metadata, structuredData: buildStructuredData(metadata) };
    }
    case "example": {
      const example = getExampleById(route.param, metadataPayload);
      const metadata = example
        ? {
            title: `${example.meta.name} Example | EASEL.js`,
            description: `${example.meta.description} Live Canvas2D example with paired EASEL.js and THREE.js code where available.`,
            canonicalPath: routeToPath(route),
            openGraphType: "article" as const,
            structuredData: {},
            keywords: [
              example.meta.name,
              "easeljs example",
              "THREE.js example",
              "canvas2d renderer example",
              "software renderer javascript",
            ],
          }
        : {
            title: `${humanizeParam(route.param)} Example | EASEL.js`,
            description:
              "EASEL.js example with Canvas2D output and migration-oriented code.",
            canonicalPath: routeToPath(route),
            openGraphType: "article" as const,
            structuredData: {},
            keywords: CORE_KEYWORDS,
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
            keywords: page.keywords,
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
        description: "Software 3D renderer for Canvas2D.",
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
  const keywords = metadata.keywords?.join(", ");

  return [
    `<title>${escapeHtml(metadata.title)}</title>`,
    `<meta name="description" content="${escapeHtml(metadata.description)}">`,
    keywords ? `<meta name="keywords" content="${escapeHtml(keywords)}">` : "",
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
  ]
    .filter(Boolean)
    .join("\n\t\t");
}
