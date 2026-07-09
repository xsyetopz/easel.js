import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const docsRoot = path.join(repoRoot, "www", "astro", "content", "docs", "docs");

const { docCategories, docClasses } = await import("../www/docs/classes.ts");

function slugify(value) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function escapeYamlString(value) {
	return JSON.stringify(String(value));
}

function yamlValue(value, indent = "") {
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	if (value && typeof value === "object" && !Array.isArray(value)) {
		return [
			"",
			...Object.entries(value).map(
				([key, nestedValue]) =>
					`${indent}  ${key}: ${yamlValue(nestedValue, `${indent}  `)}`,
			),
		].join("\n");
	}
	return escapeYamlString(value);
}

function frontMatter(fields) {
	const lines = ["---"];
	for (const [key, value] of Object.entries(fields)) {
		lines.push(`${key}: ${yamlValue(value)}`);
	}
	lines.push("---", "");
	return `${lines.join("\n")}\n`;
}

function escapeMdxText(value) {
	return String(value).replace(/[{}]/g, "\\$&");
}

function escapeTable(value) {
	return escapeMdxText(value)
		.replace(/\|/g, "\\|")
		.replace(/\n/g, " ")
		.replace(/`/g, "\\`");
}

function escapeTableCode(value) {
	return String(value)
		.replace(/\|/g, "\\|")
		.replace(/\n/g, " ")
		.replace(/`/g, "\\`");
}

function code(value) {
	return `\`${escapeTableCode(value)}\``;
}

function docToMarkdown(doc, sidebarOrder) {
	const parts = [
		frontMatter({
			title: doc.name,
			description: doc.description,
			sidebar: {
				order: sidebarOrder,
				label: doc.name,
			},
		}),
		"```ts",
		doc.signature,
		"```\n",
		doc.threeEquivalent
			? `**THREE equivalent:** ${code(doc.threeEquivalent)}\n`
			: "",
		escapeMdxText(doc.description),
		"",
	];

	if (doc.divergence) {
		parts.push(
			"> **Differs from THREE.js**",
			">",
			`> ${escapeMdxText(doc.divergence)}`,
			"",
		);
	}

	if (doc.properties.length > 0) {
		parts.push(
			"## Properties\n",
			"| Name | Type | Description |",
			"| --- | --- | --- |",
		);
		for (const property of doc.properties) {
			parts.push(
				`| ${code(property.name)} | ${code(property.type)} | ${escapeTable(property.description)} |`,
			);
		}
		parts.push("");
	}

	if (doc.methods.length > 0) {
		parts.push("## Methods\n", "| Method | Description |", "| --- | --- |");
		for (const method of doc.methods) {
			parts.push(
				`| ${code(method.signature)} | ${escapeTable(method.description)} |`,
			);
		}
		parts.push("");
	}

	return `${parts.filter(Boolean).join("\n")}\n`;
}

await rm(docsRoot, { recursive: true, force: true });
await mkdir(docsRoot, { recursive: true });

await writeFile(
	path.join(docsRoot, "index.md"),
	`${frontMatter({
		title: "EASEL.js API Reference",
		description:
			"TypeScript API reference for EASEL.js classes, constructors, properties, and methods.",
		sidebar: {
			order: 1,
			label: "Overview",
		},
	})}Browse EASEL.js classes by renderer area. Each page lists the constructor signature, THREE.js comparison notes, properties, and methods.\n\n## Packages\n\n\`@xsyetopz/easel\` is available from npm and JSR.\n`,
);

for (const category of docCategories) {
	const docs = docClasses.filter((doc) => doc.category === category);
	if (docs.length === 0) continue;

	const dir = path.join(docsRoot, slugify(category));
	await mkdir(dir, { recursive: true });

	let sidebarOrder = 1;
	for (const doc of docs) {
		await writeFile(
			path.join(dir, `${doc.id}.md`),
			docToMarkdown(doc, sidebarOrder),
		);
		sidebarOrder += 1;
	}
}

console.log(`Generated ${docClasses.length} API docs.`);
