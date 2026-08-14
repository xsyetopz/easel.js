import { defineCollection } from "astro:content";
import { docsSchema } from "@astrojs/starlight/schema";
import { glob } from "astro/loaders";

const DOC_EXTENSION_RE = /\.(markdown|mdown|mkdn|mkd|mdwn|md|mdx)$/u;
const INDEX_SUFFIX_RE = /\/index$/u;

/**
 * The source generator writes API Markdown below content/docs/docs. Keep the
 * category segment in the route so links are stable and useful to readers
 * (`/docs/renderers/Renderer/`, not a flat symbol URL).
 *
 * Manual pages live beside the generated collection at content/manual and are
 * loaded into the same Starlight collection so they get the same Markdown
 * renderer, search index, navigation, and accessible page shell.
 */
function contentId(entry: string) {
  const withoutExtension = entry.replace(DOC_EXTENSION_RE, "");
  const withoutIndex = withoutExtension.replace(INDEX_SUFFIX_RE, "");

  if (withoutIndex === "docs/docs") return "docs";
  if (withoutIndex.startsWith("docs/docs/")) {
    return withoutIndex.slice("docs/".length);
  }
  return withoutIndex;
}

export const collections = {
  docs: defineCollection({
    loader: glob({
      base: "./www/astro/content",
      pattern: [
        "docs/docs/**/[!_]*.{markdown,mdown,mkdn,mkd,mdwn,md,mdx}",
        "manual/**/[!_]*.{markdown,mdown,mkdn,mkd,mdwn,md,mdx}",
      ],
      generateId: ({ entry }) => contentId(entry),
    }),
    schema: docsSchema(),
  }),
};
