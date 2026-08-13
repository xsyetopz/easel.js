import path from "node:path";
import type { ApiDoc } from "./api-model.ts";
import { lexicalCompare } from "./api-model.ts";

function frontMatter(doc: ApiDoc, sidebarOrder: number): string {
	return [
		"---",
		`title: ${JSON.stringify(doc.name)}`,
		`description: ${JSON.stringify(doc.description)}`,
		"sidebar:",
		`  order: ${sidebarOrder}`,
		`  label: ${JSON.stringify(doc.name)}`,
		"---",
		"",
	].join("\n");
}

function escapeMdxText(value: string): string {
	return value.replace(/[{}]/gu, "\\$&");
}

function escapeTable(value: string): string {
	return escapeMdxText(value)
		.replace(/\|/gu, "\\|")
		.replace(/\n/gu, " ")
		.replace(/`/gu, "\\`");
}

function code(value: string): string {
	return `\`${escapeTable(value)}\``;
}

function docMarkdown(doc: ApiDoc, sidebarOrder: number): string {
	const parts = [
		frontMatter(doc, sidebarOrder),
		`> Generated from \`${doc.sourcePath}\`. Edit the source declaration or its JSDoc, then run \`bun run docs:generate\`.`,
		"",
		"```ts",
		doc.signature,
		"```",
		"",
		escapeMdxText(doc.description),
		"",
	];
	if (doc.properties.length > 0) {
		parts.push(
			"## Properties",
			"",
			"| Name | Access | Type | Description |",
			"| --- | --- | --- | --- |",
		);
		for (const property of doc.properties) {
			parts.push(
				`| ${code(property.name)} | ${property.access} | ${code(property.type)} | ${escapeTable(property.description)} |`,
			);
		}
		parts.push("");
	}
	if (doc.methods.length > 0) {
		parts.push(
			"## Methods",
			"",
			"| Signature | Description |",
			"| --- | --- |",
		);
		for (const method of doc.methods) {
			parts.push(
				`| ${code(method.signature)} | ${escapeTable(method.description)} |`,
			);
		}
		parts.push("");
	}
	return `${parts.join("\n")}\n`;
}

function categorySlug(value: string): string {
	return value.toLowerCase().replaceAll(/[^a-z0-9]+/gu, "-");
}

function overviewMarkdown(categories: [string, number][]): string {
	return `---
title: "EASEL.js API Reference"
description: "Source-generated TypeScript API reference for EASEL.js."
sidebar:
  order: 1
  label: "Overview"
---

This reference is generated from the public exports in \`src/index.ts\` and the declarations and JSDoc in \`src/\`. Do not edit generated pages.

## Categories

${categories.map(([category, count]) => `- **${category}**: ${count}`).join("\n")}
`;
}

export function renderDocs(docs: ApiDoc[]): Map<string, string> {
	const output = new Map<string, string>();
	const categoryCounts = new Map<string, number>();
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
	}
	const categories = [...categoryCounts.entries()].sort(([left], [right]) =>
		lexicalCompare(left, right),
	);
	output.set("index.md", overviewMarkdown(categories));
	return output;
}
