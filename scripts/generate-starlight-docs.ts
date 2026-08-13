import process from "node:process";
import { checkGenerated, writeGenerated } from "./starlight-docs/filesystem.ts";
import { extractDocs } from "./starlight-docs/compiler-extraction.ts";
import { renderDocs } from "./starlight-docs/markdown-rendering.ts";

export function generateSourceDocs(): Map<string, string> {
	return renderDocs(extractDocs());
}

async function main(): Promise<void> {
	const output = generateSourceDocs();
	if (process.argv.includes("--check")) await checkGenerated(output);
	else await writeGenerated(output);
	console.log(`Generated ${output.size - 1} source API docs.`);
}

if (import.meta.main) await main();
