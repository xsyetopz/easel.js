import path from "node:path";
import type { ApiDoc } from "./api-model.ts";
import { lexicalCompare } from "./api-model.ts";

function frontMatter(doc: ApiDoc, sidebarOrder: number): string {
  const lines = ["---", `title: ${JSON.stringify(doc.name)}`];
  if (doc.description) {
    lines.push(`description: ${JSON.stringify(doc.description)}`);
  }
  lines.push(
    "sidebar:",
    `  order: ${sidebarOrder}`,
    `  label: ${JSON.stringify(doc.name)}`,
    "---",
    "",
  );
  return lines.join("\n");
}

function escapeMdxText(value: string): string {
  return value.replace(/[{}]/gu, "\\$&");
}

function docMarkdown(doc: ApiDoc, sidebarOrder: number): string {
  return `${frontMatter(doc, sidebarOrder)}${doc.description ? `${escapeMdxText(doc.description)}\n` : ""}`;
}

function categorySlug(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/gu, "-");
}

interface OverviewCategory {
  category: string;
  pages: { name: string; fileName: string }[];
}

function overviewMarkdown(categories: OverviewCategory[]): string {
  const contents = categories
    .map(({ category, pages }) => {
      const slug = categorySlug(category);
      const links = pages
        .map(
          ({ name, fileName }) =>
            `- [${name}](./${slug}/${encodeURIComponent(fileName)}/)`,
        )
        .join("\n");
      return `### ${category}\n\n${links}`;
    })
    .join("\n\n");

  return `---
title: "EASEL.js API Reference"
description: "Browse the public EASEL.js API by category and symbol."
sidebar:
  order: 1
  label: "Overview"
---

Use search for a known symbol, or browse the complete index below.

## Table of contents

${contents}
`;
}

export function renderDocs(docs: ApiDoc[]): Map<string, string> {
  const output = new Map<string, string>();
  const categoryCounts = new Map<string, number>();
  const overviewCategories = new Map<
    string,
    { name: string; fileName: string }[]
  >();
  const caseFoldedNames = new Map<string, number>();
  for (const doc of docs) {
    const key = `${doc.category}/${doc.name}`.toLocaleLowerCase("en-US");
    caseFoldedNames.set(key, (caseFoldedNames.get(key) ?? 0) + 1);
  }
  for (const doc of docs) {
    const order = (categoryCounts.get(doc.category) ?? 0) + 1;
    categoryCounts.set(doc.category, order);
    const foldedKey = `${doc.category}/${doc.name}`.toLocaleLowerCase("en-US");
    const fileName =
      caseFoldedNames.get(foldedKey) === 1
        ? doc.name
        : `${doc.name}-${doc.kind}`;
    output.set(
      path.join(categorySlug(doc.category), `${fileName}.md`),
      docMarkdown(doc, order),
    );
    const overviewPages = overviewCategories.get(doc.category) ?? [];
    overviewPages.push({ name: doc.name, fileName });
    overviewCategories.set(doc.category, overviewPages);
  }
  const categories = [...overviewCategories]
    .sort(([left], [right]) => lexicalCompare(left, right))
    .map(([category, pages]) => ({
      category,
      pages: pages.sort((left, right) => lexicalCompare(left.name, right.name)),
    }));
  output.set("index.md", overviewMarkdown(categories));
  return output;
}
