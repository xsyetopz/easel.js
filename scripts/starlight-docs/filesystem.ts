import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import { DOCS_ROOT } from "./api-model.ts";

async function currentMarkdownFiles(
	root: string,
): Promise<Map<string, string>> {
	const files = new Map<string, string>();
	async function walk(directory: string): Promise<void> {
		let entries: Dirent<string>[];
		try {
			entries = await readdir(directory, { withFileTypes: true });
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
			throw error;
		}
		for (const entry of entries) {
			const absolute = path.join(directory, entry.name);
			if (entry.isDirectory()) await walk(absolute);
			else if (entry.name.endsWith(".md")) {
				files.set(
					path.relative(root, absolute),
					await readFile(absolute, "utf8"),
				);
			}
		}
	}
	await walk(root);
	return files;
}

export async function checkGenerated(
	expected: Map<string, string>,
): Promise<void> {
	const current = await currentMarkdownFiles(DOCS_ROOT);
	const paths = new Set([...expected.keys(), ...current.keys()]);
	const stale = [...paths].filter(
		(file) => expected.get(file) !== current.get(file),
	);
	if (stale.length > 0) {
		throw new Error(
			"Generated API docs are stale:\n" +
				stale.map((file) => `- ${file}`).join("\n") +
				"\nRun bun run docs:generate.",
		);
	}
}

export async function writeGenerated(
	output: Map<string, string>,
): Promise<void> {
	await rm(DOCS_ROOT, { recursive: true, force: true });
	for (const [relative, content] of output) {
		const destination = path.join(DOCS_ROOT, relative);
		await mkdir(path.dirname(destination), { recursive: true });
		await writeFile(destination, content);
	}
}
