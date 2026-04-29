import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const roots = ["tests"];
const anyPattern = /\bany\b/;
const testFilePattern = /\.ts$/;
const lineBreakPattern = /\r?\n/;
const matches = [];

async function walk(dir) {
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			await walk(path);
			continue;
		}
		if (!testFilePattern.test(path)) continue;
		const lines = (await readFile(path, "utf8")).split(lineBreakPattern);
		for (let i = 0; i < lines.length; i++) {
			if (anyPattern.test(lines[i]))
				matches.push(`${path}:${i + 1}: ${lines[i]}`);
		}
	}
}

for (const root of roots) await walk(root);

if (matches.length > 0) {
	console.error(matches.join("\n"));
	process.exit(1);
}
