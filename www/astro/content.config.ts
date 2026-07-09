import { defineCollection } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

const DOC_EXTENSION_RE = /\.(markdown|mdown|mkdn|mkd|mdwn|md|mdx)$/;
const INDEX_SUFFIX_RE = /\/index$/;

function generatedDocsId(entry: string) {
	const withoutExtension = entry.replace(DOC_EXTENSION_RE, "");
	const withoutIndex = withoutExtension.replace(INDEX_SUFFIX_RE, "");

	if (withoutIndex === "docs") return "docs";
	if (!withoutIndex.startsWith("docs/")) return withoutIndex;

	const leaf = withoutIndex.split("/").at(-1);
	return leaf ? `docs/${leaf}` : "docs";
}

export const collections = {
	docs: defineCollection({
		loader: docsLoader({
			generateId: ({ entry }: { entry: string }) => generatedDocsId(entry),
		}),
		schema: docsSchema(),
	}),
};
